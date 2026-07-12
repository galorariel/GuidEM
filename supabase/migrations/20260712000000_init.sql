-- ============================================================================
-- Student-Guidance_app — initial schema
-- Run this ONCE against a fresh Supabase project.
--   Option A (dashboard): SQL Editor → paste this file → Run.
--   Option B (CLI):       supabase db push   (or `supabase db reset` locally)
--
-- Careers & activities are NOT stored here — they live hardcoded in data/*.tsx.
-- This schema only covers per-user data: profiles, questionnaire, saved items.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user. Created automatically on signup (trigger
-- below). `career` is the user's set career (nullable until they get one).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  full_name    text        not null default '',
  role         text        not null default '',
  school       text        not null default '',
  grade_level  text        not null default '',
  city         text        not null default '',
  career       text,                                  -- set career (nullable)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- questionnaire: one row per user (upserted). Free-text answers for now.
-- ----------------------------------------------------------------------------
create table public.questionnaire (
  user_id             uuid        primary key references auth.users (id) on delete cascade,
  majors              text        not null default '',
  career_in_mind      text        not null default '',
  hobbies             text        not null default '',
  parents_jobs        text        not null default '',
  dream_job           text        not null default '',
  volunteer_interest  text        not null default '',
  psychometric_grade  text        not null default '',
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- saved: bookmarked items (currently activities). One row per (user,item).
-- ----------------------------------------------------------------------------
create table public.saved (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  item_type   text        not null,          -- e.g. 'activity'
  item_id     text        not null,          -- id from data/activities.tsx
  created_at  timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index saved_user_idx on public.saved (user_id);

-- ----------------------------------------------------------------------------
-- Row-Level Security: every user can only see and mutate their own rows.
-- ----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.questionnaire enable row level security;
alter table public.saved         enable row level security;

-- profiles (keyed by id == auth.uid())
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- questionnaire (keyed by user_id == auth.uid())
create policy "questionnaire_select_own" on public.questionnaire
  for select using (auth.uid() = user_id);
create policy "questionnaire_insert_own" on public.questionnaire
  for insert with check (auth.uid() = user_id);
create policy "questionnaire_update_own" on public.questionnaire
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved (keyed by user_id == auth.uid())
create policy "saved_select_own" on public.saved
  for select using (auth.uid() = user_id);
create policy "saved_insert_own" on public.saved
  for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on public.saved
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up. full_name is read
-- from the signup metadata (see services/supabase.ts signUp -> options.data).
-- SECURITY DEFINER so it can insert past RLS during the auth transaction.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
