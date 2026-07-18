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

async function callGemini(systemInstruction: string, prompt: string, apiKey: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `${systemInstruction}\n\nUser Input Context:\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  const jsonText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(jsonText.trim());
}

async function generateUnit(ctx: any, apiKey: string) {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  const majors = ctx.profile.majors?.length ? ctx.profile.majors.join(", ") : "general subjects";

  const systemInstruction = `You are GuidEM, a professional career coach and curriculum designer for high school students in Israel.
Your task is to generate a personalized learning unit (roadmap) of 5 to 10 steps that builds the student's toolset for their chosen career and specialization.
You MUST personalize the path based on the student's location (city), current grade, school majors/subjects, Holland code personality type, and their previous path decisions.
Important: You must include real-world external links (courses from Google/Microsoft/Coursera, video links, specific articles, documentation, LinkedIn search queries, tutorials) so the student can open them externally.
Ensure URLs are real, working, and point to established sites (e.g. developer.chrome.com, reactnative.dev, freecodecamp.org, coursera.org, linkedin.com, youtube.com).

Do NOT output any markdown around the JSON. Your output must be a single, valid JSON object matching the following structure:
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
        "externalUrl": "https://..." (optional, real URL of a web resource to help them complete the task),
        "linkLabel": "Label for the link button" (optional, e.g., 'Open Google DevTools Docs')
      }
    }
  ]
}`;

  const prompt = `Student Data:
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

Generate the unit plan for Unit ${ctx.unitIndex + 1} of their career journey.`;

  return await callGemini(systemInstruction, prompt, apiKey);
}

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
