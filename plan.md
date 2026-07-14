# Plan — AI Career Guide

Concept: see `guidem.md`. The groundwork round (Supabase auth + catalog, 3‑pillar tabs, save/like) is done and merged to `main`. Work now proceeds in **rounds** toward the app's headline feature — the **AI Career Guide**: a Duolingo‑like personalized path of small steps toward a chosen career, each step giving real‑life, location‑aware how‑to.

**Branch/merge strategy (trunk‑style):** finished, reviewed rounds land on `main` promptly; each new round branches fresh off `main`. Parallel work does not wait on other branches. Two lines of work run in parallel:
- **Owner** — the guide + the personalization data it needs. Owns all migrations. (Round 1 merged to `main`; Round 2 on `feat/guide-goal-setting`.)
- **Collaborator** `feat/questionnaire-recommendations` — the questionnaire, redefined as a **RIASEC personality test** whose only output is `profiles.personality_type` (`realistic|investigative|artistic|social|enterprising|conventional`), used to recommend catalog careers. Syncs `main` in as rounds land (inherits `personality_type` for free); only reconciles its own questionnaire section of `personal-details.tsx`.

## Round 1 — Sign‑up data foundation ✅ DONE (merged to `main`)

The guide's personalization depends on knowing the student. Collect it at sign‑up and make it editable.

- **Phase A — Data:** migration `supabase/migrations/20260714000000_profile_fields.sql` adds `profiles.majors text[]` (default `{}`) and `profiles.personality_type text` (nullable, CHECK‑constrained to the 6 RIASEC values). Add `majors` + `personality_type` (+ `PersonalityType` union) to the `Profile` type in `services/supabase.ts`. `city`/`grade_level` columns already exist. → **Checkpoint A:** owner applies migration.
- **Phase B — Sign‑up:** new reusable `components/MajorsInput.tsx` ("+ add" chips, not a picker). Add **City**, **Grade level** (tap selector), **Majors** to `app/sign-up.tsx`; extend its `upsertProfile` call. → **Checkpoint B (device).**
- **Phase C — Edit in Profile:** make `app/personal-details.tsx` profile section editable (city/grade/majors/school + Save); show `personality_type` read‑only. → **Checkpoint C (device).**

`personality_type` is **pre‑provisioned** here (column + enum + type) so the questionnaire branch merges drop‑in — it just calls `upsertProfile({ personality_type })`.

## Later rounds

- **Round 2 — Goal setting (IN PROGRESS on `feat/guide-goal-setting`).** Store a goal as a human‑readable **title** + optional links to catalog rows. Entry points: a **Guide** button in `career.tsx` header (next to the heart) and a text box on the Guide tab.
- **Career specializations.** New `career_specializations` table off `careers` (e.g. "Software Engineer" → "ML Engineer at Google"), each with a blurb/link + Guide button.
- **Round 3 — Roadmap.** `guide_goals`/`guide_tasks` tables + Duolingo‑style path UI (locked/current/done) + step‑detail screen. Generation engine stubbed first (mock steps), then chosen — leading candidate: LLM via a Supabase Edge Function (key stays server‑side, results cached), rule‑based templating as fallback.

## Polish (ongoing)

- Real images for careers/activities (`image_url` columns exist).
- Search debounce; richer filters. City picker (vs free text).
- Sign-up UX pass: consider splitting into a few sequential pages/steps; refine the +add-majors flow, grade selector, field wording/order.
- Use `constants/theme` everywhere; tab icons/labels; consider dark mode.
- Drop the `router.push(... as any)` casts once expo‑router route types regenerate.
- Consistent loading/error states.

## Notes for later (no‑context resume)

- Owner must keep Supabase **"Confirm email" OFF** for dev.
- Shared merge‑touch‑point: `app/personal-details.tsx` (profile vs questionnaire sections).
- Full design detail: `/Users/arielgalor/.claude/plans/memoized-napping-spring.md`. Build history: git + `.superpowers/sdd/progress.md`.
