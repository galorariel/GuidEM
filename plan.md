# Student-Guidance_app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A clean three-pillar career app — **Career Search**, **Career Questionnaire**, **AI Career Guide** — backed by a real Supabase catalog, on top of the existing Supabase auth foundation.

**Architecture:** Single Supabase client (`services/supabase.ts`) for user data (`profiles`/`questionnaire`/`saved`) plus a new catalog (`careers`/`activities`/`career_activities`) read through a `services/catalog.ts` data layer. Four tabs: Guide / Search / Questionnaire / Profile. This round is **groundwork + skeletons**; recommendation scoring and the AI guide are deferred.

## Global Constraints

- Must keep running in **Expo Go** — no native/dev-build step.
- Supabase config from env vars only (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`); never hardcode.
- Catalog ids stay **text** ("1"…) so existing `profiles.career` and `saved.item_id` keep working with no schema change.
- `profiles.career` stores a career **id** (text), not a title.
- Catalog tables are **public-read** via RLS SELECT `using(true)`; no client writes (seed via SQL/service role).
- No test harness this round; per-task gate is `npx tsc --noEmit` + `npm run lint` clean for changed files. Final gate is the device smoke test. No TDD/RED-GREEN.
- One commit per task with the message in its final step.
- Execution interleaves **device-test checkpoints** (A–D) where the owner runs the app and comments before the next phase.

---

## Completed (Tasks 1–8) — do not redo

Supabase migration of the auth/data foundation is done and committed:
1. Supabase project provisioned; `profiles`/`questionnaire`/`saved` tables + RLS + profile-on-signup trigger (`supabase/migrations/20260712000000_init.sql`).
2. `services/supabase.ts` — single client + helpers: `getProfile`, `upsertProfile`, `getQuestionnaire`, `upsertQuestionnaire`, `getSavedActivityIds`, `addSaved` (idempotent), `removeSaved`.
3. `hooks/AuthContext.tsx` — Supabase auth (`useAuth()` → `{ user, session, isLoading, signIn, signUp, signOut }`; `user.id`, `user.email`, `user.user_metadata.full_name`).
4. `sign-in.tsx` / `sign-up.tsx` on Supabase (sign-up upserts profile).
5. Root layout routes signed-in users to `/(tabs)`.
6–8. Saved tab, results/detail save-logic, profile/personal-details migrated to Supabase.

The rest of this file (Tasks 9–21) supersedes the previous Tasks 9–13.

---

## Phase A — Catalog in Supabase

### Task 9: Catalog migration

**Files:** Create `supabase/migrations/20260713000000_catalog.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Public-read career/activity catalog. Text ids match the existing
-- profiles.career / saved.item_id references (no change to those tables).

-- array_to_string is non-IMMUTABLE; wrap it so it can be used in the
-- stored generated tsvector columns below.
create or replace function public.immutable_array_to_string(arr text[])
  returns text language sql immutable
  as $$ select array_to_string(arr, ' ') $$;

create table public.careers (
  id                   text primary key,
  title                text not null,
  description          text not null default '',
  required_education   text[] not null default '{}',
  required_skills      text[] not null default '{}',
  recommended_subjects text[] not null default '{}',
  salary_min           int,
  salary_max           int,
  salary_currency      text not null default '₪',
  salary_period        text not null default 'month',
  work_environment     text not null default '',
  demand_level         text not null default 'moderate'
                         check (demand_level in ('low','moderate','stable','high','very_high')),
  tags                 text[] not null default '{}',
  image_url            text,
  created_at           timestamptz not null default now(),
  search_vector        tsvector generated always as (
    to_tsvector('english',
      title || ' ' || description || ' ' ||
      public.immutable_array_to_string(required_skills) || ' ' ||
      public.immutable_array_to_string(recommended_subjects) || ' ' ||
      public.immutable_array_to_string(tags)
    )
  ) stored
);
create index careers_search_idx on public.careers using gin (search_vector);

create table public.activities (
  id              text primary key,
  title           text not null,
  category        text not null default '',
  location        text not null default '',
  price_amount    int not null default 0,
  price_currency  text not null default '₪',
  description     text not null default '',
  tags            text[] not null default '{}',
  image_url       text,
  created_at      timestamptz not null default now(),
  search_vector   tsvector generated always as (
    to_tsvector('english',
      title || ' ' || description || ' ' || category || ' ' ||
      public.immutable_array_to_string(tags)
    )
  ) stored
);
create index activities_search_idx on public.activities using gin (search_vector);

create table public.career_activities (
  career_id   text not null references public.careers (id) on delete cascade,
  activity_id text not null references public.activities (id) on delete cascade,
  primary key (career_id, activity_id)
);

alter table public.careers            enable row level security;
alter table public.activities         enable row level security;
alter table public.career_activities  enable row level security;

create policy "careers_public_read"    on public.careers           for select using (true);
create policy "activities_public_read" on public.activities        for select using (true);
create policy "career_acts_public_read" on public.career_activities for select using (true);
```

- [ ] **Step 2:** Owner applies it (Supabase SQL Editor or `supabase db push`). Verify the 3 tables appear in Table Editor.
- [ ] **Step 3: Commit** `git add supabase/migrations && git commit -m "feat: catalog schema (careers, activities, links) with fulltext + RLS"`

### Task 10: Catalog seed from existing arrays

**Files:** Create `supabase/seed_catalog.sql`

Transform the hardcoded arrays into INSERTs. Read `data/careers.tsx` (16) and `data/activities.tsx` (28) as the source.

- [ ] **Step 1: Transformation rules**
  - Careers: parse `salaryRange` (e.g. `"₪20,000 – ₪40,000 per month"`) → `salary_min=20000`, `salary_max=40000`; map `futureDemand` free-text → `demand_level` (contains "very high"→`very_high`, "high"→`high`, "moderate"→`moderate`, "stable"→`stable`, else `moderate`); `tags` = distinct lowercased words from `title` + `requiredSkills` + `recommendedHighSchoolSubjects` (strip parentheticals/punctuation). Map `requiredEducation`→`required_education`, `requiredSkills`→`required_skills`, `recommendedHighSchoolSubjects`→`recommended_subjects`, `workEnvironment`→`work_environment`.
  - Activities: `price_amount` = existing numeric `priceNumber`; `tags` = lowercased words from `title` + `category`.
  - `career_activities`: best-effort mapping — for each activity, link to careers whose `tags`/subjects intersect the activity's category/title keywords (e.g. "Internship"/"Workshop" tech activities → Software Engineer/Data Scientist). Sparse is fine; comment the heuristic. Empty is acceptable if no confident matches.

- [ ] **Step 2: Write the seed** — shape (generate all rows; two examples shown):

```sql
insert into public.careers
  (id, title, description, required_education, required_skills, recommended_subjects,
   salary_min, salary_max, work_environment, demand_level, tags)
values
  ('1','Software Engineer','...',
   array['Bachelor in Computer Science or related'],
   array['Programming (JavaScript, Python, Java)','Problem solving'],
   array['Mathematics','Computer Science','Physics'],
   20000, 40000, 'Tech companies, startups, or remote work', 'very_high',
   array['software','engineer','programming','javascript','python','mathematics']),
  -- ... careers 2..16
  ;

insert into public.activities
  (id, title, category, location, price_amount, description, tags)
values
  ('1','...','Internship','Tel Aviv',0,'...',array['internship','tel aviv']),
  -- ... activities 2..28
  ;

-- career_activities: best-effort links (comment the heuristic used)
insert into public.career_activities (career_id, activity_id) values
  ('1','...') -- etc, or none
  ;
```

- [ ] **Step 3:** Owner runs the seed. Verify: `select count(*) from careers` = 16, `activities` = 28.
- [ ] **Step 4: Commit** `git add supabase/seed_catalog.sql && git commit -m "feat: catalog seed from local arrays"`

### Task 11: `services/catalog.ts` data-access layer

**Files:** Create `services/catalog.ts`

**Interfaces produced:** `Career`, `Activity` types (camelCase); `searchCareers`, `getCareer`, `searchActivities`, `getActivity`, `getActivitiesForCareer`, `getActivitiesByIds`.

- [ ] **Step 1: Write it**

```typescript
import { supabase } from "./supabase";

export type Career = {
  id: string;
  title: string;
  description: string;
  requiredEducation: string[];
  requiredSkills: string[];
  recommendedSubjects: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  workEnvironment: string;
  demandLevel: string;
  tags: string[];
  imageUrl: string | null;
};

export type Activity = {
  id: string;
  title: string;
  category: string;
  location: string;
  priceAmount: number;
  priceCurrency: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
};

export type CareerFilters = { subjects?: string[]; demandLevel?: string; tags?: string[] };
export type ActivityFilters = { category?: string; maxBudget?: number | null; location?: string };

const CAREER_COLS =
  "id,title,description,required_education,required_skills,recommended_subjects,salary_min,salary_max,salary_currency,salary_period,work_environment,demand_level,tags,image_url";
const ACTIVITY_COLS =
  "id,title,category,location,price_amount,price_currency,description,tags,image_url";

function mapCareer(r: any): Career {
  return {
    id: r.id, title: r.title, description: r.description,
    requiredEducation: r.required_education ?? [],
    requiredSkills: r.required_skills ?? [],
    recommendedSubjects: r.recommended_subjects ?? [],
    salaryMin: r.salary_min, salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency, salaryPeriod: r.salary_period,
    workEnvironment: r.work_environment, demandLevel: r.demand_level,
    tags: r.tags ?? [], imageUrl: r.image_url ?? null,
  };
}
function mapActivity(r: any): Activity {
  return {
    id: r.id, title: r.title, category: r.category, location: r.location,
    priceAmount: r.price_amount, priceCurrency: r.price_currency,
    description: r.description, tags: r.tags ?? [], imageUrl: r.image_url ?? null,
  };
}

export async function searchCareers(query: string, filters: CareerFilters = {}): Promise<Career[]> {
  let q = supabase.from("careers").select(CAREER_COLS);
  if (query.trim()) q = q.textSearch("search_vector", query.trim(), { type: "websearch" });
  if (filters.demandLevel) q = q.eq("demand_level", filters.demandLevel);
  if (filters.subjects?.length) q = q.contains("recommended_subjects", filters.subjects);
  if (filters.tags?.length) q = q.contains("tags", filters.tags);
  const { data, error } = await q.order("title");
  if (error) { console.error("searchCareers", error); return []; }
  return (data ?? []).map(mapCareer);
}

export async function getCareer(id: string): Promise<Career | null> {
  const { data, error } = await supabase.from("careers").select(CAREER_COLS).eq("id", id).maybeSingle();
  if (error) { console.error("getCareer", error); return null; }
  return data ? mapCareer(data) : null;
}

export async function searchActivities(query: string, filters: ActivityFilters = {}): Promise<Activity[]> {
  let q = supabase.from("activities").select(ACTIVITY_COLS);
  if (query.trim()) q = q.textSearch("search_vector", query.trim(), { type: "websearch" });
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.maxBudget != null) q = q.lte("price_amount", filters.maxBudget);
  if (filters.location?.trim()) q = q.ilike("location", `%${filters.location.trim()}%`);
  const { data, error } = await q.order("title");
  if (error) { console.error("searchActivities", error); return []; }
  return (data ?? []).map(mapActivity);
}

export async function getActivity(id: string): Promise<Activity | null> {
  const { data, error } = await supabase.from("activities").select(ACTIVITY_COLS).eq("id", id).maybeSingle();
  if (error) { console.error("getActivity", error); return null; }
  return data ? mapActivity(data) : null;
}

export async function getActivitiesForCareer(careerId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("career_activities")
    .select(`activity_id, activities (${ACTIVITY_COLS})`)
    .eq("career_id", careerId);
  if (error) { console.error("getActivitiesForCareer", error); return []; }
  return (data ?? []).map((r: any) => mapActivity(r.activities)).filter(Boolean);
}

export async function getActivitiesByIds(ids: string[]): Promise<Activity[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("activities").select(ACTIVITY_COLS).in("id", ids);
  if (error) { console.error("getActivitiesByIds", error); return []; }
  return (data ?? []).map(mapActivity);
}
```

- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` clean for `services/catalog.ts`.
- [ ] **Step 3: Commit** `git add services/catalog.ts && git commit -m "feat: catalog data-access layer (search/get careers + activities)"`

> **✅ CHECKPOINT A (data review):** owner applies migration + seed, confirms row counts (16 / 28) and that a career row has numeric salary, a `demand_level`, and `tags`; anon SELECT works. Comment on schema/data before screens depend on it.

---

## Phase B — Navigation restructure (three pillars)

### Task 12: Shared theme + 4-tab layout

**Files:** Rewrite `constants/theme.ts`; rewrite `app/(tabs)/_layout.tsx`

- [ ] **Step 1: `constants/theme.ts`** — export the real palette + fonts used across the app:

```typescript
export const colors = {
  bg: "#e2f5ff", heading: "#203b60", accent: "#107c8f",
  button: "#27805a", border: "#111", muted: "#777", card: "#fff",
};
export const fonts = {
  heading: "Poppins_700Bold", body: "Inter_400Regular", bodyBold: "Inter_700Bold",
};
```

- [ ] **Step 2: `app/(tabs)/_layout.tsx`** — 4 tabs (Guide/Search/Questionnaire/Profile) with Ionicons; `saved` no longer a tab:

```typescript
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.heading }}>
      <Tabs.Screen name="index" options={{ title: "Guide", tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: "Search", tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="questionnaire" options={{ title: "Questionnaire", tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 3:** tsc + lint clean. **Commit** `feat: shared theme + 4-tab layout (Guide/Search/Questionnaire/Profile)`

### Task 13: Guide tab

**Files:** Rewrite `app/(tabs)/index.tsx`

Behavior: greet via `useAuth().user.user_metadata.full_name`; load `profiles.career` (`getProfile`) → `getCareer(id)`; show the set career (title + link to `/career?id=`) or a "no career yet — take the Questionnaire / Search" prompt; a labeled "Your roadmap — coming soon" placeholder block (future gamified task list). Use `constants/theme`. No Appwrite.

- [ ] **Step 1:** Implement per the pattern of the existing Guide draft (set-career card vs prompt card + coming-soon block), swapping the career lookup to `getCareer` from `services/catalog.ts`.
- [ ] **Step 2:** tsc + lint clean. **Commit** `feat: guide tab (set career from catalog + roadmap placeholder)`

### Task 14: Search tab (absorb results.tsx)

**Files:** Create `app/(tabs)/search.tsx`; delete `app/results.tsx`

Behavior: a `Careers | Activities` segmented control. Search input drives `searchCareers(query, filters)` or `searchActivities(query, filters)`. Careers list uses `CareerCard` → `push("/career?id=")`; Activities list uses `ActivityCard` → `push("/detail?id=")`, with save toggle via `useAuth` + `addSaved`/`removeSaved`/`getSavedActivityIds`. Filter UI: for careers, demand-level + subject chips; for activities, category chips + max budget + location (mirror the old filter modal). Debounce/refetch on query or filter change. Use `constants/theme`; align `CareerCard`/`ActivityCard` styling to it.

- [ ] **Step 1:** Build the screen; results come from `services/catalog.ts` (async, with a loading state). Remove the local `data/*` imports.
- [ ] **Step 2:** `git rm app/results.tsx` (search now lives in the tab).
- [ ] **Step 3:** tsc + lint clean. **Commit** `feat: search tab backed by catalog DB; remove results.tsx`

> **📱 CHECKPOINT B (device):** new 4-tab nav live; Guide renders; Search returns DB-backed careers + filters work. Owner runs it and comments before remaining tabs.

### Task 15: Questionnaire tab

**Files:** Create `app/(tabs)/questionnaire.tsx`

Behavior: 7 fields (majors, career_in_mind, hobbies, parents_jobs, dream_job, volunteer_interest, psychometric_grade); load via `getQuestionnaire`, save via `upsertQuestionnaire`; a placeholder "Get career recommendations" button (disabled/"coming soon"). Use `constants/theme`.

- [ ] **Step 1:** Implement. **Step 2:** tsc + lint clean. **Commit** `feat: questionnaire tab (loads + saves answers; recommend placeholder)`

### Task 16: Profile tab + Saved routing

**Files:** Modify `app/(tabs)/profile.tsx`

- [ ] **Step 1:** Keep name/email/sign-out; add a "Saved" row that `push("/saved")` alongside "Personal Information". Use `constants/theme`.
- [ ] **Step 2:** tsc + lint clean. **Commit** `feat: profile links to saved + personal details`

> **📱 CHECKPOINT C (device):** all four tabs present; Questionnaire saves + reloads; Profile links out. Owner reviews the full shell.

---

## Phase C — Rewire details, save careers, Saved screen, remove legacy

> Owner feedback (Checkpoint C): (a) remove the "Get Directions"/"Share" placeholder buttons on activity detail — "directions to a job" is the Guide's future job, not an activity action; (b) careers must be saveable too (a "considering" list), surfaced in Profile; (c) save == like — reuse the single heart/save action for both careers and activities (no separate like button). `saved.item_type` already supports `'career'`, so no schema change.

### Task 17: Career-saving groundwork (data layer + CareerCard heart + Search wiring)

- [ ] **Data layer:** in `services/supabase.ts` add `getSavedIds(userId: string, itemType: string): Promise<string[]>` and refactor `getSavedActivityIds` to call `getSavedIds(userId, "activity")` (keep the old name as a thin wrapper so existing callers don't break). `addSaved`/`removeSaved` already take an `itemType` param — no change. In `services/catalog.ts` add `getCareersByIds(ids: string[]): Promise<Career[]>` (mirrors `getActivitiesByIds`).
- [ ] **CareerCard:** add `isSaved?: boolean` + `onToggleSave?: () => void` props and a heart toggle, mirroring `ActivityCard` (same ♥/♡ + theme).
- [ ] **Search tab:** in careers mode, load saved career ids (`getSavedIds(user.id, "career")`), pass `isSaved`/`onToggleSave` to `CareerCard`, and toggle via `addSaved(user.id, id, "career")`/`removeSaved(user.id, id, "career")` (mirror the activity save logic already there).
- [ ] tsc+lint clean. **Commit** `feat: save/like careers (data layer + card heart + search wiring)`

### Task 18: `app/career.tsx` from DB + related activities + Save button

- [ ] Load via `getCareer(id)`; render structured salary (`salaryMin–salaryMax salaryCurrency/salaryPeriod`) + `demandLevel`; add a "Related activities" section from `getActivitiesForCareer(id)` → `push("/detail?id=")`; add a **Save/Unsave** button using `getSavedIds(user.id,"career")` + `addSaved`/`removeSaved(..., "career")`. Drop the `data/careers` import; use `constants/theme`. tsc+lint. **Commit** `feat: career detail from catalog + related activities + save`

### Task 19: `app/detail.tsx` from DB + remove dead buttons

- [ ] Load the activity via `getActivity(id)`; keep existing Supabase save/unsave; **remove the "Get Directions (Coming Soon)" and "Share (Coming Soon)" buttons** (dead placeholders). Drop the `data/activities` import; use `constants/theme`. tsc+lint. **Commit** `feat: activity detail from catalog; drop dead placeholder buttons`

### Task 20: `app/saved.tsx` move + DB hydrate (careers + activities)

- [ ] Move `app/(tabs)/saved.tsx` → `app/saved.tsx`; two sections — **"Careers you're considering"** (`getSavedIds(user.id,"career")` → `getCareersByIds` → `CareerCard` → `/career?id=`) and **"Saved activities"** (`getSavedIds(user.id,"activity")` → `getActivitiesByIds` → `ActivityCard` → `/detail?id=`), with pull-to-refresh; register `saved` as a stack screen in `app/_layout.tsx`. Use `constants/theme`. tsc+lint. **Commit** `feat: saved screen (considering careers + saved activities) from catalog`

### Task 21: Remove Appwrite + legacy

- [ ] `git rm app/questionnare.tsx services/appwrite.ts`; `npm uninstall appwrite`; ensure `app/_layout.tsx` stack has `saved` and no `results`/`questionnare`; grep to confirm no `services/appwrite`/`from "appwrite"` imports remain. tsc+lint. **Commit** `chore: remove appwrite + legacy questionnaire route`

### Task 22: Retire local catalog arrays

- [ ] Confirm nothing under `app/` or `components/` imports `data/careers`/`data/activities` (grep); `git rm data/careers.tsx data/activities.tsx`. tsc+lint. **Commit** `chore: retire local catalog arrays (now DB-backed)`

> **📱 CHECKPOINT D (final device smoke test):** see Verification.

---

## Verification

1. **DB:** `careers` 16 rows, `activities` 28 rows, `career_activities` present; a career has numeric `salary_min/max`, `demand_level`, `tags`; anon SELECT works.
2. **Per task:** `npx tsc --noEmit` + `npm run lint` clean for changed files.
3. **Device (`npx expo start --tunnel`, Expo Go):**
   - Sign in → **Guide**; no-career prompt + roadmap placeholder render.
   - **Search**: "engineer" → DB careers; ♥ a career; open career → structured salary/demand + related activities + Save button; Activities segment → "internship" → results; ♥ an activity; activity detail has NO "Get Directions"/"Share" buttons.
   - **Questionnaire**: fill + save; reopen → persists.
   - **Profile → Saved**: "Careers you're considering" shows the saved career; "Saved activities" shows the saved activity; unsave works from both.
   - Sign out → sign in; data intact; only Supabase network calls.

## Deferred (NOT this plan)

- Questionnaire→career recommendation scoring.
- AI career guide: roadmap generation, `guide_goals`/`guide_tasks` tables, LLM calls.
- Career images/storage; full re-theme of untouched legacy screens.
