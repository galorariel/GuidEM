const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable on Supabase.");
    }

    const body = await req.json();
    const { mode, ...ctx } = body;

    let result;
    if (mode === "unit") {
      result = await generateUnit(ctx, GEMINI_API_KEY);
    } else if (mode === "choices") {
      result = await generateChoices(ctx, GEMINI_API_KEY);
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Gemini helpers ────────────────────────────────────────────────────────

const GEMINI_ENDPOINT = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

/**
 * Pass 1 — Grounded call: Gemini performs live Google searches to find real
 * resources. Returns free-form text with real, cited URLs.
 */
async function callGeminiGrounded(
  systemInstruction: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(GEMINI_ENDPOINT(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini grounded API error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();

  // Collect all text parts from the response (model may interleave search
  // tool-use parts with text parts across multiple candidates).
  const parts = resJson.candidates?.[0]?.content?.parts ?? [];
  const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text);

  // Also extract cited URLs from groundingMetadata if present — the model
  // sometimes references them only in the metadata, not inline in the text.
  const groundingChunks =
    resJson.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const citedUrls = groundingChunks
    .filter((c: any) => c.web?.uri)
    .map((c: any) => `- ${c.web.title ?? "Resource"}: ${c.web.uri}`);

  let fullText = textParts.join("\n\n");
  if (citedUrls.length > 0) {
    fullText += "\n\nAdditional cited sources:\n" + citedUrls.join("\n");
  }

  if (!fullText.trim()) {
    throw new Error("Gemini grounded call returned an empty response.");
  }
  return fullText;
}

/**
 * Pass 2 — Structured JSON call: Takes the grounded research text and
 * formats it into our exact JSON schema. No search tool, just formatting.
 */
async function callGeminiJSON(
  systemInstruction: string,
  prompt: string,
  apiKey: string
): Promise<any> {
  const response = await fetch(GEMINI_ENDPOINT(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini JSON API error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  const jsonText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    throw new Error("Gemini returned an empty JSON response.");
  }

  return JSON.parse(jsonText.trim());
}

// ─── Unit generation (two-pass) ────────────────────────────────────────────

async function generateUnit(ctx: any, apiKey: string) {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  const majors = ctx.profile.majors?.length ? ctx.profile.majors.join(", ") : "general subjects";

  // ── Pass 1: Grounded research ──────────────────────────────────────────
  const researchSystemInstruction = `You are GuidEM, a professional career coach and curriculum designer for high school students in Israel.
Your task is to research and find the best real-world learning resources for a student's career path.

You MUST use Google Search to find REAL, EXISTING resources. For each resource you recommend, provide:
1. The exact, full URL that you found (not guessed or reconstructed from memory).
2. The name/title of the resource.
3. A brief description of what the student will learn from it.

Find 5 to 10 high-quality resources that progressively build the student's skills for their career goal.
Include a mix of: online courses, documentation pages, tutorial articles, YouTube videos, and professional networking opportunities.
Prioritize resources that are:
- Free or affordable for students
- Currently available and accessible
- Relevant to the Israeli job market when possible
- Appropriate for the student's current grade level

For each resource, clearly state the VERIFIED URL you found through your search.`;

  const researchPrompt = `Student Data:
- Name: ${ctx.profile.fullName}
- Current Career Goal: ${ctx.goalTitle}
- Current Specialization Focus: ${target}
- Location (City): ${ctx.profile.city}
- Current Grade Level: ${ctx.profile.gradeLevel}
- School Majors: ${majors}
- RIASEC Personality Type: ${ctx.personalityType}
- Unit Index: ${ctx.unitIndex}
- Prior path choices made: ${JSON.stringify(ctx.choiceHistory)}
- Qualitative journey recap: ${ctx.journeySummary}

Search for and find the best real learning resources for Unit ${ctx.unitIndex + 1} of this student's career journey. Focus on "${target}" skills and knowledge. Provide verified URLs for each resource you find.`;

  const groundedResearch = await callGeminiGrounded(
    researchSystemInstruction,
    researchPrompt,
    apiKey
  );

  console.log("Pass 1 grounded research completed, length:", groundedResearch.length);

  // ── Pass 2: Structure into JSON ────────────────────────────────────────
  const structureSystemInstruction = `You are a JSON formatter. You will receive research notes containing verified learning resources with real URLs.
Your ONLY job is to organize this information into the exact JSON structure specified below.

CRITICAL RULES:
1. Use ONLY the URLs that appear in the research notes provided. Do NOT invent, modify, or guess any URLs.
2. If a URL appears in the research notes, copy it EXACTLY as-is into the externalUrl field.
3. Every step that references a web resource MUST include the externalUrl from the research notes.
4. Do NOT add any URLs that were not in the research notes.

Your output must be a single valid JSON object with this structure:
{
  "title": "Unit Title",
  "summary": "Brief summary of this unit and how it fits the student's goal/prior choices",
  "journeySummary": "A rolling prose summary (~150 words) describing the student's progress and career path so far, updated with this unit's goals.",
  "steps": [
    {
      "kind": "lesson" | "task" | "reflection" | "resource" | "quiz",
      "title": "Step Title",
      "body": "Detailed description of the step, explaining what the student needs to learn or do.",
      "payload": {
        "externalUrl": "https://exact-url-from-research-notes" (optional),
        "linkLabel": "Short descriptive label for the link button" (optional)
      }
    }
  ]
}

Aim for 5 to 10 steps. Include a mix of step kinds. Not every step needs an external link — reflections and quizzes typically don't.`;

  const structurePrompt = `Here are the verified research notes with real URLs for this student's learning unit:

---
${groundedResearch}
---

Student context:
- Career Goal: ${ctx.goalTitle}
- Specialization: ${target}
- Grade: ${ctx.profile.gradeLevel}
- City: ${ctx.profile.city}
- Unit Index: ${ctx.unitIndex + 1}
- Journey so far: ${ctx.journeySummary}

Format these research findings into the JSON unit structure. Use ONLY the URLs from the research notes above.`;

  return await callGeminiJSON(structureSystemInstruction, structurePrompt, apiKey);
}

// ─── Choice generation (single pass, no URLs needed) ───────────────────────

async function generateChoices(ctx: any, apiKey: string) {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;

  const systemInstruction = `You are GuidEM, a professional career coach for high school students in Israel.
The student has just completed a unit in their learning path.
Your task is to generate a prompt and 2 to 3 branching choices for where their career path should go next.
Each choice must represent a specific career specialization branching out from their current specialization.
Each choice must include a 'specializationLabel' which represents the new name of their career focus if chosen.
If the student is at a milestone (Unit Index 3, 7, 11, etc.), you can additionally include a 'pause/graduate' option where the student can choose to pause their learning journey and generate their career roadmap summary. For pause options, 'specializationLabel' must be null.
Your output must be a single, valid JSON object matching this structure:
{
  "prompt": "Question/prompt text asking the student to choose their next direction.",
  "options": [
    {
      "id": "unique-choice-id",
      "label": "Short, clear title of the path option",
      "description": "Description of what they will focus on and learn in this path",
      "specializationLabel": "New career title (e.g. Software Engineer — Frontend Developer), or null for pause option"
    }
  ],
  "isPauseOffered": true/false
}`;

  const prompt = `Student Data:
- Current Career Goal: ${ctx.goalTitle}
- Current Specialization: ${target}
- Location: ${ctx.profile.city}
- Majors: ${ctx.profile.majors?.join(", ") || "none"}
- Unit Index: ${ctx.unitIndex}
- Prior choices: ${JSON.stringify(ctx.choiceHistory)}
- Steps completed in this unit: ${JSON.stringify(ctx.completedSteps)}

Generate the branching choices for the next step of their path.`;

  return await callGeminiJSON(systemInstruction, prompt, apiKey);
}
