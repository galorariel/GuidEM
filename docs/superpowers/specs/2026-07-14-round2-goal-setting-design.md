# Round 2 — Career Goal Setting (Design)

## Context

The app's headline feature is the **AI Career Guide**: a personalized path of steps toward a chosen career. Round 1 (merged to `main`) built the sign-up personalization data. Round 2 builds the **career goal** — the single career a user is actively pursuing, which the Round 3 roadmap will target.

A goal is distinct from the existing **♥ (heart)** action: ♥ = "careers I'm considering" (a list shown in Profile); a **goal** = "the one I'm working toward" (shown on the Guide tab). A user has **exactly one active goal at a time**; setting a new one replaces the previous. A user may both ♥ a career and set it as their goal — two independent actions.

A goal can be either a **catalog career** (picked from Search/detail) or a **free-text aspiration** the catalog doesn't contain (e.g. "AI Developer at Google").

Round 2 scope: set / display / change / clear the goal across three entry points, and show it on the Guide tab. **Deferred:** the roadmap/"Generate my path" (Round 3), and career "specializations" (nested specific careers).

## Data model

Store the goal on the existing per-user `profiles` row (one row per user → one goal falls out naturally). Approach chosen over a dedicated table (YAGNI — only one active goal) and over title-only (which would lose the catalog link the roadmap needs).

- **Migration** (additive, one column): `alter table public.profiles add column if not exists career_goal text;` — the goal's human-readable **title** (nullable).
- Keep the existing `profiles.career text` (nullable) = the **optional catalog career id** the goal points to. Existing RLS on `profiles` (`profiles_*_own`, keyed by `auth.uid() = id`) already covers the new column — no policy change.

State encoding:
| Goal | `career_goal` | `career` |
|------|--------------|----------|
| Free-text | `"AI Developer at Google"` | `null` |
| Catalog | `"Software Engineer"` | `"3"` |
| None | `null` | `null` |

- **`Profile` type** (`services/supabase.ts`): add `career_goal: string | null` (`career` already present).
- **Helpers** (`services/supabase.ts`, thin wrappers over the existing `upsertProfile`):
  - `setCareerGoal(userId, title, careerId?)` — writes `{ career_goal: title, career: careerId ?? null }`.
  - `clearCareerGoal(userId)` — writes `{ career_goal: null, career: null }`.

**Decided (Round 2 simplicity):** typing a free-text goal that happens to match a catalog title does NOT auto-link to the catalog (`career` stays `null`). Auto-matching is a later enhancement.

## Components / surfaces

### Guide tab — `app/(tabs)/index.tsx` (the hub)
Reads the goal via `getProfile`. Renders:
- **Goal set:** a card "Your goal: {career_goal}"; if `career` (catalog id) is set, a **"View career"** link → `/career?id={career}`; a **Clear goal** action → `clearCareerGoal`.
- **Text box** ("Set your own goal") + **Set goal** button — always available; on submit → `setCareerGoal(user.id, typedText)` (free-text, no catalog id), then refresh the displayed goal.
- **No goal:** the text box is the primary prompt, plus a hint to browse Search. (Replaces the current "Go to Questionnaire" prompt.)
- The existing **"Roadmap — coming soon"** placeholder stays; Round 3's *Generate my path* button will live there.

### Career detail — `app/career.tsx`
- In the header row (currently title + ♥), add a **Goal button** (icon, e.g. Ionicons `flag`/`flag-outline`, gated behind a logged-in `user` like the heart) next to the ♥.
- Press → `setCareerGoal(user.id, career.title, career.id)` → **redirect to the Guide tab** so the user immediately sees the goal.

### Search cards — `components/CareerCard.tsx` + `app/(tabs)/search.tsx`
- `CareerCard` gains optional self-contained props mirroring the save pattern: `isGoal?: boolean` (highlight when it's the current goal) and `onSetGoal?: (id: string) => void`. No coupling to catalog/data types.
- `search.tsx` wires `onSetGoal` → `setCareerGoal(user.id, career.title, career.id)` → redirect to the Guide tab. (Optionally computes `isGoal` from the loaded profile's `career`.)

### Redirect
After setting a goal from `career.tsx` or a Search card, navigate to the Guide (index) tab (exact expo-router call — e.g. `router.replace('/(tabs)')` from the stack screen, tab navigation from within Search — resolved at implementation).

## Data flow

1. User sets a goal from one of three surfaces → `setCareerGoal`/`clearCareerGoal` writes `profiles.career_goal` (+ `career`).
2. Career/card surfaces redirect to the Guide tab.
3. Guide tab re-fetches `getProfile` on focus/mount → renders the current goal.
4. (Round 3) the Guide's Generate button will read `career_goal` + `career` to build the roadmap.

## Error handling
- Goal writes use the existing `try/catch` + `authErrorMessage(err, fallback)` + `Alert` convention. A failed set/clear shows a friendly alert; the UI does not assume success.
- `getProfile` already returns `null` on error; the Guide tab treats `null` profile as "no goal" and stays usable.
- Empty/whitespace-only text in the Guide box is ignored (no write), matching the `MajorsInput` add behavior.

## Testing / verification
- **No test harness** in this project (Expo Go). Per-task gate: `npx tsc --noEmit` + `npx eslint <changed files>`.
- **Device checkpoints** (Expo Go via `npx expo start --tunnel`) after each phase — the primary verification.

## Phases & checkpoints
- **Phase A** — migration + `Profile` type + `setCareerGoal`/`clearCareerGoal`. → **Checkpoint A:** owner applies the one-column migration.
- **Phase B** — Guide tab: display goal, text-box set, clear. → **Checkpoint B (device).**
- **Phase C** — Goal button on `career.tsx` + Search `CareerCard`, with redirect. → **Checkpoint C (device).**
- Then final whole-branch review → merge to `main` (trunk-style).

## Out of scope (deferred)
- Round 3 roadmap generation / "Generate my path".
- Career specializations (nested specific careers + their own goal buttons).
- Free-text ↔ catalog auto-matching.
- Goal history / multiple goals.

## Branch
`feat/guide-goal-setting` (off `main`). Owner owns migrations. Lands on `main` when done; collaborator syncs `main` in.
