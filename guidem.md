# Student Career Guidance — The Idea (read me first)

A mobile app that helps high‑school students **figure out and pursue a career**. Israel-focused (prices in ₪, Israeli cities, psychometric grade).

## Three pillars
1. **Career Search** — browse/search a catalog of careers, plus supporting real‑world activities (internships, workshops, volunteering, etc.).
2. **Career Questionnaire** — the student answers questions (interests, subjects, hobbies, dream job…). Later this **recommends careers** that fit.
3. **AI Career Guide** — each student has a chosen career. The Guide gives a **personalized, gamified roadmap**: a long list of small steps toward that career, based on their location, age, and school subjects. *(This is the main point — not built yet.)*

Activities are a **side** thing — experiences you add along the way, not the goal. "Getting there" = the Guide's roadmap to a job/career (not directions on an activity).

## App structure — 4 tabs
- **Guide** (home): your career + the future roadmap.
- **Search**: find careers & activities (DB-backed, full‑text search + filters).
- **Questionnaire**: your inputs, editable anytime.
- **Profile**: account, personal info, and **Saved** → "Careers you're considering" + "Saved activities".

Saving = liking: a single **♥** on any career or activity marks it, and it shows up in Profile.

## Tech (brief)
- **Expo / React Native** (runs in Expo Go), file-based routing (expo-router).
- **Supabase** backend: email/password auth; Postgres with row-level security.
  - Per-user tables: `profiles`, `questionnaire`, `saved` (owner-scoped).
  - Catalog tables: `careers`, `activities`, `career_activities` (public read-only; editable in the dashboard without new app builds).
- Data layer: `services/supabase.ts` (user data) + `services/catalog.ts` (catalog).

## Status
Groundwork + skeleton done on branch `feat/auth-career-tabs-db-migration`: Supabase migration complete, catalog live (16 careers / 28 activities seeded), 3‑pillar navigation built, save/like working, Appwrite fully removed. Recommendation logic and the AI Guide are **not** built yet → see `plan.md`.

## Run it
1. `.env` needs `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Supabase project must have the schema + seed applied (`supabase/migrations/*.sql` then `supabase/seed_catalog.sql`, via the SQL editor) and **"Confirm email" OFF** for dev.
3. `npx expo start --tunnel` (or drop `--tunnel` on the same Wi‑Fi) → scan the QR with Expo Go.
