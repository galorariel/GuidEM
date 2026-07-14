# Round 2 — Career Goal Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user set one active career goal (from a catalog career or free text) and see it on the Guide tab, as the foundation the Round 3 roadmap will target.

**Architecture:** The goal lives on the existing per-user `profiles` row: a new `career_goal` text column (the human title) plus the existing `career` column (optional catalog id). Two thin helpers wrap `upsertProfile`. Three surfaces set it (career detail, Search cards, Guide text box); catalog surfaces redirect to the Guide tab, which re-fetches on focus and displays it.

**Tech Stack:** Expo SDK 54 / React Native 0.81, expo-router 6 (typed routes experiment ON), Supabase (`@supabase/supabase-js`), TypeScript strict. Runs in Expo Go.

## Global Constraints

- Runs in **Expo Go** — no native modules / dev build.
- Supabase config from env only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`); never hardcode.
- **No test harness exists.** Per-task gate: `npx tsc --noEmit` clean AND `npx eslint <changed files>` clean. Behavior is verified at device checkpoints (Expo Go), not unit tests. Do NOT add a test framework or write tests.
- A **goal is distinct from ♥/save**: ♥ writes the `saved` table (considering list); the goal writes `profiles`. Both can apply to the same career.
- **One active goal per user**; setting replaces the previous; clearing nulls it.
- Migrations are **additive only**, applied by the owner to the shared Supabase; existing `profiles` RLS (`profiles_*_own`, keyed `auth.uid() = id`) already covers new columns — no policy change.
- Reuse existing utilities: `upsertProfile`/`getProfile` (`services/supabase.ts`), `useAuth()` (`hooks/AuthContext.tsx`), `authErrorMessage` (`services/authErrors.ts`), `CustomButton`/`CustomInput` (`components/`), `constants/theme` (`colors`, `fonts`).
- expo-router typed routes: casting non-typed `router` targets `as any` is the established repo pattern (e.g. `` router.push(`/career?id=${id}` as any) ``) — keep it.
- Goal state encoding on `profiles`: free-text → `{ career_goal: "<text>", career: null }`; catalog → `{ career_goal: "<title>", career: "<id>" }`; none → `{ career_goal: null, career: null }`.

---

### Task 1: Data model — migration, `Profile` type, goal helpers

**Files:**
- Create: `supabase/migrations/20260714010000_career_goal.sql`
- Modify: `services/supabase.ts` (Profile type + two new helpers)

**Interfaces:**
- Consumes: existing `upsertProfile(userId, data: Partial<Omit<Profile,"id">>)`.
- Produces (later tasks rely on these exact signatures):
  - `Profile.career_goal: string | null`
  - `setCareerGoal(userId: string, title: string, careerId?: string | null): Promise<void>`
  - `clearCareerGoal(userId: string): Promise<void>`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260714010000_career_goal.sql`:

```sql
-- Round 2 (AI Guide): the user's single active career goal title.
-- Additive; the existing profiles.career column holds the OPTIONAL catalog
-- career id the goal points to (null for a free-text goal). Existing
-- profiles RLS already covers this column.
alter table public.profiles
  add column if not exists career_goal text;
```

- [ ] **Step 2: Add `career_goal` to the `Profile` type**

In `services/supabase.ts`, in the `Profile` type, add the field next to `career`:

```ts
  career: string | null; // catalog career id the goal points to (null = free-text goal)
  career_goal: string | null; // active goal's human-readable title (null = no goal)
```

- [ ] **Step 3: Add the goal helpers**

In `services/supabase.ts`, after `upsertProfile` (or with the other profile helpers), add:

```ts
// ---- Career goal (Round 2) -------------------------------------------------
// One active goal per user, stored on the profile row. `careerId` links to a
// catalog career when the goal was chosen from the catalog; null for a
// free-text goal.
export async function setCareerGoal(
  userId: string,
  title: string,
  careerId: string | null = null
): Promise<void> {
  await upsertProfile(userId, { career_goal: title, career: careerId });
}

export async function clearCareerGoal(userId: string): Promise<void> {
  await upsertProfile(userId, { career_goal: null, career: null });
}
```

- [ ] **Step 4: Gate — typecheck + lint**

Run: `npx tsc --noEmit` → expect clean (exit 0).
Run: `npx eslint services/supabase.ts` → expect clean (exit 0).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260714010000_career_goal.sql services/supabase.ts
git commit -m "feat(db): add profiles.career_goal + setCareerGoal/clearCareerGoal helpers"
```

**➡️ CHECKPOINT A (owner):** apply the migration in the Supabase SQL editor and confirm `profiles.career_goal` (nullable text) exists. This gates the device checkpoints below (the app reads/writes it).

---

### Task 2: Guide tab — display, set (text box), clear

**Files:**
- Modify (rewrite): `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `getProfile`, `setCareerGoal`, `clearCareerGoal` (`services/supabase.ts`); `authErrorMessage` (`services/authErrors.ts`); `CustomButton`; `useFocusEffect` (from `expo-router`).
- Produces: the Guide tab is the redirect target for Task 3.

Re-fetch on focus (not just mount) so a goal set from another surface shows immediately when Task 3 navigates here.

- [ ] **Step 1: Replace `app/(tabs)/index.tsx` with the goal-aware Guide**

```tsx
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { colors, fonts } from "../../constants/theme";
import { useAuth } from "../../hooks/AuthContext";
import { authErrorMessage } from "../../services/authErrors";
import { clearCareerGoal, getProfile, setCareerGoal } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [goalTitle, setGoalTitle] = useState<string | null>(null);
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const name = (user?.user_metadata?.full_name as string) || "Student";

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const profile = await getProfile(user.id);
    setGoalTitle(profile?.career_goal ?? null);
    setGoalCareerId(profile?.career ?? null);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSet = async () => {
    const t = draft.trim();
    if (!t || !user) return;
    setBusy(true);
    try {
      await setCareerGoal(user.id, t); // free-text goal, no catalog link
      setDraft("");
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't set goal", authErrorMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await clearCareerGoal(user.id);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't clear goal", authErrorMessage(err, "Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />
      ) : (
        <>
          {goalTitle ? (
            <View style={styles.card}>
              <Text style={styles.label}>Your goal</Text>
              <Text style={styles.title}>{goalTitle}</Text>
              {goalCareerId ? (
                <CustomButton
                  title="View career"
                  onPress={() => router.push(`/career?id=${goalCareerId}` as any)}
                />
              ) : null}
              <CustomButton title="Clear goal" onPress={handleClear} disabled={busy} style={styles.clearBtn} />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.label}>{goalTitle ? "Change your goal" : "Set your goal"}</Text>
            <Text style={styles.body}>
              {goalTitle
                ? "Type a new goal to replace it, or browse Search to pick a career."
                : "Type the career you want to work toward, or browse Search to pick one."}
            </Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="e.g. AI Developer at Google"
              placeholderTextColor={colors.muted}
              onSubmitEditing={handleSet}
            />
            <CustomButton title="Set goal" onPress={handleSet} disabled={busy || !draft.trim()} />
          </View>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>Your roadmap</Text>
        <Text style={styles.body}>A personalized, step-by-step plan to reach your goal — coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 70, backgroundColor: colors.bg },
  h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.heading, marginBottom: 18 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontFamily: fonts.bodyBold, color: colors.accent, marginBottom: 4 },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.heading, marginBottom: 6 },
  body: { fontFamily: fonts.body, color: colors.heading, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 10, fontFamily: fonts.body, color: colors.heading },
  clearBtn: { backgroundColor: colors.muted },
});
```

Notes: the old `getCareer`/`Career` import is intentionally gone — the goal card shows the stored `career_goal` title directly; catalog data isn't hydrated here. The old "Go to Questionnaire" prompt is replaced by the set-goal card.

- [ ] **Step 2: Gate — typecheck + lint**

Run: `npx tsc --noEmit` → clean.
Run: `npx eslint "app/(tabs)/index.tsx"` → clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat(guide): show/set/clear career goal on the Guide tab"
```

**📱 CHECKPOINT B (device):** on the Guide tab, type a goal → Set → it appears under "Your goal"; Clear removes it; typing a new one replaces it. (Requires Checkpoint A applied.)

---

### Task 3: Goal button on career detail + Search cards (set → redirect)

**Files:**
- Modify: `components/CareerCard.tsx` (add `isGoal`/`onSetGoal` props + a flag glyph)
- Modify: `app/(tabs)/search.tsx` (load current goal id, wire `onSetGoal`, redirect)
- Modify: `app/career.tsx` (goal button in header, set + redirect, show goal state)

**Interfaces:**
- Consumes: `setCareerGoal` (`services/supabase.ts`), `getProfile`, `authErrorMessage`, `useAuth`.
- Produces: none downstream (final UI task).

- [ ] **Step 1: Add goal props to `CareerCard`**

In `components/CareerCard.tsx`, extend `Props` and the row. Replace the `Props` type and the component body's `<View style={styles.row}>…</View>` block:

```tsx
type Props = {
  item: { id: string; title: string; description: string };
  onPress: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  isGoal?: boolean;
  onSetGoal?: () => void;
};

export default function CareerCard({ item, onPress, isSaved, onToggleSave, isGoal, onSetGoal }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.actions}>
          {onSetGoal ? (
            <Pressable onPress={onSetGoal} hitSlop={10}>
              <Text style={[styles.goal, isGoal && styles.goalActive]}>{isGoal ? "⚑" : "⚐"}</Text>
            </Pressable>
          ) : null}
          {onToggleSave ? (
            <Pressable onPress={onToggleSave} hitSlop={10}>
              <Text style={styles.heart}>{isSaved ? "♥" : "♡"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={2} style={styles.meta}>{item.description}</Text>
    </Pressable>
  );
}
```

Add these styles to the `StyleSheet` (keep the rest):

```tsx
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  goal: { fontSize: 18, color: colors.muted },
  goalActive: { color: colors.button },
```

- [ ] **Step 2: Wire the goal action in Search**

In `app/(tabs)/search.tsx`:

(a) Replace the supabase import line to add `getProfile` and `setCareerGoal`:
```tsx
import { addSaved, getProfile, getSavedActivityIds, getSavedIds, removeSaved, setCareerGoal } from "../../services/supabase";
```

(b) Add goal state near the other `useState`s:
```tsx
  const [goalCareerId, setGoalCareerId] = useState<string | null>(null);
```

(c) In the existing `useEffect(() => { … }, [user])` that loads saved ids, also load the current goal id:
```tsx
  useEffect(() => {
    if (!user) { setSavedIds([]); setSavedCareerIds([]); setGoalCareerId(null); return; }
    getSavedActivityIds(user.id).then(setSavedIds);
    getSavedIds(user.id, "career").then(setSavedCareerIds);
    getProfile(user.id).then((p) => setGoalCareerId(p?.career ?? null));
  }, [user]);
```

(d) Add a handler next to `toggleSaveCareer`:
```tsx
  const setGoalCareer = async (id: string, title: string) => {
    if (!user) { router.push("/sign-in"); return; }
    await setCareerGoal(user.id, title, id);
    router.navigate("/(tabs)" as any); // jump to the Guide tab
  };
```

(e) In the careers `FlatList` `renderItem`, pass the goal props to `CareerCard`:
```tsx
            <CareerCard
              item={item}
              isSaved={savedCareerIds.includes(item.id)}
              onToggleSave={user ? () => toggleSaveCareer(item.id) : undefined}
              isGoal={goalCareerId === item.id}
              onSetGoal={user ? () => setGoalCareer(item.id, item.title) : undefined}
              onPress={() => router.push(`/career?id=${item.id}` as any)}
            />
```

- [ ] **Step 3: Add the goal button to career detail**

In `app/career.tsx`:

(a) Add imports — `setCareerGoal` + `getProfile` from supabase, and `Alert` from react-native:
```tsx
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
```
```tsx
import { addSaved, getProfile, getSavedIds, removeSaved, setCareerGoal } from "../services/supabase";
import { authErrorMessage } from "../services/authErrors";
```

(b) Add `isGoal` state next to `isSaved`:
```tsx
  const [isGoal, setIsGoal] = useState(false);
```

(c) In the existing data-load `useEffect`, after the saved-ids block, also check whether this career is the current goal:
```tsx
      if (user && c) {
        const ids = await getSavedIds(user.id, "career");
        setIsSaved(ids.includes(c.id));
        const profile = await getProfile(user.id);
        setIsGoal(profile?.career === c.id);
      }
```

(d) Add a set-goal handler next to `toggleSave`:
```tsx
  const chooseGoal = async () => {
    if (!career || !user) return;
    try {
      await setCareerGoal(user.id, career.title, career.id);
      router.replace("/(tabs)" as any); // redirect to the Guide tab
    } catch (err: any) {
      Alert.alert("Couldn't set goal", authErrorMessage(err, "Please try again."));
    }
  };
```

(e) Replace the header row's action area so the goal flag sits next to the heart:
```tsx
      <View style={styles.headerRow}>
        <Text style={styles.title}>{career.title}</Text>
        {user ? (
          <View style={styles.actions}>
            <Pressable onPress={chooseGoal} hitSlop={10}>
              <Text style={[styles.goal, isGoal && styles.goalActive]}>{isGoal ? "⚑" : "⚐"}</Text>
            </Pressable>
            <Pressable onPress={toggleSave} hitSlop={10}>
              <Text style={styles.heart}>{isSaved ? "♥" : "♡"}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
```

(f) Add these styles to the `StyleSheet`:
```tsx
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  goal: { fontSize: 26, color: colors.muted },
  goalActive: { color: colors.button },
```

- [ ] **Step 4: Gate — typecheck + lint**

Run: `npx tsc --noEmit` → clean.
Run: `npx eslint components/CareerCard.tsx "app/(tabs)/search.tsx" app/career.tsx` → clean.

- [ ] **Step 5: Commit**

```bash
git add components/CareerCard.tsx "app/(tabs)/search.tsx" app/career.tsx
git commit -m "feat(guide): set career as goal from detail + Search cards, redirect to Guide"
```

**📱 CHECKPOINT C (device):** open a career detail → tap the flag → land on Guide with that career as the goal (with a working "View career" link); repeat from a Search card. The flag shows filled (⚑) for the current goal. ♥ still works independently.

---

## Verification

1. **DB:** after Task 1's migration, `profiles.career_goal` exists (nullable text); no RLS/policy change; existing rows unaffected (null goal).
2. **Typecheck/lint** per task: `npx tsc --noEmit` clean, `npx eslint <changed files>` clean.
3. **Device** (`npx expo start --tunnel`, Expo Go):
   - Guide tab, no goal → set-goal card shown. Type "AI Developer at Google" → Set → appears under "Your goal" (no "View career" link, since free-text). Clear → back to prompt.
   - Search → careers → tap the flag on a card → lands on Guide showing that career's title as the goal, with a working "View career" link to its detail.
   - Open a career detail → flag shows filled (⚑) for the current goal, outline (⚐) otherwise → tap → sets + redirects to Guide.
   - ♥ a career and set it as goal → both independent (Profile "considering" list still shows ♥; goal shows on Guide).
   - Sign out / back in → goal persists (row in `profiles.career_goal`).

## Out of scope (deferred)
- Round 3 roadmap generation / "Generate my path" (the placeholder stays).
- Career specializations.
- Free-text ↔ catalog auto-matching.
