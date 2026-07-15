-- Round 4: per-user unit guide (a path of units -> steps -> one terminal choice).
-- Additive. RLS keyed auth.uid() = user_id, mirroring the saved_* pattern in
-- 20260712000000_init.sql. Parents get NO policy on the guide tables (the full
-- path stays private); Round 5 adds only a cross-user read on progress_summaries.

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
  unique (user_id, unit_index)    -- idempotency guard against double-generation
);
create index guide_units_user_idx on public.guide_units (user_id, unit_index);

create table public.guide_steps (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.guide_units(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,  -- denormalized for simple RLS
  step_index   int  not null,
  kind         text not null default 'lesson' check (kind in ('lesson','task','reflection','resource','quiz')),
  title        text not null default '',
  body         text not null default '',
  payload      jsonb not null default '{}',
  completed_at timestamptz,       -- null = not done
  created_at   timestamptz not null default now(),
  unique (unit_id, step_index)
);
create index guide_steps_unit_idx on public.guide_steps (unit_id, step_index);

create table public.guide_choices (
  id                 uuid primary key default gen_random_uuid(),
  unit_id            uuid not null references public.guide_units(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  prompt             text not null default '',
  options            jsonb not null default '[]',   -- [{id,label,description}]
  selected_option_id text,
  decided_at         timestamptz,
  created_at         timestamptz not null default now(),
  unique (unit_id)                                  -- one terminal choice per unit
);
create index guide_choices_user_idx on public.guide_choices (user_id);

create table public.progress_summaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,   -- the student
  kind       text not null default 'unit_complete' check (kind in ('unit_complete','decision','milestone')),
  unit_id    uuid references public.guide_units(id) on delete set null,
  unit_index int,
  title      text not null default '',
  body       text not null default '',   -- parent-facing blurb; no step/choice detail
  created_at timestamptz not null default now()
);
create index progress_summaries_user_idx on public.progress_summaries (user_id, created_at desc);

alter table public.guide_units        enable row level security;
alter table public.guide_steps        enable row level security;
alter table public.guide_choices      enable row level security;
alter table public.progress_summaries enable row level security;

-- guide_units
create policy "guide_units_select_own" on public.guide_units
  for select using (auth.uid() = user_id);
create policy "guide_units_insert_own" on public.guide_units
  for insert with check (auth.uid() = user_id);
create policy "guide_units_update_own" on public.guide_units
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_units_delete_own" on public.guide_units
  for delete using (auth.uid() = user_id);

-- guide_steps
create policy "guide_steps_select_own" on public.guide_steps
  for select using (auth.uid() = user_id);
create policy "guide_steps_insert_own" on public.guide_steps
  for insert with check (auth.uid() = user_id);
create policy "guide_steps_update_own" on public.guide_steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_steps_delete_own" on public.guide_steps
  for delete using (auth.uid() = user_id);

-- guide_choices
create policy "guide_choices_select_own" on public.guide_choices
  for select using (auth.uid() = user_id);
create policy "guide_choices_insert_own" on public.guide_choices
  for insert with check (auth.uid() = user_id);
create policy "guide_choices_update_own" on public.guide_choices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_choices_delete_own" on public.guide_choices
  for delete using (auth.uid() = user_id);

-- progress_summaries (owner-only this round; Round 5 adds the parent cross-user read)
create policy "progress_summaries_select_own" on public.progress_summaries
  for select using (auth.uid() = user_id);
create policy "progress_summaries_insert_own" on public.progress_summaries
  for insert with check (auth.uid() = user_id);
create policy "progress_summaries_delete_own" on public.progress_summaries
  for delete using (auth.uid() = user_id);
