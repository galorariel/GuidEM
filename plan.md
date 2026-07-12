# Supabase Migration + Auth + Career Tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the app from Appwrite to Supabase with fully working email/password auth, and restructure the tabs to a Guide-first layout with a new Career Questionnaire tab and a Career Guide tab (skeletons — no matching logic yet).

**Architecture:** A single Supabase client (`services/supabase.ts`) replaces the two-client Appwrite setup. `hooks/AuthContext.tsx` wraps Supabase Auth and exposes `user`/`session`/`isLoading`/`signIn`/`signUp`/`signOut`. Per-user data (profile, questionnaire, saved) lives in three RLS-protected Postgres tables; careers/activities stay hardcoded in `data/*.tsx`. The one-time onboarding gate is removed; the questionnaire becomes a re-editable tab.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, TypeScript, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `@expo/vector-icons` (already present).

## Global Constraints

- Node ≥ 20; use the existing Expo toolchain (`npx expo`). Do not add a native/dev-build step — everything must keep running in **Expo Go**.
- Supabase config comes from env vars **only**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never hardcode them in source (unlike the old `services/appwrite.ts`).
- `career` stored in `profiles.career` is a **career id** matching `data/careers.tsx` (e.g. `"1"`), not a title.
- Theme colors stay as the existing palette: background `#e2f5ff`, heading `#203b60`, accent `#107c8f`. Fonts `Poppins_700Bold` / `Inter_400Regular` / `Inter_700Bold`.
- **No career matching/scoring logic** in this plan — the Questionnaire saves answers; the Guide shows the set career or a placeholder. Logic is a later effort.
- **Testing note:** the repo has no test harness and this is a UI skeleton, so each task's gate is: `npx tsc --noEmit` passes (no new errors) + `npm run lint` clean, and the final task runs the app end-to-end. We are intentionally not adding Jest here; unit tests arrive with the scoring logic later.
- Commit after each task with the message shown in its final step.

---

## File Structure

**Created:**
- `supabase/migrations/20260712000000_init.sql` — schema + RLS + profile trigger (already written)
- `supabase/seed.sql` — optional test seed (already written)
- `services/supabase.ts` — single Supabase client + typed data helpers
- `app/(tabs)/questionnaire.tsx` — Career Questionnaire tab

**Modified:**
- `.env` — swap Appwrite vars for Supabase vars
- `package.json` — add supabase deps, drop `appwrite`; fix `name`
- `hooks/AuthContext.tsx` — rewrite for Supabase (single client, fixes sign-out bug)
- `app/_layout.tsx` — redirect signed-in users to `/(tabs)` (remove questionnaire gate)
- `app/(tabs)/_layout.tsx` — 4 tabs (Guide, Questionnaire, Saved, Profile) + icons
- `app/(tabs)/index.tsx` — becomes the **Guide** (set career + search box + "coming soon")
- `app/(tabs)/saved.tsx`, `app/(tabs)/profile.tsx` — use Supabase; fix profile sign-out
- `app/results.tsx`, `app/detail.tsx` — save/unsave via Supabase
- `app/personal-details.tsx` — read profile/questionnaire via Supabase
- `app/sign-in.tsx`, `app/sign-up.tsx` — Supabase auth + profile upsert

**Deleted:**
- `app/questionnare.tsx` (onboarding gate — content moves to the tab)
- `services/appwrite.ts`

---

## Task 1: Provision the Supabase project (manual) + env vars

**Files:**
- Modify: `.env`

Manual setup by the owner in the Supabase dashboard, then wire env vars.

- [ ] **Step 1: Create the project & apply schema**
  1. Create a project at https://supabase.com (note the region).
  2. **SQL Editor → New query →** paste the contents of `supabase/migrations/20260712000000_init.sql` → **Run**. Confirm 3 tables (`profiles`, `questionnaire`, `saved`) exist under **Table Editor**.
  3. **Authentication → Providers → Email:** ensure Email is enabled, and **turn OFF "Confirm email"** (dev convenience so signup logs in immediately in Expo Go).

- [ ] **Step 2: Grab credentials**
  Project **Settings → API**: copy the **Project URL** and the **anon public** key.

- [ ] **Step 3: Write `.env`** (replace the whole file)

```
# Supabase (consumed by services/supabase.ts)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

- [ ] **Step 4: Commit** (the `.env` is git-ignored only for `*.local`; confirm it's not committed if it contains secrets — the anon key is safe to expose to clients, but keep the file untracked if you prefer). Commit any tracked changes:

```bash
git add supabase/ plan.md
git commit -m "chore: add supabase schema, seed, and implementation plan"
```

---

## Task 2: Install dependencies and create the Supabase client

**Files:**
- Modify: `package.json`
- Create: `services/supabase.ts`

**Interfaces:**
- Produces: `supabase` client; types `Profile`, `Questionnaire`, `SavedRow`; helpers
  `getProfile(userId: string): Promise<Profile | null>`,
  `upsertProfile(userId: string, data: Partial<Omit<Profile,'id'>>): Promise<void>`,
  `getQuestionnaire(userId: string): Promise<Questionnaire | null>`,
  `upsertQuestionnaire(userId: string, data: Omit<Questionnaire,'user_id'>): Promise<void>`,
  `getSavedActivityIds(userId: string): Promise<string[]>`,
  `addSaved(userId: string, itemId: string, itemType?: string): Promise<void>`,
  `removeSaved(userId: string, itemId: string, itemType?: string): Promise<void>`.

- [ ] **Step 1: Install deps**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Create `services/supabase.ts`**

```typescript
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no browser redirect flow in RN
  },
});

// ---- Types (mirror supabase/migrations/20260712000000_init.sql) ------------
export type Profile = {
  id: string;
  full_name: string;
  role: string;
  school: string;
  grade_level: string;
  city: string;
  career: string | null; // career id from data/careers.tsx
  created_at: string;
  updated_at: string;
};

export type Questionnaire = {
  user_id: string;
  majors: string;
  career_in_mind: string;
  hobbies: string;
  parents_jobs: string;
  dream_job: string;
  volunteer_interest: string;
  psychometric_grade: string;
  updated_at: string;
};

export type SavedRow = {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  created_at: string;
};

// ---- Profile ---------------------------------------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("getProfile", error);
    return null;
  }
  return data;
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<Profile, "id">>
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("upsertProfile", error);
    throw error;
  }
}

// ---- Questionnaire ---------------------------------------------------------
export async function getQuestionnaire(
  userId: string
): Promise<Questionnaire | null> {
  const { data, error } = await supabase
    .from("questionnaire")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("getQuestionnaire", error);
    return null;
  }
  return data;
}

export async function upsertQuestionnaire(
  userId: string,
  data: Omit<Questionnaire, "user_id" | "updated_at">
): Promise<void> {
  const { error } = await supabase
    .from("questionnaire")
    .upsert(
      { user_id: userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error("upsertQuestionnaire", error);
    throw error;
  }
}

// ---- Saved -----------------------------------------------------------------
export async function getSavedActivityIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_type", "activity");
  if (error) {
    console.error("getSavedActivityIds", error);
    return [];
  }
  return (data ?? []).map((r) => r.item_id as string);
}

export async function addSaved(
  userId: string,
  itemId: string,
  itemType = "activity"
): Promise<void> {
  const { error } = await supabase
    .from("saved")
    .upsert(
      { user_id: userId, item_type: itemType, item_id: itemId },
      // ignoreDuplicates -> ON CONFLICT DO NOTHING (idempotent add); the `saved`
      // table has no RLS update policy, so we must avoid the UPDATE arm.
      { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("addSaved", error);
    throw error;
  }
}

export async function removeSaved(
  userId: string,
  itemId: string,
  itemType = "activity"
): Promise<void> {
  const { error } = await supabase
    .from("saved")
    .delete()
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId);
  if (error) {
    console.error("removeSaved", error);
    throw error;
  }
}
```

- [ ] **Step 3: Fix `package.json` name** — change `"name": "run"` to `"name": "student-guidance-app"`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: no errors from `services/supabase.ts` (screens still referencing Appwrite may error until later tasks — that's expected; note them and move on).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json services/supabase.ts
git commit -m "feat: add supabase client and data helpers"
```

---

## Task 3: Rewrite the auth context for Supabase

**Files:**
- Modify: `hooks/AuthContext.tsx`

**Interfaces:**
- Consumes: `supabase` from `services/supabase.ts`.
- Produces: `useAuth()` returning `{ user, session, isLoading, signIn(email,password), signUp(email,password,fullName), signOut() }`. `user` is the Supabase `User | null` (`user.id`, `user.email`, `user.user_metadata.full_name`). `signUp` returns the created `User`.

- [ ] **Step 1: Replace `hooks/AuthContext.tsx` entirely**

```typescript
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data.user;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` — no errors in `hooks/AuthContext.tsx`.
- [ ] **Step 3: Commit**

```bash
git add hooks/AuthContext.tsx
git commit -m "feat: supabase auth context (single client, onAuthStateChange)"
```

---

## Task 4: Update sign-in and sign-up screens

**Files:**
- Modify: `app/sign-in.tsx`, `app/sign-up.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3), `upsertProfile` (Task 2).

- [ ] **Step 1: `app/sign-in.tsx`** — only the post-sign-in redirect changes. Replace the `handleSignIn` body so it navigates to the tabs on success:

```typescript
  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Sign in error", err);
      Alert.alert("Sign in failed", err?.message || "Check email/password");
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 2: `app/sign-up.tsx`** — replace the Appwrite import and `handleSubmit`.
  - Remove: `import { createUserProfile } from "../services/appwrite";`
  - Add: `import { upsertProfile } from "../services/supabase";`
  - Replace `handleSubmit`:

```typescript
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const name = username.trim() || "Student";
      const created = await signUp(email, password, name);
      if (created) {
        // profile row is auto-created by the DB trigger; fill in extra fields
        await upsertProfile(created.id, {
          full_name: name,
          role: role.trim(),
          school: school.trim(),
        });
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Sign up error", err);
      Alert.alert("Sign up failed", err?.message || "Check your input");
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` — no errors in either screen.
- [ ] **Step 4: Commit**

```bash
git add app/sign-in.tsx app/sign-up.tsx
git commit -m "feat: sign-in/sign-up via supabase auth"
```

---

## Task 5: Remove the questionnaire gate from the root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1:** Change the redirect target and drop the `questionnare` screen. In `RootLayoutNav`, replace `router.replace('/questionnare');` with `router.replace('/(tabs)');`. Then delete the line `<Stack.Screen name='questionnare' />`.

- [ ] **Step 2: Verify** `npx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "refactor: route signed-in users straight to tabs"
```

---

## Task 6: Migrate the Saved tab to Supabase

**Files:**
- Modify: `app/(tabs)/saved.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `getSavedActivityIds` (Task 2).

- [ ] **Step 1: Replace `app/(tabs)/saved.tsx`**

```typescript
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import ActivityCard from "../../components/ActivityCard";
import { activities, type Activity } from "../../data/activities";
import { useAuth } from "../../hooks/AuthContext";
import { getSavedActivityIds } from "../../services/supabase";

export default function Saved() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = async () => {
    if (!user) {
      setSavedIds([]);
      setLoading(false);
      return;
    }
    try {
      setSavedIds(await getSavedActivityIds(user.id));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load saved items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  };

  const savedItems: Activity[] = savedIds
    .map((id) => activities.find((a) => a.id === id))
    .filter(Boolean) as Activity[];

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Saved</Text>
      {loading ? (
        <Text style={{ marginTop: 12 }}>Loading...</Text>
      ) : (
        <>
          <Text style={styles.sub}>You have saved {savedItems.length} items</Text>
          <FlatList
            data={savedItems}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <ActivityCard item={item} isSaved onPress={() => router.push(`/detail?id=${item.id}`)} />
            )}
            ListEmptyComponent={<Text style={{ marginTop: 12 }}>No saved items yet.</Text>}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60" },
  sub: { marginTop: 6, marginBottom: 14, fontFamily: "Inter_400Regular", color: "#107c8f" },
});
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/saved.tsx"
git commit -m "feat: saved tab via supabase"
```

---

## Task 7: Migrate save/unsave in results and detail

**Files:**
- Modify: `app/results.tsx`, `app/detail.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `getSavedActivityIds`, `addSaved`, `removeSaved` (Task 2).

- [ ] **Step 1: `app/results.tsx`**
  - Replace the Appwrite import line (`import { COL_SAVED, ... } from "../services/appwrite";`) with:
    ```typescript
    import { useAuth } from "../hooks/AuthContext";
    import { addSaved, getSavedActivityIds, removeSaved } from "../services/supabase";
    ```
  - Delete the `SavedDoc` type and the `savedDocs`/`meId`/`loadingSaved` state. Add near the top of the component:
    ```typescript
    const { user } = useAuth();
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(true);
    ```
  - Replace the load `useEffect` (the one calling `getMe`/`listDocuments`) with:
    ```typescript
    useEffect(() => {
      (async () => {
        if (!user) {
          setSavedIds([]);
          setLoadingSaved(false);
          return;
        }
        setSavedIds(await getSavedActivityIds(user.id));
        setLoadingSaved(false);
      })();
    }, [user]);
    ```
  - Delete the `const savedIds = useMemo(...)` line (now redundant — `savedIds` is state).
  - Replace `toggleSave`:
    ```typescript
    const toggleSave = async (activityId: string) => {
      if (!user) {
        Alert.alert("Not signed in", "Please sign in first.");
        router.replace("/sign-in");
        return;
      }
      try {
        if (savedIds.includes(activityId)) {
          await removeSaved(user.id, activityId);
          setSavedIds((prev) => prev.filter((id) => id !== activityId));
        } else {
          await addSaved(user.id, activityId);
          setSavedIds((prev) => [...prev, activityId]);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Could not update saved list.");
      }
    };
    ```
  - In the `ActivityCard` render, change `onToggleSave={meId ? ... : undefined}` to `onToggleSave={user ? () => toggleSave(item.item.id) : undefined}`.

- [ ] **Step 2: `app/detail.tsx`**
  - Replace the Appwrite import with:
    ```typescript
    import { useAuth } from "../hooks/AuthContext";
    import { addSaved, getSavedActivityIds, removeSaved } from "../services/supabase";
    ```
  - Delete the `SavedDoc` type. Replace `meId`/`savedDocId` state with:
    ```typescript
    const { user } = useAuth();
    const [isSaved, setIsSaved] = useState(false);
    ```
  - Replace the load `useEffect` body with:
    ```typescript
    useEffect(() => {
      (async () => {
        if (!user || !activity) {
          setLoading(false);
          return;
        }
        const ids = await getSavedActivityIds(user.id);
        setIsSaved(ids.includes(activity.id));
        setLoading(false);
      })();
    }, [id, user]);
    ```
  - Replace `saveActivity`/`unsaveActivity` with a single toggle:
    ```typescript
    const toggleSave = async () => {
      if (!activity) return;
      if (!user) {
        Alert.alert("Not signed in", "Please sign in first.");
        return;
      }
      try {
        if (isSaved) {
          await removeSaved(user.id, activity.id);
          setIsSaved(false);
        } else {
          await addSaved(user.id, activity.id);
          setIsSaved(true);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Could not update saved list.");
      }
    };
    ```
  - Remove the old `const isSaved = !!savedDocId;` line. Update the Save button:
    ```typescript
    <CustomButton
      title={loading ? "Loading..." : isSaved ? "Unsave" : "Save"}
      onPress={toggleSave}
      disabled={loading || !user}
    />
    ```

- [ ] **Step 3: Verify** `npx tsc --noEmit`.
- [ ] **Step 4: Commit**

```bash
git add app/results.tsx app/detail.tsx
git commit -m "feat: save/unsave via supabase in results and detail"
```

---

## Task 8: Migrate profile and personal-details

**Files:**
- Modify: `app/(tabs)/profile.tsx`, `app/personal-details.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `getProfile`, `getQuestionnaire` (Task 2).

- [ ] **Step 1: Replace `app/(tabs)/profile.tsx`**

```typescript
import { router } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import { useAuth } from "../../hooks/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || "Student";
  const email = user.email || "-";

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not sign out.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Profile</Text>
      <Text style={styles.line}>Name: {name}</Text>
      <Text style={styles.line}>Email: {email}</Text>
      <View style={{ marginTop: 18 }}>
        <Text style={styles.menu} onPress={() => router.push("/personal-details")}>
          • Personal Information
        </Text>
      </View>
      <CustomButton title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 60, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 14 },
  line: { marginTop: 6, fontFamily: "Inter_400Regular", color: "#107c8f" },
  menu: { marginTop: 10, fontFamily: "Inter_700Bold", color: "#107c8f" },
});
```

- [ ] **Step 2: Replace `app/personal-details.tsx`**

```typescript
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../hooks/AuthContext";
import { getProfile, getQuestionnaire, type Profile, type Questionnaire } from "../services/supabase";

export default function PersonalDetails() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    (async () => {
      setProfile(await getProfile(user.id));
      setQuestionnaire(await getQuestionnaire(user.id));
    })();
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || "Student";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 22 }}>
      <Text style={styles.h1}>Personal Information</Text>
      <Text style={styles.field}>Name: {name}</Text>
      <Text style={styles.field}>Email: {user.email}</Text>
      {profile && (
        <>
          <Text style={styles.field}>Role: {profile.role || "-"}</Text>
          <Text style={styles.field}>School: {profile.school || "-"}</Text>
        </>
      )}
      {questionnaire && (
        <>
          <Text style={styles.h2}>Questionnaire Answers</Text>
          <Text style={styles.field}>Majors: {questionnaire.majors}</Text>
          <Text style={styles.field}>Career in Mind: {questionnaire.career_in_mind}</Text>
          <Text style={styles.field}>Hobbies: {questionnaire.hobbies}</Text>
          <Text style={styles.field}>Parents' Jobs: {questionnaire.parents_jobs}</Text>
          <Text style={styles.field}>Dream Job: {questionnaire.dream_job}</Text>
          <Text style={styles.field}>Volunteer Interest: {questionnaire.volunteer_interest}</Text>
          <Text style={styles.field}>Psychometric Grade: {questionnaire.psychometric_grade}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 16 },
  h2: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#203b60", marginTop: 20, marginBottom: 8 },
  field: { marginVertical: 4, fontFamily: "Inter_400Regular", color: "#107c8f" },
});
```

- [ ] **Step 3: Verify** `npx tsc --noEmit`.
- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/profile.tsx" app/personal-details.tsx
git commit -m "feat: profile + personal-details via supabase; fix sign-out"
```

---

## Task 9: New tab layout (4 tabs + icons)

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace `app/(tabs)/_layout.tsx`**

```typescript
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#107c8f",
        tabBarInactiveTintColor: "#203b60",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Guide",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="questionnaire"
        options={{
          title: "Questionnaire",
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat: 4-tab layout with icons (Guide first)"
```

---

## Task 10: Guide tab (home)

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `getProfile` (Task 2), `careers` from `data/careers.tsx`.

Behavior: greet the user; if `profile.career` is set, show that career (title + a short line) with a button to open its detail; otherwise show a placeholder prompting them to take the questionnaire. Keep the activity search box → `/results`. Add a "Personalized guide — coming soon" note.

- [ ] **Step 1: Replace `app/(tabs)/index.tsx`**

```typescript
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import { careers } from "../../data/careers";
import { useAuth } from "../../hooks/AuthContext";
import { getProfile } from "../../services/supabase";

export default function Guide() {
  const { user } = useAuth();
  const [careerId, setCareerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const name = (user?.user_metadata?.full_name as string) || "Student";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await getProfile(user.id);
      setCareerId(profile?.career ?? null);
    })();
  }, [user]);

  const career = careerId ? careers.find((c) => c.id === careerId) : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Hi {name},{"\n"}your career guide</Text>

      {career ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your career path</Text>
          <Text style={styles.cardTitle}>{career.title}</Text>
          <Text style={styles.cardBody} numberOfLines={3}>{career.description}</Text>
          <CustomButton
            title="View career details"
            onPress={() => router.push({ pathname: "/career", params: { id: career.id } })}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>No career set yet</Text>
          <Text style={styles.cardBody}>
            Take the questionnaire to start building your personalized career guide.
          </Text>
          <CustomButton title="Go to Questionnaire" onPress={() => router.push("/(tabs)/questionnaire")} />
        </View>
      )}

      <Text style={styles.comingSoon}>
        Personalized guide (based on your location, age, and studies) — coming soon.
      </Text>

      <Text style={styles.searchTitle}>Explore activities & careers</Text>
      <CustomInput value={query} onChangeText={setQuery} placeholder="Search activities or careers" />
      <CustomButton
        title="Search"
        onPress={() => router.push(`/results?query=${encodeURIComponent(query)}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, paddingTop: 70, backgroundColor: "#e2f5ff" },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 18 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontFamily: "Inter_700Bold", color: "#107c8f", marginBottom: 4 },
  cardTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 6 },
  cardBody: { fontFamily: "Inter_400Regular", color: "#203b60", marginBottom: 10 },
  comingSoon: { fontFamily: "Inter_400Regular", color: "#107c8f", fontStyle: "italic", marginBottom: 22 },
  searchTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 10 },
});
```

- [ ] **Step 2: Verify** `npx tsc --noEmit`.
- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: guide tab (set career + search + coming-soon placeholder)"
```

---

## Task 11: Career Questionnaire tab

**Files:**
- Create: `app/(tabs)/questionnaire.tsx`
- Delete: `app/questionnare.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `getQuestionnaire`, `upsertQuestionnaire` (Task 2).

Behavior: load any existing answers into the form (re-editable), save via upsert, confirm with an alert. No scoring/matching logic.

- [ ] **Step 1: Create `app/(tabs)/questionnaire.tsx`**

```typescript
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import { useAuth } from "../../hooks/AuthContext";
import { getQuestionnaire, upsertQuestionnaire } from "../../services/supabase";

export default function QuestionnaireTab() {
  const { user } = useAuth();
  const [majors, setMajors] = useState("");
  const [careerInMind, setCareerInMind] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [parentsJobs, setParentsJobs] = useState("");
  const [dreamJob, setDreamJob] = useState("");
  const [volunteerInterest, setVolunteerInterest] = useState("");
  const [psychometricGrade, setPsychometricGrade] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = await getQuestionnaire(user.id);
      if (q) {
        setMajors(q.majors);
        setCareerInMind(q.career_in_mind);
        setHobbies(q.hobbies);
        setParentsJobs(q.parents_jobs);
        setDreamJob(q.dream_job);
        setVolunteerInterest(q.volunteer_interest);
        setPsychometricGrade(q.psychometric_grade);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await upsertQuestionnaire(user.id, {
        majors,
        career_in_mind: careerInMind,
        hobbies,
        parents_jobs: parentsJobs,
        dream_job: dreamJob,
        volunteer_interest: volunteerInterest,
        psychometric_grade: psychometricGrade,
      });
      Alert.alert("Saved", "Your answers were saved.");
    } catch {
      Alert.alert("Error", "Could not save your answers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#e2f5ff" }} contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Career Questionnaire</Text>
      <Text style={styles.sub}>Fill this out to shape your career guide. You can edit it anytime.</Text>

      <CustomInput value={majors} onChangeText={setMajors} placeholder="Subjects / majors you like" />
      <CustomInput value={careerInMind} onChangeText={setCareerInMind} placeholder="Career in mind" />
      <CustomInput value={hobbies} onChangeText={setHobbies} placeholder="Hobbies" />
      <CustomInput value={parentsJobs} onChangeText={setParentsJobs} placeholder="Parents' jobs" />
      <CustomInput value={dreamJob} onChangeText={setDreamJob} placeholder="Dream job" />
      <CustomInput value={volunteerInterest} onChangeText={setVolunteerInterest} placeholder="Volunteering interest" />
      <CustomInput value={psychometricGrade} onChangeText={setPsychometricGrade} placeholder="Psychometric grade" />

      <CustomButton title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, paddingTop: 60, paddingBottom: 60 },
  h1: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#203b60", marginBottom: 6 },
  sub: { fontFamily: "Inter_400Regular", color: "#107c8f", marginBottom: 18 },
});
```

- [ ] **Step 2: Delete the old gate** — `git rm app/questionnare.tsx`.
- [ ] **Step 3: Verify** `npx tsc --noEmit`.
- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/questionnaire.tsx"
git commit -m "feat: career questionnaire tab (re-editable, supabase upsert)"
```

---

## Task 12: Remove Appwrite and clean up

**Files:**
- Delete: `services/appwrite.ts`
- Modify: `package.json`

- [ ] **Step 1: Confirm nothing imports Appwrite**

```bash
grep -rn "services/appwrite\|from \"appwrite\"\|from 'appwrite'" app hooks components services
```
Expected: no results. If any remain, fix them before continuing.

- [ ] **Step 2: Remove the file and dependency**

```bash
git rm services/appwrite.ts
npm uninstall appwrite
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` (clean) and `npm run lint` (clean).
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove appwrite client and dependency"
```

---

## Task 13: Run and verify end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

```bash
npx expo start
```
(Use `npx expo start --tunnel` if testing on a physical phone over a restrictive/corporate network.)

- [ ] **Step 2: Manual smoke test on device/simulator** — confirm each:
  1. App opens on **Sign In**.
  2. **Sign Up** with a new email → lands on the **Guide** tab (no email-confirmation wall, since it's disabled). In Supabase → Authentication → Users, the user exists; in Table Editor → `profiles`, a row exists with your name/role/school.
  3. Guide shows the "No career set yet" card (career is null).
  4. **Questionnaire** tab → fill fields → Save → "Saved" alert. Reopen the tab → fields persist (row in `questionnaire`).
  5. Search from Guide → results → heart an activity → it appears in **Saved** (row in `saved`); unheart removes it.
  6. **Profile** → Personal Information shows profile + questionnaire answers.
  7. **Sign Out** → returns to Sign In. Re-open the app → still signed out (session cleared). Sign back in → lands on Guide with saved data intact.

- [ ] **Step 3: Commit any final fixes discovered during the smoke test**, then the branch is ready for review/merge.

---

## Self-Review Notes (for the implementer)

- Every screen that imported `services/appwrite` is covered by a task (sign-in, sign-up, questionnare→tab, index, saved, profile, personal-details, results, detail). Task 12's grep is the backstop.
- The old `getMe().$id` / `me.name` / `me.email` become `user.id` / `user.user_metadata.full_name` / `user.email` under Supabase — applied consistently in every task.
- Questionnaire field renames (camelCase → snake_case) are consistent: `careerInMind`→`career_in_mind`, `parentsJobs`→`parents_jobs`, `daysjob`/`daysJob`→`dream_job`, `volunteerInterest`→`volunteer_interest`, `psychometricGrade`→`psychometric_grade`.
- `data/careers.tsx` career ids are strings (`"1"`…); `profiles.career` stores that string id.
```
