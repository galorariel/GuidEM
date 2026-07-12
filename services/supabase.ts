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
      { onConflict: "user_id,item_type,item_id" }
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
