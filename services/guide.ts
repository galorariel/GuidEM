import {
  generator,
  type ChoiceOption,
  type GenerateContext,
  type GeneratedUnit,
  type StepKind,
  type UnitStatus,
} from "./guide/generator";
import { supabase, getProfile } from "./supabase";

// ---- Camel-cased shapes (mirror the snake_case guide_* rows) --------------

export interface GuideStep {
  id: string;
  unitId: string;
  stepIndex: number;
  kind: StepKind;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  completedAt: string | null;
}

export interface GuideChoice {
  id: string;
  unitId: string;
  prompt: string;
  options: ChoiceOption[];
  selectedOptionId: string | null;
  decidedAt: string | null;
}

export interface GuideUnit {
  id: string;
  userId: string;
  unitIndex: number;
  title: string;
  summary: string;
  status: UnitStatus;
  goalTitle: string;
  goalCareerId: string | null;
  sourceChoiceId: string | null;
  sourceOptionId: string | null;
}

export type GuideUnitFull = GuideUnit & { steps: GuideStep[]; choice: GuideChoice | null };

const UNIT_FULL_COLS = "*, guide_steps(*), guide_choices(*)";

function mapUnit(r: any): GuideUnit {
  return {
    id: r.id,
    userId: r.user_id,
    unitIndex: r.unit_index,
    title: r.title,
    summary: r.summary,
    status: r.status,
    goalTitle: r.goal_title,
    goalCareerId: r.goal_career_id ?? null,
    sourceChoiceId: r.source_choice_id ?? null,
    sourceOptionId: r.source_option_id ?? null,
  };
}

function mapStep(r: any): GuideStep {
  return {
    id: r.id,
    unitId: r.unit_id,
    stepIndex: r.step_index,
    kind: r.kind,
    title: r.title,
    body: r.body,
    payload: r.payload ?? {},
    completedAt: r.completed_at ?? null,
  };
}

function mapChoice(r: any): GuideChoice {
  return {
    id: r.id,
    unitId: r.unit_id,
    prompt: r.prompt,
    options: r.options ?? [],
    selectedOptionId: r.selected_option_id ?? null,
    decidedAt: r.decided_at ?? null,
  };
}

// `guide_choices` is unique on unit_id (one terminal choice per unit), but the
// nested select still comes back as an array — normalize to a single row.
function oneOf(rel: any): any | null {
  return Array.isArray(rel) ? rel[0] ?? null : rel ?? null;
}

function mapUnitFull(r: any): GuideUnitFull {
  const steps = ((r.guide_steps ?? []) as any[])
    .slice()
    .sort((a, b) => a.step_index - b.step_index)
    .map(mapStep);
  const choiceRow = oneOf(r.guide_choices);
  return { ...mapUnit(r), steps, choice: choiceRow ? mapChoice(choiceRow) : null };
}

// ---- Context assembly -------------------------------------------------------

export async function buildContext(userId: string, unitIndex: number): Promise<GenerateContext> {
  const profile = await getProfile(userId);

  const priorChoices: GenerateContext["priorChoices"] = [];
  const { data, error } = await supabase
    .from("guide_units")
    .select("unit_index, guide_choices(prompt,options,selected_option_id)")
    .eq("user_id", userId)
    .order("unit_index");
  if (error) {
    console.error("buildContext priorChoices", error);
    // Fail loud on the write path: a swallowed error here would silently
    // generate an under-personalized unit that then gets baked in permanently.
    throw error;
  }
  for (const row of data ?? []) {
    const choice = oneOf((row as any).guide_choices);
    if (!choice || choice.selected_option_id == null) continue;
    const options = (choice.options ?? []) as ChoiceOption[];
    const optionLabel =
      options.find((o) => o.id === choice.selected_option_id)?.label ?? choice.selected_option_id;
    priorChoices.push({
      unitIndex: (row as any).unit_index,
      prompt: choice.prompt,
      optionId: choice.selected_option_id,
      optionLabel,
    });
  }

  return {
    userId,
    goalTitle: profile?.career_goal ?? "",
    goalCareerId: profile?.career ?? null,
    personalityType: profile?.personality_type ?? null,
    profile: {
      fullName: profile?.full_name ?? "",
      gradeLevel: profile?.grade_level ?? "",
      city: profile?.city ?? "",
      school: profile?.school ?? "",
      majors: profile?.majors ?? [],
    },
    unitIndex,
    priorChoices,
  };
}

// ---- Reads -------------------------------------------------------------------

export async function getGuideUnits(userId: string): Promise<GuideUnitFull[]> {
  const { data, error } = await supabase
    .from("guide_units")
    .select(UNIT_FULL_COLS)
    .eq("user_id", userId)
    .order("unit_index");
  if (error) {
    console.error("getGuideUnits", error);
    return [];
  }
  return (data ?? []).map(mapUnitFull);
}

export async function ensureFirstUnit(userId: string): Promise<GuideUnitFull> {
  const units = await getGuideUnits(userId);
  if (units.length) {
    return units.find((u) => u.unitIndex === 0) ?? units[0];
  }
  const ctx = await buildContext(userId, 0);
  const gen = await generator.generateUnit(ctx);
  return persistGeneratedUnit(userId, 0, gen, ctx, "active", null, null);
}

// ---- Writes ------------------------------------------------------------------

export async function markStepDone(stepId: string): Promise<void> {
  const { error } = await supabase
    .from("guide_steps")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", stepId);
  if (error) {
    console.error("markStepDone", error);
    throw error;
  }
}

export async function submitChoice(
  userId: string,
  unit: GuideUnitFull,
  optionId: string
): Promise<GuideUnitFull> {
  if (!unit.choice) throw new Error("No choice for this unit");
  if (unit.steps.some((s) => s.completedAt == null)) throw new Error("Finish all steps first");

  // Idempotent re-entry: if this unit was already submitted (e.g. a retry after
  // a transient error mid-sequence, or a stale double-tap), don't re-write the
  // choice/unit/summary — just ensure the next unit exists and return it. This
  // avoids duplicate progress_summaries rows.
  if (unit.status === "done" || unit.choice.selectedOptionId != null) {
    const ctx = await buildContext(userId, unit.unitIndex + 1);
    const gen = await generator.generateUnit(ctx);
    return persistGeneratedUnit(
      userId,
      unit.unitIndex + 1,
      gen,
      ctx,
      "active",
      unit.choice.id,
      unit.choice.selectedOptionId ?? optionId
    );
  }

  const now = new Date().toISOString();

  const { error: choiceError } = await supabase
    .from("guide_choices")
    .update({ selected_option_id: optionId, decided_at: now })
    .eq("id", unit.choice.id);
  if (choiceError) {
    console.error("submitChoice choice", choiceError);
    throw choiceError;
  }

  const { error: unitError } = await supabase
    .from("guide_units")
    .update({ status: "done", completed_at: now, updated_at: now })
    .eq("id", unit.id);
  if (unitError) {
    console.error("submitChoice unit", unitError);
    throw unitError;
  }

  const optionLabel = unit.choice.options.find((o) => o.id === optionId)?.label ?? optionId;
  const { error: summaryError } = await supabase.from("progress_summaries").insert({
    user_id: userId,
    kind: "unit_complete",
    unit_id: unit.id,
    unit_index: unit.unitIndex,
    title: `Completed: ${unit.title}`,
    body: `Chose to focus on "${optionLabel}" next.`,
  });
  if (summaryError) {
    console.error("submitChoice summary", summaryError);
    throw summaryError;
  }

  const ctx = await buildContext(userId, unit.unitIndex + 1);
  const gen = await generator.generateUnit(ctx);
  return persistGeneratedUnit(
    userId,
    unit.unitIndex + 1,
    gen,
    ctx,
    "active",
    unit.choice.id,
    optionId
  );
}

// Idempotent unit creation: the unique (user_id, unit_index) index is the
// source of truth. `ignoreDuplicates` makes the insert a no-op on a repeat
// generation (e.g. a retried call); we detect "new vs already existed" from
// whether the upsert returned a row, only seed steps/choice when new, and
// always re-read the unit fully so the result matches the DB either way.
async function persistGeneratedUnit(
  userId: string,
  unitIndex: number,
  gen: GeneratedUnit,
  ctx: GenerateContext,
  status: UnitStatus,
  sourceChoiceId: string | null,
  sourceOptionId: string | null
): Promise<GuideUnitFull> {
  const { data: inserted, error: insertError } = await supabase
    .from("guide_units")
    .upsert(
      {
        user_id: userId,
        unit_index: unitIndex,
        title: gen.title,
        summary: gen.summary,
        status,
        goal_title: ctx.goalTitle,
        goal_career_id: ctx.goalCareerId,
        source_choice_id: sourceChoiceId,
        source_option_id: sourceOptionId,
        context: ctx,
      },
      { onConflict: "user_id,unit_index", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();
  if (insertError) {
    console.error("persistGeneratedUnit insert", insertError);
    throw insertError;
  }

  if (inserted) {
    const unitId = inserted.id;

    const { error: stepsError } = await supabase.from("guide_steps").insert(
      gen.steps.map((step, i) => ({
        unit_id: unitId,
        user_id: userId,
        step_index: i,
        kind: step.kind,
        title: step.title,
        body: step.body,
        payload: step.payload ?? {},
      }))
    );
    if (stepsError) {
      console.error("persistGeneratedUnit steps", stepsError);
      throw stepsError;
    }

    const { error: choiceError } = await supabase.from("guide_choices").insert({
      unit_id: unitId,
      user_id: userId,
      prompt: gen.choice.prompt,
      options: gen.choice.options,
    });
    if (choiceError) {
      console.error("persistGeneratedUnit choice", choiceError);
      throw choiceError;
    }
  }

  const { data, error } = await supabase
    .from("guide_units")
    .select(UNIT_FULL_COLS)
    .eq("user_id", userId)
    .eq("unit_index", unitIndex)
    .maybeSingle();
  if (error) {
    console.error("persistGeneratedUnit reread", error);
    throw error;
  }
  if (!data) {
    throw new Error("Failed to persist unit");
  }
  return mapUnitFull(data);
}
