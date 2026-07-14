-- Round 2 (AI Guide): the user's single active career goal title.
-- Additive; the existing profiles.career column holds the OPTIONAL catalog
-- career id the goal points to (null for a free-text goal). Existing
-- profiles RLS already covers this column.
alter table public.profiles
  add column if not exists career_goal text;
