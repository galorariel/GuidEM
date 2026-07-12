-- ============================================================================
-- Student-Guidance_app — seed data (OPTIONAL, for testing)
--
-- IMPORTANT: There is no career/activity content to seed — that data is
-- hardcoded in data/careers.tsx and data/activities.tsx. This file only seeds
-- per-user test rows, and every row must reference a REAL auth user id.
--
-- Auth users cannot be created reliably from plain SQL. So the flow is:
--   1. Create a test user first — either sign up through the app once, or in
--      the Supabase dashboard: Authentication → Users → Add user
--      (set "Auto Confirm User" so no email step is needed).
--   2. Copy that user's UUID from Authentication → Users.
--   3. Paste it below in place of PASTE-USER-UUID-HERE and run this file
--      (SQL Editor → Run, or `psql < supabase/seed.sql`).
--
-- The profile row itself is created automatically by the on_auth_user_created
-- trigger, so we UPDATE it rather than insert.
-- ============================================================================

\set test_user '00000000-0000-0000-0000-000000000000'  -- <-- PASTE-USER-UUID-HERE (leave as zeros to no-op safely)

-- Give the test user a filled-out profile + a set career.
update public.profiles
set full_name   = 'Test Student',
    role        = 'student',
    school      = 'Herzliya High School',
    grade_level = '11',
    city        = 'Tel Aviv',
    career      = '1',   -- career id from data/careers.tsx (id '1'), NOT the title
    updated_at  = now()
where id = :'test_user';

-- Seed a questionnaire answer set (upsert so re-running is safe).
insert into public.questionnaire
  (user_id, majors, career_in_mind, hobbies, parents_jobs, dream_job, volunteer_interest, psychometric_grade)
values
  (:'test_user', 'Computer Science, Math', 'Software Engineer', 'Coding, basketball',
   'Teacher, Nurse', 'Build apps that help people', 'Yes - tutoring', '710')
on conflict (user_id) do update set
  majors             = excluded.majors,
  career_in_mind     = excluded.career_in_mind,
  hobbies            = excluded.hobbies,
  parents_jobs       = excluded.parents_jobs,
  dream_job          = excluded.dream_job,
  volunteer_interest = excluded.volunteer_interest,
  psychometric_grade = excluded.psychometric_grade,
  updated_at         = now();

-- Seed a couple of saved activities (ids must exist in data/activities.tsx).
insert into public.saved (user_id, item_type, item_id) values
  (:'test_user', 'activity', '1'),
  (:'test_user', 'activity', '2')
on conflict (user_id, item_type, item_id) do nothing;
