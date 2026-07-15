import { supabase, type PersonalityType } from "../supabase";

// ---- Shared contract --------------------------------------------------
// This is the seam a real LLM-backed generator drops into later without
// changing any caller. `mockGenerator` below is deterministic stub content;
// `edgeGenerator` is a placeholder that calls a Supabase Edge Function.

export type StepKind = "lesson" | "task" | "reflection" | "resource" | "quiz";
export type UnitStatus = "locked" | "active" | "done";

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
}

export interface GenerateContext {
  userId: string;
  goalTitle: string;
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
  priorChoices: {
    unitIndex: number;
    prompt: string;
    optionId: string;
    optionLabel: string;
  }[];
}

export interface GeneratedStep {
  kind: StepKind;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface GeneratedChoice {
  prompt: string;
  options: ChoiceOption[];
}

export interface GeneratedUnit {
  title: string;
  summary: string;
  steps: GeneratedStep[];
  choice: GeneratedChoice;
}

export interface UnitGenerator {
  generateUnit(ctx: GenerateContext): Promise<GeneratedUnit>;
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
  priorChoices: GenerateContext["priorChoices"]
): GenerateContext["priorChoices"][number] | null {
  return priorChoices.length ? priorChoices[priorChoices.length - 1] : null;
}

// Deterministic pick from a fixed-size pool using the unit index.
function pickByIndex<T>(pool: readonly T[], index: number): T {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

// ---- Mock generator -----------------------------------------------------
// Deterministic from `ctx.unitIndex` and the last prior choice only — no
// randomness, no clock reads — so the same context always yields the same
// unit and a chosen option visibly changes the *next* unit's content.

const STEP_PLANS: readonly StepKind[][] = [
  ["lesson", "task", "resource", "reflection"],
  ["lesson", "task", "quiz", "resource", "reflection"],
  ["lesson", "reflection", "task", "resource"],
  ["lesson", "task", "resource", "quiz", "reflection"],
];

const OPTION_POOL: readonly ChoiceOption[] = [
  {
    id: "deepen-theory",
    label: "Deepen the theory",
    description: "Go further into the underlying concepts before applying them.",
  },
  {
    id: "practice-hands-on",
    label: "Practice hands-on",
    description: "Jump into a small hands-on exercise to apply what you just learned.",
  },
  {
    id: "talk-to-a-pro",
    label: "Talk to a professional",
    description: "Prioritize hearing from someone who already works in the field.",
  },
  {
    id: "explore-adjacent-paths",
    label: "Explore adjacent paths",
    description: "Look at nearby roles and specializations before committing further.",
  },
];

function stepTitle(kind: StepKind, unitIndex: number): string {
  const titles: Record<StepKind, string> = {
    lesson: `Lesson ${unitIndex + 1}: Core idea`,
    task: `Task: Try it yourself`,
    reflection: `Reflection: What stood out`,
    resource: `Resource: Go deeper`,
    quiz: `Quick check`,
  };
  return titles[kind];
}

function stepBody(
  kind: StepKind,
  ctx: GenerateContext,
  choice: GenerateContext["priorChoices"][number] | null
): string {
  const { goalTitle, profile, personalityType } = ctx;
  const majors = majorsPhrase(profile.majors);
  const personality = personalityPhrase(personalityType);
  const branchNote = choice
    ? ` Since you picked "${choice.optionLabel}" last time, this builds on that.`
    : "";

  switch (kind) {
    case "lesson":
      return (
        `Here's a core idea behind ${goalTitle}, connected to ${majors}. ` +
        `It's a good fit if you enjoy ${personality}.${branchNote}`
      );
    case "task":
      return (
        `Spend a few minutes on a small, concrete exercise related to ${goalTitle}. ` +
        `Try to relate it back to ${majors}.`
      );
    case "reflection":
      return (
        `Think about how today's material connects to your goal of becoming a ${goalTitle}, ` +
        `and to life in ${profile.city}. What felt easy, and what felt hard?`
      );
    case "resource":
      return (
        `A curated link or reading to go deeper into ${goalTitle}, ` +
        `chosen with ${personality} in mind.`
      );
    case "quiz":
      return `A couple of quick questions to check what you remember about ${goalTitle}.`;
    default:
      return `Content about ${goalTitle}.`;
  }
}

function buildSteps(
  ctx: GenerateContext,
  choice: GenerateContext["priorChoices"][number] | null
): GeneratedStep[] {
  const plan = pickByIndex(STEP_PLANS, ctx.unitIndex);
  return plan.map((kind) => ({
    kind,
    title: stepTitle(kind, ctx.unitIndex),
    body: stepBody(kind, ctx, choice),
  }));
}

function buildChoice(
  ctx: GenerateContext,
  choice: GenerateContext["priorChoices"][number] | null
): GeneratedChoice {
  // 2 options on even unit indices, 3 on odd — deterministic, not random.
  const optionCount = ctx.unitIndex % 2 === 0 ? 2 : 3;
  const start = ctx.unitIndex % OPTION_POOL.length;
  const options: ChoiceOption[] = [];
  for (let i = 0; i < optionCount; i++) {
    options.push(pickByIndex(OPTION_POOL, start + i));
  }
  const prompt = choice
    ? `Building on "${choice.optionLabel}", what should the next unit focus on?`
    : `What should the next unit toward ${ctx.goalTitle} focus on?`;
  return { prompt, options };
}

export const mockGenerator: UnitGenerator = {
  async generateUnit(ctx: GenerateContext): Promise<GeneratedUnit> {
    const choice = lastChoice(ctx.priorChoices);
    const gradeLevel = ctx.profile.gradeLevel || "your grade";

    if (ctx.unitIndex === 0) {
      return {
        title: `Foundations: Starting toward ${ctx.goalTitle}`,
        summary:
          `A first look at what it takes to become a ${ctx.goalTitle}, tailored for a ${gradeLevel} ` +
          `student interested in ${majorsPhrase(ctx.profile.majors)}.`,
        steps: buildSteps(ctx, choice),
        choice: buildChoice(ctx, choice),
      };
    }

    const branchLabel = choice ? choice.optionLabel : "your progress so far";
    return {
      title: `Unit ${ctx.unitIndex + 1}: Following up on "${branchLabel}"`,
      summary:
        `Continuing your path toward ${ctx.goalTitle}, shaped by your choice to focus on ` +
        `"${branchLabel}".`,
      steps: buildSteps(ctx, choice),
      choice: buildChoice(ctx, choice),
    };
  },
};

// ---- Edge generator (placeholder) --------------------------------------
// Not exercised this round: the "generate-unit" Edge Function doesn't exist
// yet. This only needs to compile against the same `UnitGenerator` contract
// so swapping generators later is a one-line change.

const edgeGenerator: UnitGenerator = {
  async generateUnit(ctx: GenerateContext): Promise<GeneratedUnit> {
    const { data, error } = await supabase.functions.invoke("generate-unit", {
      body: ctx,
    });
    if (error) throw error;
    return data as GeneratedUnit;
  },
};

// ---- Selector -----------------------------------------------------------

export const generator: UnitGenerator =
  process.env.EXPO_PUBLIC_USE_LLM_GUIDE === "true" ? edgeGenerator : mockGenerator;
