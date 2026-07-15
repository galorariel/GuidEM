# Plan — AI Career Guide

Concept: see `guidem.md`. The app is built in **rounds** toward its headline feature — the **AI Career Guide**: a Duolingo-like personalized path of small steps toward a chosen career, each giving real-life, location-aware how-to.

**Branch/merge strategy (trunk-style):** finished, reviewed rounds land on `main` promptly; each new round branches fresh off `main`. Owner owns all migrations (applied to the shared Supabase before device tests). Each round runs subagent-driven (implementer + task review per task, opus whole-branch review) with device checkpoints.

## Status

| Round | Feature | State |
|-------|---------|-------|
| 1 | Sign-up personalization (city/grade/majors + `personality_type` column) + editable Profile | ✅ merged |
| 2 | Career goal: set/clear from Search, career detail, Guide text box | ✅ merged |
| 3 | Questionnaire: merged collaborator's RIASEC quiz → persist `personality_type` → `recommendCareers` → set goal (`careers.holland_codes`) | ✅ merged |
| 3.1 | Questionnaire tab is stateful: quiz until taken, then a completed view (type + recommendations + Retake) | ✅ merged |
| **4** | **Unit guide (stub-first): the roadmap** | **NEXT** |
| 5 | Parent accounts (child share-code + summary feed) | planned |

Working end-to-end today: sign-up → RIASEC quiz → personality-based recommendations → set a career goal → goal shows on the Guide tab.

## Round 4 — Unit guide (stub-first) — NEXT

The headline feature. See the full spec + task plan:
- Spec: `docs/superpowers/specs/2026-07-16-round4-unit-guide-design.md`
- Plan: `docs/superpowers/plans/2026-07-16-round4-unit-guide.md`

Summary: new `guide_units`/`guide_steps`/`guide_choices`/`progress_summaries` tables (per-user RLS); a pure `UnitGenerator` seam (mock now, **LLM via Supabase Edge Function later** — drop-in behind `EXPO_PUBLIC_USE_LLM_GUIDE`); `services/guide.ts` (`getGuideUnits`/`ensureFirstUnit`/`markStepDone`/`submitChoice`); a Duolingo-style path UI replacing the "roadmap coming soon" card on the Guide tab (`app/(tabs)/index.tsx`), with step and terminal-choice screens. Each unit ends in a branching decision; completing steps + choosing generates the next unit.

## Round 5 — Parent accounts (planned)

Child share-code link (`link_code` + `ensure_link_code`), a locked-down `link_child_by_code` RPC, and the critical cross-user RLS: a linked parent reads only the child's `progress_summaries` feed (never the raw path), via a `SECURITY DEFINER is_parent_of` helper. Role-based routing (parent vs student). Detailed design in `/Users/arielgalor/.claude/plans/memoized-napping-spring.md`.

## Deferred

- **Real LLM generation** — the Edge Function `generate-unit` (API key server-side) behind the `UnitGenerator` seam. Everything in Round 4 is built around it so it's a drop-in swap.
- Career specializations (nested specific careers). Recommendation tuning beyond primary/secondary overlap.

## Polish (ongoing)

- Real images for careers/activities (`image_url` columns exist).
- Search debounce; richer filters. City picker (vs free text).
- Sign-up UX pass (multi-page split; refine +add-majors/grade selector).
- `RatingScale` hardcodes a font value instead of `fonts.body`; questionnaire doesn't prefill a saved type on retake (cosmetic).
- Use `constants/theme` everywhere; tab icons/labels; consider dark mode.
- Drop the `router.push(... as any)` casts once expo-router route types regenerate.
- Consistent loading/error states.

## Notes for later (no-context resume)

- Owner must keep Supabase **"Confirm email" OFF** for dev.
- Shared merge-touch-point with the collaborator: `app/personal-details.tsx` (profile vs questionnaire sections). The collaborator's `feat/questionnaire-recommendations` is now fully contained in `main`.
- Full design detail: `/Users/arielgalor/.claude/plans/memoized-napping-spring.md`. Build history: git + `.superpowers/sdd/progress.md`.
