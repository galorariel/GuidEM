-- Enhanced guide flow: career specialization tracking + journey memory
-- Depends on: 20260714010000_career_goal.sql (career_goal column)
--             20260716000000_guide.sql (guide_units table)

-- 1. Profile: track how the career narrows over time
ALTER TABLE profiles
  ADD COLUMN career_specialization text,          -- latest narrowed-down career label (evolves with each choice)
  ADD COLUMN career_path            text[]        -- ordered breadcrumb: broad → specific
    DEFAULT '{}';

-- 2. Guide units: rolling AI-generated journey summary
ALTER TABLE guide_units
  ADD COLUMN journey_summary text;                -- prose recap of the student's journey so far (~150 words)
