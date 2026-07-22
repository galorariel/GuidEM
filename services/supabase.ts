import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env."
  );
}

// Storage adapter that safely guards against SSR (Node.js pre-rendering where window is undefined)
const ssrSafeStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: ssrSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// ---- Types (mirror supabase/migrations/*.sql) ------------------------------
// RIASEC / Holland Codes — set by the questionnaire (personality test).
export type PersonalityType =
  | "realistic"
  | "investigative"
  | "artistic"
  | "social"
  | "enterprising"
  | "conventional";

export type Profile = {
  id: string;
  full_name: string;
  role: string;
  school: string;
  grade_level: string;
  city: string;
  majors: string[]; // school subjects/majors ('{}' = none chosen yet)
  link_code: string | null; // parent linking sharing code
  personality_type: PersonalityType | null; // null = questionnaire not taken
  career: string | null; // catalog career id the goal points to
  career_goal: string | null; // original broad career title from catalog (null = no goal)
  career_specialization: string | null; // latest narrowed-down career label (evolves with choices)
  career_path: string[]; // ordered breadcrumb: broad → specific
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

// ---- Career goal -----------------------------------------------------------
// One active goal per user, stored on the profile row. `careerId` links to a
// catalog career (required — no free-text goals).
export async function setCareerGoal(
  userId: string,
  title: string,
  careerId: string | null = null
): Promise<void> {
  // Wipe any existing guide units from database immediately to prevent transition race conditions
  await supabase.from("guide_units").delete().eq("user_id", userId);

  await upsertProfile(userId, {
    career_goal: title,
    career: careerId,
    career_specialization: title, // initialize specialization to the broad goal
    career_path: [title],         // start the breadcrumb trail
  });
}

export async function clearCareerGoal(userId: string): Promise<void> {
  await upsertProfile(userId, {
    career_goal: null,
    career: null,
    career_specialization: null,
    career_path: [],
  });
}

// Update the specialization after a guide choice narrows the career path.
export async function updateSpecialization(
  userId: string,
  label: string
): Promise<void> {
  const profile = await getProfile(userId);
  const currentPath = profile?.career_path ?? [];
  await upsertProfile(userId, {
    career_specialization: label,
    career_path: [...currentPath, label],
  });
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
export async function getSavedIds(
  userId: string,
  itemType: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_type", itemType);
  if (error) {
    console.error("getSavedIds", error);
    return [];
  }
  return (data ?? []).map((r) => r.item_id as string);
}

export async function getSavedActivityIds(userId: string): Promise<string[]> {
  return getSavedIds(userId, "activity");
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
      // ignoreDuplicates -> ON CONFLICT DO NOTHING (idempotent add). Avoids the
      // UPDATE arm, which the `saved` table has no RLS update policy for.
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
