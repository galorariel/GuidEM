# Plan — Remaining Work

Concept: see `guidem.md`. Branch `feat/auth-career-tabs-db-migration` delivered the groundwork (Supabase auth + catalog, 3‑pillar tabs Guide/Search/Questionnaire/Profile, save/like careers + activities, Appwrite removed). What's left:

## Missing functionality
- **Questionnaire → career recommendation.** Score questionnaire answers against the catalog; suggest best‑fit careers; let the user set one as their career (`profiles.career`).
- **AI Career Guide (the roadmap).** The app's main feature: generate a personalized, gamified list of small steps toward the chosen career, using location / age / school subjects. Needs new tables (e.g. `guide_goals`, `guide_tasks`) + an LLM call.
- **Set-career flow.** When a career is chosen (from a recommendation or Search), surface it on the Guide tab and drive the roadmap from it.

## Polish
- Real images for careers/activities (image_url columns exist; replace the grey stubs).
- Search: debounce typing; richer/combined filters.
- Theme: use `constants/theme` everywhere; consider dark mode.
- Tab icons/labels + general visual pass.
- Remove the `router.push(... as any)` casts once expo-router route types regenerate.
- Consistent loading/error states across screens.

## Notes for later (no-context resume)
- Owner must keep Supabase **"Confirm email" OFF** for dev (else signup shows a "confirm your email" message by design).
- Full build history: git commits (Tasks 1–22) + `.superpowers/sdd/progress.md`.
- Deferred by design this round: recommendation scoring, AI guide, images.
