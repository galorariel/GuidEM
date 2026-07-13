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
