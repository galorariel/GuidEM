# Round 4 — Unit Guide Implementation Plan

> **For agentic workers:** execute task-by-task (subagent-driven), one commit per task, with the device checkpoints. No test harness — per-task gate is `npx tsc --noEmit` + `npx eslint <changed files>` clean.

**Goal:** a stub-first, persisted, unit-by-unit career roadmap on the Guide tab — units of steps ending in a branching choice that generates the next unit.

**Spec:** `docs/superpowers/specs/2026-07-16-round4-unit-guide-design.md`. **Branch:** `feat/round4-unit-guide` off `main`.

## Global constraints
- Expo Go; Supabase env only, no secrets. NO test harness (no tests expected).
- Additive migration, owner-applied before device tests. Per-user RLS keyed `auth.uid() = user_id`, mirroring `saved_*` in `supabase/migrations/20260712000000_init.sql`.
- Generation stays behind the `UnitGenerator` seam (mock now; the `GeneratedUnit` shape is frozen so the LLM Edge Function drops in later behind `EXPO_PUBLIC_USE_LLM_GUIDE`).
- Reuse: `getProfile` (`services/supabase.ts`), `getCareer` (`services/catalog.ts`) if needed for goal context, `useAuth`, `CustomButton`, `constants/theme`, `authErrorMessage`. Guide tab lives at `app/(tabs)/index.tsx`.

---

## Task 1 — Migration: guide tables + RLS  (gate G2)

**File:** `supabase/migrations/20260716000000_guide.sql`

```sql
-- Round 4: per-user unit guide (path of units -> steps -> a terminal choice).
create table public.guide_units (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  unit_index       int  not null,
  title            text not null default '',
  summary          text not null default '',
  status           text not null default 'active' check (status in ('locked','active','done')),
  goal_title       text not null default '',
  goal_career_id   text,
  source_choice_id uuid,          -- decision that spawned this unit (app-managed; no FK, avoids cycle)
  source_option_id text,
  context          jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz,
  unique (user_id, unit_index)
);
create index guide_units_user_idx on public.guide_units (user_id, unit_index);

create table public.guide_steps (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.guide_units(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  step_index   int  not null,
  kind         text not null default 'lesson' check (kind in ('lesson','task','reflection','resource','quiz')),
  title        text not null default '',
  body         text not null default '',
  payload      jsonb not null default '{}',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (unit_id, step_index)
);
create index guide_steps_unit_idx on public.guide_steps (unit_id, step_index);

create table public.guide_choices (
  id                 uuid primary key default gen_random_uuid(),
  unit_id            uuid not null references public.guide_units(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  prompt             text not null default '',
  options            jsonb not null default '[]',
  selected_option_id text,
  decided_at         timestamptz,
  created_at         timestamptz not null default now(),
  unique (unit_id)
);
create index guide_choices_user_idx on public.guide_choices (user_id);

create table public.progress_summaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'unit_complete' check (kind in ('unit_complete','decision','milestone')),
  unit_id    uuid references public.guide_units(id) on delete set null,
  unit_index int,
  title      text not null default '',
  body       text not null default '',
  created_at timestamptz not null default now()
);
create index progress_summaries_user_idx on public.progress_summaries (user_id, created_at desc);

alter table public.guide_units        enable row level security;
alter table public.guide_steps        enable row level security;
alter table public.guide_choices      enable row level security;
alter table public.progress_summaries enable row level security;

-- Own-row policies (select/insert/update/delete) keyed user_id, for each of the four tables.
-- (progress_summaries: parent cross-user SELECT is added in Round 5; here it's owner-only.)
-- Repeat this block per table, substituting the name:
create policy "guide_units_select_own" on public.guide_units for select using (auth.uid() = user_id);
create policy "guide_units_insert_own" on public.guide_units for insert with check (auth.uid() = user_id);
create policy "guide_units_update_own" on public.guide_units for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_units_delete_own" on public.guide_units for delete using (auth.uid() = user_id);
-- ...guide_steps_*_own, guide_choices_*_own, progress_summaries_*_own (progress_summaries needs select/insert/delete; no update needed)
```

Steps: write the migration (all four policy blocks in full), `npx tsc --noEmit` (unaffected) as a sanity gate, commit `feat(db): guide unit/step/choice/summary tables + RLS`.
**➡️ CHECKPOINT G2 (owner):** apply the migration; confirm the four tables + RLS exist. Gates the device checkpoints.

---

## Task 2 — Generator seam + mock

**Files:** `services/guide/generator.ts` (new).

Define `GenerateContext`, `GeneratedStep`, `ChoiceOption`, `GeneratedChoice`, `GeneratedUnit`, `UnitGenerator`, `StepKind`, `UnitStatus` (exported; the DB-facing camelCase types can live here or in `services/guide.ts` — keep them in one place and import). Implement `mockGenerator.generateUnit(ctx)`:
- Deterministic by `ctx.unitIndex` and the last entry of `ctx.priorChoices` (so a chosen option changes the next unit).
- Produce ~4–6 steps (mix of `lesson`/`task`/`resource`/`reflection`) with copy interpolating `ctx.goalTitle`, `ctx.profile.city`, `ctx.profile.majors`, `ctx.personalityType` — proving personalization.
- Produce a `choice` with 2–3 `options` ({id,label,description}).
Add the selector: `export const generator = process.env.EXPO_PUBLIC_USE_LLM_GUIDE === "true" ? edgeGenerator : mockGenerator;` with a placeholder `edgeGenerator` that calls `supabase.functions.invoke("generate-unit", { body: ctx })` (not exercised this round; keep it compiling).

Gate: tsc + eslint clean. Commit `feat(guide): UnitGenerator seam + mock generator`.

---

## Task 3 — Persistence service (`services/guide.ts`)

**Files:** `services/guide.ts` (new). Consumes Task 2's generator + types.

Types: `GuideStep`, `ChoiceOption`, `GuideChoice`, `GuideUnit`, `GuideUnitFull = GuideUnit & { steps: GuideStep[]; choice: GuideChoice | null }`. Map snake_case → camelCase (mirror `services/catalog.ts` `mapCareer`).

Functions:
- `buildContext(userId): Promise<GenerateContext>` — `getProfile` + prior choices (from `guide_choices` joined to units) → the context the generator needs.
- `getGuideUnits(userId): Promise<GuideUnitFull[]>` — units ordered by `unit_index`, each hydrated with its steps (by `step_index`) and choice.
- `ensureFirstUnit(userId): Promise<GuideUnitFull>` — if the user has no units, `generator.generateUnit(ctx@index0)` then persist unit 0 (`status active`) + its steps + choice; return it. Idempotent via `unique(user_id, unit_index)` + re-select.
- `markStepDone(stepId): Promise<void>` — set `completed_at = now()`.
- `submitChoice(unit, optionId): Promise<GuideUnitFull>` — guard all steps done; set `guide_choices.selected_option_id`/`decided_at`; set the unit `done`/`completed_at`; insert a `progress_summaries` row (`kind 'unit_complete'`, title/body from the unit); build the next context (including this choice) and generate + persist unit `index+1` (`insert ... on conflict (user_id,unit_index) do nothing`, re-select); return the new active unit.

Persistence writes use the repo error convention. `submitChoice` correctness rests on the unique index + idempotent re-select (no transaction).

Gate: tsc + eslint clean. Commit `feat(guide): persistence service (units/steps/choices/summaries + submitChoice)`.

---

## Task 4 — Guide tab path UI + step & choice screens

**Files:** `app/(tabs)/index.tsx` (replace the roadmap placeholder), plus step/choice screens (either child routes e.g. `app/guide-step.tsx`/`app/guide-choice.tsx`, or inline expandable sections — implementer's call, keep it simple and themed).

- On the Guide tab, when a goal exists: `ensureFirstUnit` then `getGuideUnits`; render a vertical **path** of units (done/active/locked) with each unit's steps. If no goal, keep the existing set-goal prompt.
- **Step**: shows `title`/`body`; "Mark done" → `markStepDone` → refresh.
- **Terminal choice**: once all steps in the active unit are done, show the `prompt` + `options`; selecting → `submitChoice` → the next unit appears active.
- Refresh on focus (the tab is already focus-aware for the goal). Loading + error states per repo convention.

Gate: tsc + eslint clean. Commit `feat(guide): Duolingo-style unit path + step/choice UI`.

**📱 CHECKPOINT A (device):** with a goal set, open Guide → unit 0 renders with steps; mark steps done.
**📱 CHECKPOINT B (device):** complete the steps → make the choice → unit 1 appears and its content reflects the chosen option; kill/reopen the app → the path resumes (persistence).

---

## Verification
- Per task: `npx tsc --noEmit` + `npx eslint <changed files>` clean.
- End-to-end (device): goal set → unit 0 (personalized copy) → steps done → choice → unit 1 reflects the choice → reopen app, path persists. Confirm in Supabase that `guide_units`/`guide_steps`/`guide_choices`/`progress_summaries` rows exist and belong only to the user (RLS).
- Final: opus whole-branch review, then merge to `main` trunk-style.

## Deferred (not this round)
- Real LLM `edgeGenerator` (Edge Function + server-side key).
- Parent read of `progress_summaries` (Round 5).
