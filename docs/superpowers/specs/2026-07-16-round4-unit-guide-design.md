# Round 4 — Unit Guide (Design)

## Context

The app's headline feature is the **AI Career Guide**: a Duolingo-like personalized roadmap toward the user's chosen career. Rounds 1–3.1 (merged) built everything up to the goal: sign-up personalization, a RIASEC quiz that saves a `personality_type` and recommends careers, and the career-goal mechanic. The Guide tab currently shows the goal + a "roadmap — coming soon" placeholder.

Round 4 builds the roadmap itself, as the owner specified: the AI generates the path **one unit at a time**. A **unit** is an ordered set of **steps** ending in a branching **decision** (a choice). The next unit only generates *after* the student completes the current unit's steps and makes the choice, and the next unit's content depends on that choice. This teaches decision-making, personalizes the path, and (with the real LLM later) keeps content current.

**Key decisions (owner, already approved):**
- **Stub-first generation.** Build the data model + path UI + choice mechanic against a **mock generator** now. The real generation (LLM via a Supabase Edge Function) is deferred behind a swap-in seam.
- **Persist units + steps + progress + choices.** The path is stable and resumable across reloads; each new unit is generated from the prior choices.

**Out of scope (deferred):** the real LLM Edge Function; career specializations; parent visibility (Round 5, which only *reads* the `progress_summaries` this round writes).

## Data model

Four new per-user tables (RLS keyed `auth.uid() = user_id`, same select/insert/update/delete-own shape as `saved_*`/`guide_*` conventions in `supabase/migrations/20260712000000_init.sql`). Parents get **no** policy on the guide tables — the full path stays private; Round 5 adds only a cross-user read on `progress_summaries`.

- **`guide_units`** — one row per unit in a user's path. `unit_index int` (0-based; `unique(user_id, unit_index)` is the idempotency guard against double-generation), `title`, `summary`, `status ∈ {locked, active, done}`, `goal_title`/`goal_career_id` (snapshot of the goal when generated), `source_choice_id`/`source_option_id` (which decision spawned this unit; app-managed, **no FK** to avoid a circular dependency), `context jsonb` (the `GenerateContext` snapshot), timestamps, `completed_at`.
- **`guide_steps`** — ordered steps within a unit. FK `unit_id` (cascade), denormalized `user_id` (simple RLS), `step_index` (`unique(unit_id, step_index)`), `kind ∈ {lesson, task, reflection, resource, quiz}`, `title`, `body`, `payload jsonb`, `completed_at` (null = not done).
- **`guide_choices`** — the one terminal decision per unit. FK `unit_id` (`unique(unit_id)`), `user_id`, `prompt`, `options jsonb` (`[{id,label,description}]`), `selected_option_id`, `decided_at`.
- **`progress_summaries`** — parent-facing feed rows written on unit completion / decision. `user_id` (the student), `kind ∈ {unit_complete, decision, milestone}`, `unit_id`, `unit_index`, `title`, `body` (blurb, **no** step/choice detail). Created here so `submitChoice` can always write it; Round 5 adds the parent cross-user SELECT policy. This round: owner-only RLS (`auth.uid() = user_id`).

## Generation seam (swap-in for the LLM)

`services/guide/generator.ts` — pure and stateless so the mock and the future Edge Function are byte-compatible; persistence never changes on swap.

```ts
interface GenerateContext {
  userId: string; goalTitle: string; goalCareerId: string | null;
  personalityType: PersonalityType | null;
  profile: { fullName: string; gradeLevel: string; city: string; school: string; majors: string[] };
  unitIndex: number;
  priorChoices: { unitIndex: number; prompt: string; optionId: string; optionLabel: string }[];
}
interface GeneratedStep   { kind: StepKind; title: string; body: string; payload?: Record<string, unknown> }
interface ChoiceOption    { id: string; label: string; description: string }
interface GeneratedChoice { prompt: string; options: ChoiceOption[] }
interface GeneratedUnit   { title: string; summary: string; steps: GeneratedStep[]; choice: GeneratedChoice }
interface UnitGenerator   { generateUnit(ctx: GenerateContext): Promise<GeneratedUnit> }

export const generator: UnitGenerator =
  process.env.EXPO_PUBLIC_USE_LLM_GUIDE === "true" ? edgeGenerator : mockGenerator;
```

- **`mockGenerator`** returns deterministic content keyed off `ctx.unitIndex` + `ctx.priorChoices` (so a chosen option visibly changes the next unit) and interpolates `ctx.profile`/`goalTitle` into copy (proves personalization end-to-end).
- **`edgeGenerator`** (later, deferred) = `supabase.functions.invoke("generate-unit", { body: ctx })` returning the same `GeneratedUnit`. The `GeneratedUnit` contract is frozen now so this is a true drop-in.

## Service (`services/guide.ts`)

camelCase types (`GuideUnit`, `GuideStep`, `GuideChoice`, `GuideUnitFull = GuideUnit + steps[] + choice`) mapped from snake_case rows (same `mapCareer` style as `services/catalog.ts`). Functions:
- `getGuideUnits(userId): Promise<GuideUnitFull[]>` — ordered by `unit_index`.
- `ensureFirstUnit(ctx): Promise<GuideUnitFull>` — create unit 0 if the user has none.
- `markStepDone(stepId): Promise<void>`.
- `submitChoice(choiceId, optionId, ctx): Promise<GuideUnitFull>` — validate all steps in the unit are done → set unit `done` + `completed_at` → write a `progress_summary` → generate + persist the next unit (`insert ... on conflict (user_id, unit_index) do nothing`, then re-select = idempotent against double-tap) → return the new active unit.

`submitChoice` orchestrates several writes without a DB transaction; correctness rests on `unique(user_id, unit_index)` + idempotent re-select, not on atomicity.

## UI

Replace the "roadmap — coming soon" card in `app/(tabs)/index.tsx` with the guide, gated on a goal existing (if no goal, keep the existing "set a goal" prompt):
- **Path view** — units rendered as a vertical Duolingo-style path; steps shown locked / active / done; the active unit is interactive.
- **Step screen** — shows a step's `title`/`body`; a "Mark done" action (`markStepDone`).
- **Terminal-choice screen** — the unit's `prompt` + `options`; picking one calls `submitChoice` → advances to the next unit. Reachable only once all steps are done.

Child routes (step/choice detail) as needed under the existing stack.

## Error handling / edge cases
- All service calls follow the repo convention: log + safe fallback on read errors; `try/catch` + `authErrorMessage` + `Alert` on user-facing writes.
- Idempotency: double-tapping "submit choice" or re-entering the Guide can't create duplicate units (unique index + re-select).
- No goal set → no generation; show the set-goal prompt.

## Testing / verification
- **No test harness** (Expo Go). Per-task gate: `npx tsc --noEmit` + `npx eslint <changed files>`.
- **Device checkpoints:** (A) unit 0 generates, steps mark done, path renders; (B) submitting the choice advances to unit 1 whose content reflects the option, and killing/reopening the app resumes the path (proves persistence).

## Migration gate
`supabase/migrations/20260716000000_guide.sql` (additive) — owner applies to the shared Supabase before device tests.

## Post-build refinements (implemented)
- **Prune old steps.** On advance, `submitChoice` deletes the completed unit's `guide_steps` (keeps the `guide_units` shell + `guide_choices`). Each user holds only ~the active unit's steps at a time — durable + single source of truth without accumulating the whole path. Done units hydrate with `steps: []` and render as a decision readout.
- **Path regenerates on goal change.** `ensureFirstUnit` compares unit 0's goal snapshot to the current profile goal; on mismatch it `clearGuide` (delete `guide_units`; cascade removes steps/choices; `progress_summaries.unit_id` is `on delete set null` so history survives) and regenerates. A new goal = a new path.
- **Cross-tab goal freshness.** Search + questionnaire refresh goal/saved state on focus (`useFocusEffect`) so the compass/♥ never go stale after a goal change on another tab.

## Before enabling the real LLM (`EXPO_PUBLIC_USE_LLM_GUIDE=true`) — REQUIRED
1. **Atomic unit persistence.** `persistGeneratedUnit` commits the unit row before its steps/choice (no transaction). If steps/choice fail after the unit commits, a retry hits `ignoreDuplicates` → seeding is skipped → an orphan unit with no steps/choice (a UI dead end). Fix: wrap unit+steps+choice in one RPC/transaction, OR on re-read detect `steps.length === 0 && !choice` and re-seed. (Still open — low-probability with the mock; do before the fallible LLM generator.)

## Resolved
2. ~~**Successor reconcile.**~~ DONE — `ensureFirstUnit` now self-heals: if the last unit is `done` with a decided choice but has no successor, it regenerates it on next Guide focus (so a failed mid-advance generation recovers automatically).
