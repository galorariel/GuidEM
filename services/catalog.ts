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
  mentorName: string | null;
  mentorTitle: string | null;
  mentorContactType: "linkedin" | "email" | "phone" | null;
  mentorContactValue: string | null;
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
  "id,parent_id,title,description,required_education,required_skills,recommended_subjects,salary_min,salary_max,salary_currency,salary_period,work_environment,demand_level,tags,holland_codes,image_url,mentor_name,mentor_title,mentor_contact_type,mentor_contact_value,title_he,title_ar,description_he,description_ar,required_education_he,required_education_ar,required_skills_he,required_skills_ar,recommended_subjects_he,recommended_subjects_ar,work_environment_he,work_environment_ar,mentor_title_he,mentor_title_ar";
const ACTIVITY_COLS =
  "id,title,category,location,price_amount,price_currency,description,tags,image_url,title_he,title_ar,description_he,description_ar,category_he,category_ar,location_he,location_ar";

function mapCareer(r: any, lang: string = "en"): Career {
  const isHe = lang === "he";
  const isAr = lang === "ar";

  return {
    id: r.id,
    parentId: r.parent_id ?? null,
    title: (isHe && r.title_he?.trim()) || (isAr && r.title_ar?.trim()) || r.title,
    description: (isHe && r.description_he?.trim()) || (isAr && r.description_ar?.trim()) || r.description,
    requiredEducation: (isHe && r.required_education_he?.length) ? r.required_education_he : (isAr && r.required_education_ar?.length) ? r.required_education_ar : (r.required_education ?? []),
    requiredSkills: (isHe && r.required_skills_he?.length) ? r.required_skills_he : (isAr && r.required_skills_ar?.length) ? r.required_skills_ar : (r.required_skills ?? []),
    recommendedSubjects: (isHe && r.recommended_subjects_he?.length) ? r.recommended_subjects_he : (isAr && r.recommended_subjects_ar?.length) ? r.recommended_subjects_ar : (r.recommended_subjects ?? []),
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency,
    salaryPeriod: r.salary_period,
    workEnvironment: (isHe && r.work_environment_he?.trim()) || (isAr && r.work_environment_ar?.trim()) || r.work_environment,
    demandLevel: r.demand_level,
    tags: r.tags ?? [],
    hollandCodes: r.holland_codes ?? [],
    imageUrl: r.image_url ?? null,
    mentorName: r.mentor_name ?? null,
    mentorTitle: (isHe && r.mentor_title_he?.trim()) || (isAr && r.mentor_title_ar?.trim()) || (r.mentor_title ?? null),
    mentorContactType: r.mentor_contact_type ?? null,
    mentorContactValue: r.mentor_contact_value ?? null,
  };
}

function mapActivity(r: any, lang: string = "en"): Activity {
  const isHe = lang === "he";
  const isAr = lang === "ar";

  return {
    id: r.id,
    title: (isHe && r.title_he?.trim()) || (isAr && r.title_ar?.trim()) || r.title,
    category: (isHe && r.category_he?.trim()) || (isAr && r.category_ar?.trim()) || r.category,
    location: (isHe && r.location_he?.trim()) || (isAr && r.location_ar?.trim()) || r.location,
    priceAmount: r.price_amount,
    priceCurrency: r.price_currency,
    description: (isHe && r.description_he?.trim()) || (isAr && r.description_ar?.trim()) || r.description,
    tags: r.tags ?? [],
    imageUrl: r.image_url ?? null,
  };
}

const careerCache = new Map<string, Career>();
const activitiesForCareerCache = new Map<string, Activity[]>();
const subCareersCache = new Map<string, Career[]>();
const ancestorCareersCache = new Map<string, Career[]>();

export async function searchCareers(query: string, filters: CareerFilters = {}, lang: string = "en"): Promise<Career[]> {
  let q = supabase.from("careers").select(CAREER_COLS);
  if (query.trim()) {
    const term = `%${query.trim()}%`;
    if (lang === "he") {
      q = q.or(`title_he.ilike.${term},description_he.ilike.${term},title.ilike.${term},description.ilike.${term}`);
    } else if (lang === "ar") {
      q = q.or(`title_ar.ilike.${term},description_ar.ilike.${term},title.ilike.${term},description.ilike.${term}`);
    } else {
      q = q.or(`title.ilike.${term},description.ilike.${term}`);
    }
  } else {
    // Show only top-level careers when not searching by text query
    q = q.is("parent_id", null);
  }
  if (filters.demandLevel) q = q.eq("demand_level", filters.demandLevel);
  if (filters.subjects?.length) q = q.contains("recommended_subjects", filters.subjects);
  if (filters.tags?.length) q = q.contains("tags", filters.tags);
  const { data, error } = await q.order("title");
  if (error) { console.error("searchCareers", error); return []; }
  const mapped = (data ?? []).map((r) => mapCareer(r, lang));
  mapped.forEach((c) => careerCache.set(`${c.id}_${lang}`, c));
  return mapped;
}

export async function getCareer(id: string, lang: string = "en"): Promise<Career | null> {
  const cacheKey = `${id}_${lang}`;
  if (careerCache.has(cacheKey)) return careerCache.get(cacheKey)!;
  const { data, error } = await supabase.from("careers").select(CAREER_COLS).eq("id", id).maybeSingle();
  if (error) { console.error("getCareer", error); return null; }
  const res = data ? mapCareer(data, lang) : null;
  if (res) careerCache.set(cacheKey, res);
  return res;
}

export async function searchActivities(query: string, filters: ActivityFilters = {}, lang: string = "en"): Promise<Activity[]> {
  let q = supabase.from("activities").select(ACTIVITY_COLS);
  if (query.trim()) {
    const term = `%${query.trim()}%`;
    if (lang === "he") {
      q = q.or(`title_he.ilike.${term},description_he.ilike.${term},category_he.ilike.${term},title.ilike.${term},description.ilike.${term}`);
    } else if (lang === "ar") {
      q = q.or(`title_ar.ilike.${term},description_ar.ilike.${term},category_ar.ilike.${term},title.ilike.${term},description.ilike.${term}`);
    } else {
      q = q.or(`title.ilike.${term},description.ilike.${term},location.ilike.${term},category.ilike.${term}`);
    }
  }
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.maxBudget != null) q = q.lte("price_amount", filters.maxBudget);
  if (filters.location?.trim()) q = q.ilike("location", `%${filters.location.trim()}%`);
  const { data, error } = await q.order("title");
  if (error) { console.error("searchActivities", error); return []; }
  return (data ?? []).map((r) => mapActivity(r, lang));
}

export async function getActivity(id: string, lang: string = "en"): Promise<Activity | null> {
  const { data, error } = await supabase.from("activities").select(ACTIVITY_COLS).eq("id", id).maybeSingle();
  if (error) { console.error("getActivity", error); return null; }
  return data ? mapActivity(data, lang) : null;
}

export async function getActivitiesForCareer(careerId: string, lang: string = "en"): Promise<Activity[]> {
  const cacheKey = `${careerId}_${lang}`;
  if (activitiesForCareerCache.has(cacheKey)) return activitiesForCareerCache.get(cacheKey)!;
  const { data, error } = await supabase
    .from("career_activities")
    .select(`activity_id, activities (${ACTIVITY_COLS})`)
    .eq("career_id", careerId);
  if (error) { console.error("getActivitiesForCareer", error); return []; }
  const res = (data ?? []).map((r: any) => mapActivity(r.activities, lang)).filter(Boolean);
  activitiesForCareerCache.set(cacheKey, res);
  return res;
}

export async function getActivitiesByIds(ids: string[], lang: string = "en"): Promise<Activity[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("activities").select(ACTIVITY_COLS).in("id", ids);
  if (error) { console.error("getActivitiesByIds", error); return []; }
  return (data ?? []).map((r) => mapActivity(r, lang));
}

export async function getCareersByIds(ids: string[], lang: string = "en"): Promise<Career[]> {
  if (!ids.length) return [];
  const uncachedIds = ids.filter((id) => !careerCache.has(`${id}_${lang}`));
  if (uncachedIds.length > 0) {
    const { data, error } = await supabase.from("careers").select(CAREER_COLS).in("id", uncachedIds);
    if (error) { console.error("getCareersByIds", error); }
    else {
      (data ?? []).map((r) => mapCareer(r, lang)).forEach((c) => careerCache.set(`${c.id}_${lang}`, c));
    }
  }
  return ids.map((id) => careerCache.get(`${id}_${lang}`)).filter(Boolean) as Career[];
}

export async function recommendCareers(
  primary: PersonalityType,
  secondary: PersonalityType | null = null,
  limit = 5,
  lang: string = "en"
): Promise<Career[]> {
  const codes = secondary ? [primary, secondary] : [primary];
  const { data, error } = await supabase.from("careers").select(CAREER_COLS).overlaps("holland_codes", codes);
  if (error) { console.error("recommendCareers", error); return []; }
  const scored = (data ?? []).map((r) => mapCareer(r, lang)).map((c) => {
    careerCache.set(`${c.id}_${lang}`, c);
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

export async function getSubCareers(parentId: string, lang: string = "en"): Promise<Career[]> {
  const cacheKey = `${parentId}_${lang}`;
  if (subCareersCache.has(cacheKey)) return subCareersCache.get(cacheKey)!;
  const { data, error } = await supabase
    .from("careers")
    .select(CAREER_COLS)
    .eq("parent_id", parentId)
    .order("title");
  if (error) {
    console.error("getSubCareers", error);
    return [];
  }
  const res = (data ?? []).map((r) => mapCareer(r, lang));
  subCareersCache.set(cacheKey, res);
  return res;
}

export async function getAncestorCareers(careerId: string, lang: string = "en"): Promise<Career[]> {
  const cacheKey = `${careerId}_${lang}`;
  if (ancestorCareersCache.has(cacheKey)) return ancestorCareersCache.get(cacheKey)!;
  const ancestors: Career[] = [];
  let currentId: string | null = careerId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const career = await getCareer(currentId, lang);
    if (!career) break;
    
    if (currentId !== careerId) {
      ancestors.unshift(career); // older ancestors first
    }
    currentId = career.parentId;
  }

  ancestorCareersCache.set(cacheKey, ancestors);
  return ancestors;
}
