const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

const GEMINI_ENDPOINT = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

/**
 * Extracts the first complete JSON object from a string.
 * Gemini sometimes appends trailing text — this handles that.
 */
function parseFirstJSON(text: string): any {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }

  const start = trimmed.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response.");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(trimmed.slice(start, i + 1));
    }
  }

  throw new Error("Incomplete JSON object in response.");
}

async function callGemini(systemInstruction: string, prompt: string, apiKey: string) {
  const MAX_RETRIES = 5;
  const requestBody = JSON.stringify({
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Back off before retries with jitter so concurrent requests don't collide
    if (attempt > 0) {
      const baseDelay = Math.pow(2, attempt) * 1000;        // 2s, 4s, 8s, 16s
      const jitter = Math.floor(Math.random() * 1500);      // 0-1.5s random
      const delay = baseDelay + jitter;
      console.warn(
        `Gemini retry ${attempt}/${MAX_RETRIES} in ${delay}ms — previous error: ${lastError?.message}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const response = await fetch(GEMINI_ENDPOINT(apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      // Retryable HTTP errors: rate-limited or overloaded
      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`Gemini returned ${response.status}`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      const candidate = resJson.candidates?.[0];
      const jsonText = candidate?.content?.parts?.[0]?.text;

      if (!jsonText) {
        lastError = new Error("Gemini returned an empty response.");
        continue;
      }

      // Check if the response was truncated by the model
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== "STOP") {
        console.warn(`Gemini finishReason: ${finishReason} — response may be truncated, retrying`);
        lastError = new Error(`Gemini response truncated (finishReason: ${finishReason})`);
        continue;
      }

      return parseFirstJSON(jsonText);
    } catch (err: any) {
      // If parseFirstJSON throws (incomplete JSON), retry
      if (err.message?.includes("Incomplete JSON") || err.message?.includes("No JSON object")) {
        lastError = err;
        console.warn(`Gemini returned incomplete JSON on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      // Non-retryable errors bubble up immediately
      throw err;
    }
  }

  throw lastError ?? new Error("Gemini API failed after all retries.");
}

// ─── Unit generation ───────────────────────────────────────────────────────

async function generateUnit(ctx: any, apiKey: string) {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  const majors = ctx.profile.majors?.length ? ctx.profile.majors.join(", ") : "general subjects";

  const systemInstruction = `You are GuidEM, a professional career coach and curriculum designer for high school students in Israel.
Your task is to generate a personalized learning unit (roadmap) of 10 to 14 steps that builds the student's toolset for their chosen career and specialization, ALONG WITH the branching choice options for where their career path should go next after this unit is completed.
You MUST personalize the path based on the student's location (city), current grade, school majors/subjects, Holland code personality type, and their previous path decisions.

Each step should include a real-world external link when appropriate (courses, video links, articles, documentation, LinkedIn queries, tutorials) so the student can open them externally on their phone.

RULES FOR EXTERNAL LINKS — follow these strictly:
1. Provide specific, direct links to high-quality educational content for 50% to 70% of the steps (especially lesson, task, and resource steps).
2. Use verified URLs from major, well-known platforms relevant to the step's subject. Reliable platforms include:
   - Coursera (e.g. https://www.coursera.org/learn/google-ux-design)
   - Khan Academy (e.g. https://www.khanacademy.org/computing)
   - freeCodeCamp (e.g. https://www.freecodecamp.org/learn)
   - MDN Web Docs (e.g. https://developer.mozilla.org/en-US/docs/Learn)
   - Google Certificates / Developers (e.g. https://grow.google/certificates)
   - Microsoft Learn (e.g. https://learn.microsoft.com/en-us/training)
   - Kaggle (e.g. https://www.kaggle.com/learn)
   - W3Schools (e.g. https://www.w3schools.com)
3. Do NOT invent fake YouTube video IDs or broken article slugs. Link to the official course portal, documentation section, or certificate homepage for the topic.
4. Every URL must be complete, functional, and properly formatted (https://).
5. Always provide a clear, descriptive linkLabel (e.g. "Explore Google UX Course", "Read MDN Web Guide").

Do NOT output any markdown. Output a single valid JSON object matching this structure:
{
  "title": "Unit Title",
  "summary": "Brief summary of this unit",
  "journeySummary": "Rolling prose summary (~100 words) of the student's progress so far, updated with this unit.",
  "steps": [
    {
      "kind": "lesson" | "task" | "reflection" | "resource" | "quiz",
      "title": "Step Title",
      "body": "Detailed description of what the student should learn or do.",
      "payload": {
        "externalUrl": "https://exact-real-url" (optional — include ONLY if you are confident this URL exists),
        "linkLabel": "Open Course Name" (optional)
      }
    }
  ],
  "choices": {
    "prompt": "Question asking the student what specialization direction to focus on next.",
    "options": [
      {
        "id": "choice-opt-1",
        "label": "Short option title",
        "description": "1-2 sentence description of this branch direction",
        "specializationLabel": "New career title (e.g. Software Engineer — Frontend Developer), or null for pause option"
      }
    ],
    "isPauseOffered": false
  }
}`;

  // Compress choice history to last 3 decisions to keep prompt tokens lightweight
  const recentHistory = (ctx.choiceHistory ?? []).slice(-3);

  const prompt = `Student Data:
- Name: ${ctx.profile.fullName}
- Current Career Goal: ${ctx.goalTitle}
- Current Specialization Focus: ${target}
- Location (City): ${ctx.profile.city}
- Current Grade Level: ${ctx.profile.gradeLevel}
- School Majors: ${majors}
- RIASEC Personality Type: ${ctx.personalityType}
- Unit Index: ${ctx.unitIndex}
- Recent path decisions: ${JSON.stringify(recentHistory)}
- Journey recap: ${ctx.journeySummary}

Generate the unit plan (10-14 steps) and next branching choices for Unit ${ctx.unitIndex + 1} of their career journey.`;

  return await callGemini(systemInstruction, prompt, apiKey);
}

// ─── Choice generation ─────────────────────────────────────────────────────

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

  return await callGemini(systemInstruction, prompt, apiKey);
}
