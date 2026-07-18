import {
  generator,
  type ChoiceGenerateContext,
  type ChoiceOption,
  type GenerateContext,
  type GeneratedUnit,
  type StepKind,
  type UnitStatus,
} from "./guide/generator";
import { supabase, getProfile, upsertProfile, updateSpecialization } from "./supabase";

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
  journeySummary: string | null;
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
    journeySummary: r.journey_summary ?? null,
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

  // Build structured choice history with specialization trail
  const choiceHistory: GenerateContext["choiceHistory"] = [];
  const { data, error } = await supabase
    .from("guide_units")
    .select("unit_index, guide_choices(prompt,options,selected_option_id)")
    .eq("user_id", userId)
    .order("unit_index");
  if (error) {
    console.error("buildContext choiceHistory", error);
    // Fail loud on the write path: a swallowed error here would silently
    // generate an under-personalized unit that then gets baked in permanently.
    throw error;
  }
  for (const row of data ?? []) {
    const choice = oneOf((row as any).guide_choices);
    if (!choice || choice.selected_option_id == null) continue;
    const options = (choice.options ?? []) as ChoiceOption[];
    const selectedOption = options.find((o) => o.id === choice.selected_option_id);
    const optionLabel = selectedOption?.label ?? choice.selected_option_id;
    const narrowedTo = selectedOption?.specializationLabel ?? optionLabel;
    choiceHistory.push({
      unitIndex: (row as any).unit_index,
      chose: optionLabel,
      narrowedTo,
    });
  }

  // Get the latest journey summary from the most recent unit
  let journeySummary: string | null = null;
  if (unitIndex > 0) {
    const { data: latestUnit } = await supabase
      .from("guide_units")
      .select("journey_summary")
      .eq("user_id", userId)
      .order("unit_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    journeySummary = latestUnit?.journey_summary ?? null;
  }

  return {
    userId,
    goalTitle: profile?.career_goal ?? "",
    currentSpecialization: profile?.career_specialization ?? null,
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
    careerPath: profile?.career_path ?? [],
    choiceHistory,
    journeySummary,
  };
}

// Build an extended context for choice generation (includes completed step info)
function buildChoiceContext(ctx: GenerateContext, steps: GuideStep[]): ChoiceGenerateContext {
  return {
    ...ctx,
    completedSteps: steps.map((s) => ({ kind: s.kind, title: s.title })),
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

// Delete the user's whole guide path. The FK cascade removes steps + choices;
// progress_summaries.unit_id is ON DELETE SET NULL, so the parent history survives.
export async function clearGuide(userId: string): Promise<void> {
  const { error } = await supabase.from("guide_units").delete().eq("user_id", userId);
  if (error) {
    console.error("clearGuide", error);
    throw error;
  }
}

// Reset the learning path without touching the career goal or personal info.
// Wipes guide units (FK cascade clears steps + choices), resets specialization
// back to the original broad goal, and regenerates a fresh unit 0.
export async function resetLearningPath(userId: string): Promise<void> {
  await clearGuide(userId);

  // Reset specialization back to the original broad goal
  const profile = await getProfile(userId);
  if (profile?.career_goal) {
    await upsertProfile(userId, {
      career_specialization: profile.career_goal,
      career_path: [profile.career_goal],
    });
  }
}

export async function ensureFirstUnit(userId: string): Promise<GuideUnitFull> {
  const profile = await getProfile(userId);
  const goalTitle = profile?.career_goal ?? "";
  const goalCareerId = profile?.career ?? null;

  let units = await getGuideUnits(userId);
  if (units.length) {
    const first = units.find((u) => u.unitIndex === 0) ?? units[0];
    // A new goal = a new path: if the goal changed since this path started
    // (unit 0's snapshot no longer matches the profile), reset and regenerate.
    if (first.goalTitle !== goalTitle || first.goalCareerId !== goalCareerId) {
      await clearGuide(userId);
      units = [];
    }
  }

  // No path yet → generate unit 0 (without a choice — choices come post-completion).
  if (!units.length) {
    const ctx = await buildContext(userId, 0);
    const gen = await generator.generateUnit(ctx);
    return persistGeneratedUnit(userId, 0, gen, ctx, "active", null, null);
  }

  // Self-heal a missing successor: if the last unit is decided ('done') but its
  // next unit was never generated (e.g. generation failed mid-advance), make it
  // now so the path never dead-ends. persistGeneratedUnit is idempotent.
  const last = units.reduce((a, b) => (b.unitIndex > a.unitIndex ? b : a));
  if (last.status === "done" && last.choice && last.choice.selectedOptionId) {
    // Check if the chosen option was a pause/graduate — if so, don't generate next
    const selectedOption = last.choice.options.find((o) => o.id === last.choice!.selectedOptionId);
    if (selectedOption?.specializationLabel == null) {
      // Pause/graduate option — path is intentionally ended, no self-heal needed
      return units.find((u) => u.unitIndex === 0) ?? units[0];
    }

    const ctx = await buildContext(userId, last.unitIndex + 1);
    const gen = await generator.generateUnit(ctx);
    return persistGeneratedUnit(
      userId,
      last.unitIndex + 1,
      gen,
      ctx,
      "active",
      last.choice.id,
      last.choice.selectedOptionId
    );
  }

  return units.find((u) => u.unitIndex === 0) ?? units[0];
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

// Generate and persist choices for a completed unit (post-completion generation).
export async function generateAndPersistChoices(
  userId: string,
  unit: GuideUnitFull
): Promise<GuideChoice> {
  // Guard: don't generate choices if they already exist (idempotent)
  if (unit.choice) return unit.choice;

  // Guard: all steps must be completed
  if (unit.steps.some((s) => s.completedAt == null)) {
    throw new Error("All steps must be completed before generating choices");
  }

  const ctx = await buildContext(userId, unit.unitIndex);
  const choiceCtx = buildChoiceContext(ctx, unit.steps);
  const generatedChoices = await generator.generateChoices(choiceCtx);

  const { data: inserted, error } = await supabase
    .from("guide_choices")
    .insert({
      unit_id: unit.id,
      user_id: userId,
      prompt: generatedChoices.prompt,
      options: generatedChoices.options,
    })
    .select()
    .single();
  if (error) {
    console.error("generateAndPersistChoices", error);
    throw error;
  }

  return mapChoice(inserted);
}

export async function submitChoice(
  userId: string,
  unit: GuideUnitFull,
  optionId: string
): Promise<GuideUnitFull | null> {
  if (!unit.choice) throw new Error("No choice for this unit");
  if (unit.steps.some((s) => s.completedAt == null)) throw new Error("Finish all steps first");

  const selectedOption = unit.choice.options.find((o) => o.id === optionId);
  const optionLabel = selectedOption?.label ?? optionId;
  const isPauseOption = selectedOption?.specializationLabel == null;

  // Idempotent re-entry: if this unit was already submitted (e.g. a retry after
  // a transient error mid-sequence, or a stale double-tap), don't re-write the
  // choice/unit/summary — just ensure the next unit exists and return it.
  if (unit.status === "done" || unit.choice.selectedOptionId != null) {
    if (isPauseOption) return null; // pause/graduate — no next unit
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

  // 1. Record the choice
  const { error: choiceError } = await supabase
    .from("guide_choices")
    .update({ selected_option_id: optionId, decided_at: now })
    .eq("id", unit.choice.id);
  if (choiceError) {
    console.error("submitChoice choice", choiceError);
    throw choiceError;
  }

  // 2. Mark the unit as done
  const { error: unitError } = await supabase
    .from("guide_units")
    .update({ status: "done", completed_at: now, updated_at: now })
    .eq("id", unit.id);
  if (unitError) {
    console.error("submitChoice unit", unitError);
    throw unitError;
  }

  // 3. Insert progress summary
  const { error: summaryError } = await supabase.from("progress_summaries").insert({
    user_id: userId,
    kind: isPauseOption ? "milestone" : "unit_complete",
    unit_id: unit.id,
    unit_index: unit.unitIndex,
    title: isPauseOption ? `Career journey paused: ${unit.title}` : `Completed: ${unit.title}`,
    body: isPauseOption
      ? `Paused the journey at "${unit.goalTitle}". Ready to review career roadmap.`
      : `Chose to focus on "${selectedOption?.specializationLabel ?? optionLabel}" next.`,
  });
  if (summaryError) {
    console.error("submitChoice summary", summaryError);
    throw summaryError;
  }

  // 4. Update career specialization on profile (if not a pause option)
  if (!isPauseOption && selectedOption?.specializationLabel) {
    await updateSpecialization(userId, selectedOption.specializationLabel);
  }

  // 5. Prune the completed unit's step content — keep only the shell + choice
  const { error: pruneError } = await supabase
    .from("guide_steps")
    .delete()
    .eq("unit_id", unit.id);
  if (pruneError) console.error("submitChoice prune", pruneError);

  // 6. If pause/graduate, we're done — no next unit
  if (isPauseOption) return null;

  // 7. Generate and persist the next unit
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
// generation; we detect "new vs already existed" from whether the upsert
// returned a row, only seed steps when new, and always re-read the unit fully
// so the result matches the DB either way.
//
// NOTE: Units are now created WITHOUT a choice. Choices are generated
// post-completion via generateAndPersistChoices.
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
        journey_summary: gen.journeySummary,
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
    // No choice insertion here — choices are generated post-completion
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
