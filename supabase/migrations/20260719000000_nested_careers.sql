-- SQL Migration: Nested Career Specializations
-- Add parent_id column to careers table to enable hierarchical career paths.

ALTER TABLE public.careers
ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.careers (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS careers_parent_id_idx ON public.careers (parent_id);

-- Seed sub-careers under Software Engineer (id: '1')
INSERT INTO public.careers
  (id, parent_id, title, description, required_education, required_skills, recommended_subjects,
   salary_min, salary_max, work_environment, demand_level, tags, holland_codes)
VALUES
  ('1-frontend', '1', 'Frontend Web Developer',
   'Frontend web developers design, code, and maintain the visual elements and user interface of websites and web applications.',
   ARRAY['Web development coding bootcamp', 'Self-taught portfolio', 'Continuous learning of frontend frameworks'],
   ARRAY['React / React Native', 'HTML & CSS', 'JavaScript & TypeScript', 'Responsive design'],
   ARRAY['Computer Science', 'Art', 'Mathematics'],
   14000, 28000, 'Tech companies, web agencies, or remote work', 'very_high',
   ARRAY['frontend','developer','web','react','html','css','javascript','typescript'],
   '{investigative,realistic,conventional}'),

  ('1-backend', '1', 'Backend Software Engineer',
   'Backend engineers focus on building and maintaining database structures, APIs, server architectures, and business logic that powers applications.',
   ARRAY['BSc in Computer Science or Software Engineering', 'Backend bootcamps', 'Database certifications'],
   ARRAY['Node.js / Python / Go', 'PostgreSQL & SQL', 'API design & REST', 'Docker & Cloud services'],
   ARRAY['Computer Science', 'Mathematics', 'Physics'],
   16000, 32000, 'Tech offices or remote engineering teams', 'very_high',
   ARRAY['backend','engineer','databases','postgresql','sql','node','python','api','cloud'],
   '{investigative,realistic,conventional}'),

  ('1-data', '1', 'Data Engineer',
   'Data engineers design, build, and optimize systems for data collection, storage, piping, and analytical processing.',
   ARRAY['BSc in Data Science, Computer Science, or Mathematics'],
   ARRAY['Data Pipelines (ETL)', 'SQL & BigData', 'Python / Scala', 'Data Warehousing'],
   ARRAY['Computer Science', 'Mathematics', 'Statistics'],
   18000, 35000, 'Enterprise tech teams, data analytics divisions', 'very_high',
   ARRAY['data','engineer','pipelines','etl','sql','python','warehousing','analytics'],
   '{investigative,realistic,conventional}');

-- Seed sub-careers under Graphic Designer (id: '8')
INSERT INTO public.careers
  (id, parent_id, title, description, required_education, required_skills, recommended_subjects,
   salary_min, salary_max, work_environment, demand_level, tags, holland_codes)
VALUES
  ('8-animator', '8', 'Motion Graphics Animator',
   'Motion designers create animated visuals, 2D/3D visual effects, and dynamic illustrations for videos, games, and web media.',
   ARRAY['Degree in Animation, Graphic Design or Visual Communication', 'Specialized course in motion design'],
   ARRAY['Adobe After Effects', '3D Modeling (Blender/Cinema4D)', 'Visual storytelling', 'Keyframe animation'],
   ARRAY['Art', 'Design', 'Media', 'Physics'],
   9000, 18000, 'Animation studios, creative agencies, freelance', 'high',
   ARRAY['motion','designer','animator','animation','effects','aftereffects','blender','storytelling'],
   '{artistic,realistic,enterprising}'),

  ('8-brand', '8', 'Brand Identity Designer',
   'Brand designers specialize in creating visual identity systems, logo guidelines, typography layouts, and brand systems for companies.',
   ARRAY['Degree in Visual Communication or Graphic Design'],
   ARRAY['Adobe Illustrator / Photoshop', 'Typography', 'Logo design', 'Brand styling guidelines'],
   ARRAY['Art', 'Design', 'Media'],
   8500, 16000, 'Design studios, advertising agencies, freelance', 'moderate',
   ARRAY['brand','designer','identity','logo','typography','design','illustrator'],
   '{artistic,realistic,enterprising}');
