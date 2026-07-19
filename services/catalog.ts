import { supabase, type PersonalityType } from "./supabase";

export type Career = {
  id: string;
  parentId: string | null;
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
  hollandCodes: string[];
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
  "id,parent_id,title,description,required_education,required_skills,recommended_subjects,salary_min,salary_max,salary_currency,salary_period,work_environment,demand_level,tags,holland_codes,image_url";
const ACTIVITY_COLS =
  "id,title,category,location,price_amount,price_currency,description,tags,image_url";

function mapCareer(r: any): Career {
  return {
    id: r.id,
    parentId: r.parent_id ?? null,
    title: r.title,
    description: r.description,
    requiredEducation: r.required_education ?? [],
    requiredSkills: r.required_skills ?? [],
    recommendedSubjects: r.recommended_subjects ?? [],
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency,
    salaryPeriod: r.salary_period,
    workEnvironment: r.work_environment,
    demandLevel: r.demand_level,
    tags: r.tags ?? [],
    hollandCodes: r.holland_codes ?? [],
    imageUrl: r.image_url ?? null,
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
  if (query.trim()) {
    q = q.textSearch("search_vector", query.trim(), { type: "websearch" });
  } else {
    // Show only top-level careers when not searching by text query
    q = q.is("parent_id", null);
  }
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

export async function getCareersByIds(ids: string[]): Promise<Career[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("careers").select(CAREER_COLS).in("id", ids);
  if (error) { console.error("getCareersByIds", error); return []; }
  return (data ?? []).map(mapCareer);
}

// Recommend catalog careers for a RIASEC personality type. Fetches careers whose
// holland_codes overlap the primary (+ optional secondary) type, then ranks by
// fit: codes are stored strongest-first, so index 0 weighs most.
export async function recommendCareers(
  primary: PersonalityType,
  secondary: PersonalityType | null = null,
  limit = 5
): Promise<Career[]> {
  const codes = secondary ? [primary, secondary] : [primary];
  const { data, error } = await supabase.from("careers").select(CAREER_COLS).overlaps("holland_codes", codes);
  if (error) { console.error("recommendCareers", error); return []; }
  const scored = (data ?? []).map(mapCareer).map((c) => {
    const h = c.hollandCodes;
    let score = 0;
    if (h[0] === primary) score += 3;
    else if (h.includes(primary)) score += 2;
    if (secondary) {
      if (h[0] === secondary) score += 1.5;
      else if (h.includes(secondary)) score += 1;
    }
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score || a.c.title.localeCompare(b.c.title));
  return scored.slice(0, limit).map((s) => s.c);
}

export async function getSubCareers(parentId: string): Promise<Career[]> {
  const { data, error } = await supabase
    .from("careers")
    .select(CAREER_COLS)
    .eq("parent_id", parentId)
    .order("title");
  if (error) {
    console.error("getSubCareers", error);
    return [];
  }
  return (data ?? []).map(mapCareer);
}

export async function getAncestorCareers(careerId: string): Promise<Career[]> {
  const ancestors: Career[] = [];
  let currentId: string | null = careerId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const career = await getCareer(currentId);
    if (!career) break;
    
    if (currentId !== careerId) {
      ancestors.unshift(career); // older ancestors first
    }
    currentId = career.parentId;
  }

  return ancestors;
}
