import { supabase, type PersonalityType } from "../supabase";

// ---- Shared contract --------------------------------------------------
// This is the seam a real LLM-backed generator drops into later without
// changing any caller. `mockGenerator` below is deterministic stub content;
// `edgeGenerator` is a placeholder that calls a Supabase Edge Function.
//
// Two-phase generation:
//   1. generateUnit   — creates steps (no choice). Called when a new unit starts.
//   2. generateChoices — creates branching choices. Called after all steps are done.

export type StepKind = "lesson" | "task" | "reflection" | "resource" | "quiz";
export type UnitStatus = "locked" | "active" | "done";

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  specializationLabel: string | null; // what career_specialization becomes if chosen; null for pause/graduate
}

export interface GenerateContext {
  userId: string;
  goalTitle: string;
  currentSpecialization: string | null; // latest narrowed career (null for unit 0)
  goalCareerId: string | null;
  personalityType: PersonalityType | null;
  profile: {
    fullName: string;
    gradeLevel: string;
    city: string;
    school: string;
    majors: string[];
  };
  unitIndex: number;
  careerPath: string[];
  choiceHistory: {
    unitIndex: number;
    chose: string;        // the option label they picked
    narrowedTo: string;   // what the specialization became
  }[];
  journeySummary: string | null; // rolling prose recap (~150 words)
}

// Extended context for choice generation — includes what the student just completed.
export interface ChoiceGenerateContext extends GenerateContext {
  completedSteps: {
    kind: StepKind;
    title: string;
  }[];
}

export interface GeneratedStep {
  kind: StepKind;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface GeneratedUnit {
  title: string;
  summary: string;
  steps: GeneratedStep[]; // 5-10 steps, NO choice
  journeySummary: string; // updated rolling summary after this unit
}

export interface GeneratedChoices {
  prompt: string;
  options: ChoiceOption[]; // 2-3 options, each with a specialization label
  isPauseOffered: boolean; // whether one option is a "graduate/pause" option
}

export interface UnitGenerator {
  generateUnit(ctx: GenerateContext): Promise<GeneratedUnit>;
  generateChoices(ctx: ChoiceGenerateContext): Promise<GeneratedChoices>;
}

// ---- Personalization helpers ------------------------------------------

const PERSONALITY_LABELS: Record<PersonalityType, string> = {
  realistic: "hands-on, practical work",
  investigative: "research and problem-solving",
  artistic: "creative and original work",
  social: "helping and working with people",
  enterprising: "leading and persuading others",
  conventional: "organized, detail-driven work",
};

function personalityPhrase(personalityType: PersonalityType | null): string {
  return personalityType
    ? PERSONALITY_LABELS[personalityType]
    : "a mix of different working styles";
}

function majorsPhrase(majors: string[]): string {
  return majors.length ? majors.join(", ") : "your current subjects";
}

function lastChoice(
  history: GenerateContext["choiceHistory"]
): GenerateContext["choiceHistory"][number] | null {
  return history.length ? history[history.length - 1] : null;
}

// Deterministic pick from a fixed-size pool using the unit index.
function pickByIndex<T>(pool: readonly T[], index: number): T {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

// ---- Mock generator -----------------------------------------------------
// Deterministic from `ctx.unitIndex` and choices — no randomness, no clock reads.

const STEP_PLANS: readonly StepKind[][] = [
  ["lesson", "task", "resource", "reflection", "lesson", "task"],                // 6 steps
  ["lesson", "task", "quiz", "resource", "reflection", "lesson", "task"],        // 7 steps
  ["lesson", "reflection", "task", "resource", "lesson", "task", "reflection", "quiz"], // 8 steps
  ["lesson", "task", "resource", "quiz", "reflection", "lesson", "task", "resource", "reflection"], // 9 steps
];

// Career specialization options — each mock choice narrows the career
const SPECIALIZATION_POOLS: Record<string, { label: string; spec: string; desc: string }[]> = {
  default: [
    { label: "Go deeper into theory", spec: "Theoretical Specialist", desc: "Focus on the academic and theoretical foundations of this field." },
    { label: "Focus on practical application", spec: "Applied Practitioner", desc: "Prioritize hands-on, real-world application of your skills." },
    { label: "Explore the business side", spec: "Industry Professional", desc: "Understand the market, clients, and business aspects of this career." },
  ],
};

function getSpecOptions(unitIndex: number): { label: string; spec: string; desc: string }[] {
  const pool = SPECIALIZATION_POOLS.default;
  const count = unitIndex % 2 === 0 ? 2 : 3;
  const start = unitIndex % pool.length;
  const result: typeof pool = [];
  for (let i = 0; i < count; i++) {
    result.push(pickByIndex(pool, start + i));
  }
  return result;
}

function stepTitle(kind: StepKind, unitIndex: number, stepIdx: number): string {
  const titles: Record<StepKind, string> = {
    lesson: `Lesson ${stepIdx + 1}: Core idea`,
    task: `Task ${stepIdx + 1}: Try it yourself`,
    reflection: `Reflection: What stood out`,
    resource: `Resource: Go deeper`,
    quiz: `Quick check`,
  };
  return titles[kind];
}

function stepBody(
  kind: StepKind,
  ctx: GenerateContext,
  choice: GenerateContext["choiceHistory"][number] | null
): string {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  const majors = majorsPhrase(ctx.profile.majors);
  const personality = personalityPhrase(ctx.personalityType);
  const branchNote = choice
    ? ` Building on your choice to focus on "${choice.narrowedTo}".`
    : "";

  switch (kind) {
    case "lesson":
      return (
        `Here's a core idea behind ${target}, connected to ${majors}. ` +
        `It's a good fit if you enjoy ${personality}.${branchNote}`
      );
    case "task":
      return (
        `Spend a few minutes on a small, concrete exercise related to ${target}. ` +
        `Try to relate it back to ${majors}.`
      );
    case "reflection":
      return (
        `Think about how today's material connects to your goal of becoming a ${target}, ` +
        `and to life in ${ctx.profile.city}. What felt easy, and what felt hard?`
      );
    case "resource":
      return (
        `A curated link or reading to go deeper into ${target}, ` +
        `chosen with ${personality} in mind.`
      );
    case "quiz":
      return `A couple of quick questions to check what you remember about ${target}.`;
    default:
      return `Content about ${target}.`;
  }
}

function mockPayload(kind: StepKind, target: string, unitIndex: number): Record<string, any> | undefined {
  if (kind === "resource" || kind === "task") {
    const targetLower = target.toLowerCase();
    if (
      targetLower.includes("engineer") ||
      targetLower.includes("developer") ||
      targetLower.includes("data") ||
      targetLower.includes("ux") ||
      targetLower.includes("designer")
    ) {
      const links = [
        { externalUrl: "https://developer.chrome.com/docs/devtools/", linkLabel: "Open Google Chrome DevTools Tutorial" },
        { externalUrl: "https://grow.google/certificates/ux-design/", linkLabel: "Explore Google UX Design Certificate" },
        { externalUrl: "https://www.freecodecamp.org/learn/", linkLabel: "Start freeCodeCamp Curriculum" },
        { externalUrl: "https://www.youtube.com/watch?v=Ke90Tje7VS0", linkLabel: "Watch Introduction to Web Dev (Video)" }
      ];
      return pickByIndex(links, unitIndex);
    } else {
      const links = [
        { externalUrl: "https://www.wikipedia.org/", linkLabel: "Read Wikipedia Background Guide" },
        { externalUrl: "https://www.coursera.org/", linkLabel: "Browse Free Courses on Coursera" },
        { externalUrl: "https://www.ted.com/talks", linkLabel: "Watch TED Talks on Professional Development" },
        { externalUrl: "https://www.linkedin.com/", linkLabel: "Search LinkedIn Jobs & Toolsets" }
      ];
      return pickByIndex(links, unitIndex);
    }
  }
  return undefined;
}

function buildSteps(
  ctx: GenerateContext,
  choice: GenerateContext["choiceHistory"][number] | null
): GeneratedStep[] {
  const plan = pickByIndex(STEP_PLANS, ctx.unitIndex);
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  return plan.map((kind, i) => ({
    kind,
    title: stepTitle(kind, ctx.unitIndex, i),
    body: stepBody(kind, ctx, choice),
    payload: mockPayload(kind, target, ctx.unitIndex + i),
  }));
}

function buildJourneySummary(ctx: GenerateContext): string {
  const target = ctx.currentSpecialization ?? ctx.goalTitle;
  const personality = personalityPhrase(ctx.personalityType);
  const city = ctx.profile.city || "their city";
  const grade = ctx.profile.gradeLevel || "their current grade";
  const majors = majorsPhrase(ctx.profile.majors);

  if (ctx.unitIndex === 0) {
    return (
      `Starting the journey toward ${target}. ` +
      `A grade ${grade} student in ${city} studying ${majors}. ` +
      `Shows a preference for ${personality}. Beginning to explore foundational concepts.`
    );
  }

  const choiceTrail = ctx.choiceHistory
    .map((c) => `chose "${c.chose}" → ${c.narrowedTo}`)
    .join("; ");

  return (
    `Progressing toward ${target} (path: ${ctx.careerPath.join(" → ")}). ` +
    `Completed ${ctx.unitIndex} unit${ctx.unitIndex > 1 ? "s" : ""}. ` +
    `Key decisions: ${choiceTrail || "none yet"}. ` +
    `Grade ${grade} student in ${city} studying ${majors}, ` +
    `with a preference for ${personality}.`
  );
}

export const mockGenerator: UnitGenerator = {
  async generateUnit(ctx: GenerateContext): Promise<GeneratedUnit> {
    const choice = lastChoice(ctx.choiceHistory);
    const gradeLevel = ctx.profile.gradeLevel || "your grade";
    const target = ctx.currentSpecialization ?? ctx.goalTitle;

    const title =
      ctx.unitIndex === 0
        ? `Foundations: Starting toward ${target}`
        : `Unit ${ctx.unitIndex + 1}: ${target}`;

    const summary =
      ctx.unitIndex === 0
        ? `A first look at what it takes to become a ${target}, tailored for a ${gradeLevel} ` +
          `student interested in ${majorsPhrase(ctx.profile.majors)}.`
        : `Continuing your path toward ${target}, shaped by your choice to focus on ` +
          `"${choice?.narrowedTo ?? "your progress so far"}".`;

    return {
      title,
      summary,
      steps: buildSteps(ctx, choice),
      journeySummary: buildJourneySummary(ctx),
    };
  },

  async generateChoices(ctx: ChoiceGenerateContext): Promise<GeneratedChoices> {
    const target = ctx.currentSpecialization ?? ctx.goalTitle;
    const specOptions = getSpecOptions(ctx.unitIndex);

    const options: ChoiceOption[] = specOptions.map((opt, i) => ({
      id: `option-${ctx.unitIndex}-${i}`,
      label: opt.label,
      description: opt.desc,
      specializationLabel: `${target} — ${opt.spec}`,
    }));

    // Mock: offer pause/graduate at milestone units (every 4th unit after the 3rd)
    const isPauseOffered = ctx.unitIndex >= 3 && ctx.unitIndex % 4 === 3;
    if (isPauseOffered) {
      options.push({
        id: `pause-${ctx.unitIndex}`,
        label: "I'm satisfied — generate my career roadmap summary",
        description: `You've explored ${target} deeply. Pause here and get a personalized career plan.`,
        specializationLabel: null,
      });
    }

    const prompt = `You've completed all tasks for ${target}. What direction should your path take next?`;

    return { prompt, options, isPauseOffered };
  },
};

// ---- Edge generator (placeholder) --------------------------------------
// Not exercised this round: the "generate-unit" Edge Function doesn't exist
// yet. This only needs to compile against the same `UnitGenerator` contract
// so swapping generators later is a one-line change.

const edgeGenerator: UnitGenerator = {
  async generateUnit(ctx: GenerateContext): Promise<GeneratedUnit> {
    const { data, error } = await supabase.functions.invoke("generate-unit", {
      body: { mode: "unit", ...ctx },
    });
    if (error) {
      // Supabase returns the response body in `data` even on errors
      const detail = data?.error ?? error.message ?? "Unknown edge function error";
      console.error("edgeGenerator.generateUnit failed:", detail);
      throw new Error(`AI generation failed: ${detail}`);
    }
    return data as GeneratedUnit;
  },

  async generateChoices(ctx: ChoiceGenerateContext): Promise<GeneratedChoices> {
    const { data, error } = await supabase.functions.invoke("generate-unit", {
      body: { mode: "choices", ...ctx },
    });
    if (error) {
      const detail = data?.error ?? error.message ?? "Unknown edge function error";
      console.error("edgeGenerator.generateChoices failed:", detail);
      throw new Error(`AI generation failed: ${detail}`);
    }
    return data as GeneratedChoices;
  },
};

// ---- Selector -----------------------------------------------------------

export const generator: UnitGenerator =
  process.env.EXPO_PUBLIC_USE_LLM_GUIDE === "true" ? edgeGenerator : mockGenerator;
