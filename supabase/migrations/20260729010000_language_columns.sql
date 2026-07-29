-- ============================================================================
-- Add language preference column to profiles, and localized text columns + 
-- search vectors to careers and activities tables for Hebrew (he) & Arabic (ar).
-- ============================================================================

-- 1. Profile language preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- 2. Careers localized columns
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS title_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS required_education_he text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_education_ar text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_skills_he text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_skills_ar text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_subjects_he text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_subjects_ar text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_environment_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_environment_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mentor_title_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mentor_title_ar text NOT NULL DEFAULT '';

-- Hebrew & Arabic search vectors for careers
ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS search_vector_he tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_he, '') || ' ' || coalesce(description_he, '') || ' ' ||
      public.immutable_array_to_string(required_skills_he) || ' ' ||
      public.immutable_array_to_string(recommended_subjects_he)
    )
  ) STORED;

ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS search_vector_ar tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_ar, '') || ' ' || coalesce(description_ar, '') || ' ' ||
      public.immutable_array_to_string(required_skills_ar) || ' ' ||
      public.immutable_array_to_string(recommended_subjects_ar)
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS careers_search_he_idx ON public.careers USING gin (search_vector_he);
CREATE INDEX IF NOT EXISTS careers_search_ar_idx ON public.careers USING gin (search_vector_ar);

-- 3. Activities localized columns
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS title_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_he text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_ar text NOT NULL DEFAULT '';

-- Hebrew & Arabic search vectors for activities
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS search_vector_he tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_he, '') || ' ' || coalesce(description_he, '') || ' ' || coalesce(category_he, '')
    )
  ) STORED;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS search_vector_ar tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title_ar, '') || ' ' || coalesce(description_ar, '') || ' ' || coalesce(category_ar, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS activities_search_he_idx ON public.activities USING gin (search_vector_he);
CREATE INDEX IF NOT EXISTS activities_search_ar_idx ON public.activities USING gin (search_vector_ar);
