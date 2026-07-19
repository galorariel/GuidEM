import { supabase } from "./supabase";

export interface LinkedChild {
  childId: string;
  childName: string;
  careerGoal: string | null;
  currentSpecialization: string | null;
}

export interface ProgressSummary {
  id: string;
  userId: string;
  kind: "unit_complete" | "decision" | "milestone";
  unitId: string | null;
  unitIndex: number | null;
  title: string;
  body: string;
  createdAt: string;
}

/**
 * Fetch the student link code from their profile.
 */
export async function getLinkCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("link_code")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getLinkCode error:", error);
    return null;
  }
  return data?.link_code ?? null;
}

/**
 * Link a child to the current parent account using their alphanumeric code.
 */
export async function linkChild(code: string): Promise<{
  success: boolean;
  childId?: string;
  childName?: string;
  careerGoal?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc("link_child_by_code", {
    p_code: code,
  });

  if (error) {
    console.error("linkChild RPC error:", error);
    return { success: false, error: error.message };
  }

  // RPC returns child metadata
  const res = data as {
    success: boolean;
    child_id: string;
    child_name: string;
    career_goal: string;
  };

  return {
    success: res.success,
    childId: res.child_id,
    childName: res.child_name,
    careerGoal: res.career_goal,
  };
}

/**
 * Fetch all children profiles linked to the current parent account.
 */
export async function getLinkedChildren(): Promise<LinkedChild[]> {
  const { data, error } = await supabase
    .from("parent_links")
    .select(`
      child_id,
      child_profile:profiles!parent_links_child_id_fkey (
        id,
        full_name,
        career,
        career_specialization
      )
    `);

  if (error) {
    console.error("getLinkedChildren error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    childId: row.child_id,
    childName: row.child_profile?.full_name || "Student",
    careerGoal: row.child_profile?.career || null,
    currentSpecialization: row.child_profile?.career_specialization || null,
  }));
}

/**
 * Fetch progress milestones and decisions for a linked child.
 */
export async function getChildProgress(childId: string): Promise<ProgressSummary[]> {
  const { data, error } = await supabase
    .from("progress_summaries")
    .select("id,user_id,kind,unit_id,unit_index,title,body,created_at")
    .eq("user_id", childId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getChildProgress error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    unitId: row.unit_id,
    unitIndex: row.unit_index,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

/**
 * Remove a parent-child connection.
 */
export async function unlinkChild(childId: string): Promise<boolean> {
  const { error } = await supabase
    .from("parent_links")
    .delete()
    .eq("child_id", childId);

  if (error) {
    console.error("unlinkChild error:", error);
    return false;
  }
  return true;
}

/**
 * Fetch all parent profiles linked to the current student account.
 */
export async function getLinkedParents(): Promise<{ parentId: string; parentName: string }[]> {
  const { data, error } = await supabase
    .from("parent_links")
    .select(`
      parent_id,
      parent_profile:profiles!parent_links_parent_id_fkey (
        id,
        full_name
      )
    `);

  if (error) {
    console.error("getLinkedParents error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    parentId: row.parent_id,
    parentName: row.parent_profile?.full_name || "Parent",
  }));
}

/**
 * Remove a parent connection from the student's side.
 */
export async function unlinkParent(parentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("parent_links")
    .delete()
    .eq("parent_id", parentId);

  if (error) {
    console.error("unlinkParent error:", error);
    return false;
  }
  return true;
}
