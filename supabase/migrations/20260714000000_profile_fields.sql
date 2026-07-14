-- Round 1 (AI Guide): personalization fields on profiles.
-- Additive only — safe to apply on the shared dev DB. `city` and
-- `grade_level` already exist from 20260712000000_init.sql; this adds the
-- two that don't yet.

-- School subjects/majors the student has chosen (empty = none chosen yet).
alter table public.profiles
  add column if not exists majors text[] not null default '{}';

-- RIASEC / Holland Code personality type, written by the questionnaire
-- (personality test). Nullable: null = "not taken yet". CHECK-enum follows
-- the careers.demand_level pattern.
alter table public.profiles
  add column if not exists personality_type text
    check (personality_type in
      ('realistic','investigative','artistic','social','enterprising','conventional'));
