-- ============================================================================
-- Catalog seed: careers, activities, and best-effort career<->activity links.
--
-- Source of truth: data/careers.tsx (16 rows) and data/activities.tsx (28 rows).
-- This file transforms those hardcoded arrays into rows for the `careers`,
-- `activities` and `career_activities` tables created by
-- supabase/migrations/20260713000000_catalog.sql.
--
-- Transformation notes:
--   - salary_min/salary_max: parsed from the `salaryRange` string
--     (e.g. "₪20,000 – ₪40,000 per month") by stripping the ₪ sign and commas.
--     All 16 careers use this exact format, so all 16 parsed cleanly (none NULL).
--   - demand_level: mapped from the free-text `futureDemand` string —
--     contains "very high" -> very_high; else contains "high" -> high;
--     contains "moderate" -> moderate; contains "stable" -> stable;
--     anything else (e.g. "Growing demand", "Increasing demand") -> moderate.
--   - tags: distinct lowercased words drawn from title + requiredSkills +
--     recommendedHighSchoolSubjects, with parentheses/commas/slashes stripped
--     to punctuation-free words (so "Programming (JavaScript, Python, Java)"
--     contributes programming/javascript/python/java), trivial stopwords
--     ("or", "with", "to", "in", "and") dropped, and the list trimmed to a
--     reasonable ~8-12 tags per career.
--   - Activities: price_amount = priceNumber (already numeric); tags = the
--     lowercased words of title + category.
--
-- Re-run safety: on conflict (id) do nothing, so re-running this file after a
-- partial run (or after the seed already applied) is a no-op for existing rows.
-- ============================================================================

insert into public.careers
  (id, title, description, required_education, required_skills, recommended_subjects,
   salary_min, salary_max, work_environment, demand_level, tags)
values
  ('1', 'Software Engineer',
   'Software engineers design, develop, and maintain computer programs and applications used by businesses and individuals.',
   array['BSc in Computer Science or Software Engineering', 'Programming training or coding bootcamps', 'Continuous learning of new technologies'],
   array['Programming (JavaScript, Python, Java)', 'Problem solving', 'Logical thinking', 'Team collaboration'],
   array['Mathematics', 'Computer Science', 'Physics'],
   20000, 40000, 'Tech companies, startups, or remote work', 'very_high',
   array['software','engineer','programming','javascript','python','java','problem','solving','mathematics','computer','science','physics']),

  ('2', 'Doctor',
   'Doctors diagnose and treat illnesses, provide medical advice, and help maintain patient health.',
   array['Pre-medical undergraduate degree', 'Medical school (MD)', 'Hospital residency training'],
   array['Biology knowledge', 'Communication with patients', 'Attention to detail', 'Critical thinking'],
   array['Biology', 'Chemistry', 'Mathematics'],
   15000, 35000, 'Hospitals, clinics, healthcare centers', 'high',
   array['doctor','biology','knowledge','communication','patients','attention','detail','critical','thinking','chemistry','mathematics']),

  ('3', 'Architect',
   'Architects design buildings and plan structures that are functional, safe, and aesthetically pleasing.',
   array['Bachelor in Architecture', 'Architecture internship', 'Professional licensing'],
   array['Creativity', 'Design thinking', 'Mathematics', '3D visualization'],
   array['Art', 'Mathematics', 'Physics'],
   10000, 22000, 'Architecture firms, construction companies', 'moderate',
   array['architect','creativity','design','thinking','mathematics','3d','visualization','art','physics']),

  ('4', 'Lawyer',
   'Lawyers advise clients, represent them in court, and interpret laws and regulations.',
   array['Bachelor degree', 'Law school (LLB / JD)', 'Bar exam certification'],
   array['Argumentation', 'Research skills', 'Communication', 'Critical thinking'],
   array['History', 'Civics', 'Literature'],
   9000, 30000, 'Law firms, government institutions', 'moderate',
   array['lawyer','argumentation','research','skills','communication','critical','thinking','history','civics','literature']),

  ('5', 'Mechanical Engineer',
   'Mechanical engineers design and build machines and mechanical systems used in manufacturing, transportation and energy.',
   array['BSc in Mechanical Engineering', 'Engineering internships'],
   array['Mathematics', 'Physics', 'CAD software', 'Problem solving'],
   array['Mathematics', 'Physics', 'Computer Science'],
   14000, 28000, 'Engineering firms, manufacturing companies', 'stable',
   array['mechanical','engineer','mathematics','physics','cad','software','problem','solving','computer','science']),

  ('6', 'Data Scientist',
   'Data scientists analyze large datasets to find patterns and help organizations make data-driven decisions.',
   array['BSc in Data Science, Statistics, Mathematics or Computer Science'],
   array['Python or R', 'Statistics', 'Machine learning', 'Data visualization'],
   array['Mathematics', 'Computer Science', 'Statistics'],
   22000, 40000, 'Technology companies, research labs', 'very_high',
   array['data','scientist','python','r','statistics','machine','learning','visualization','mathematics','computer','science']),

  ('7', 'Civil Engineer',
   'Civil engineers design and supervise infrastructure projects such as roads, bridges and buildings.',
   array['BSc in Civil Engineering', 'Engineering internship'],
   array['Structural analysis', 'Mathematics', 'Project planning'],
   array['Mathematics', 'Physics'],
   13000, 26000, 'Construction companies, government infrastructure projects', 'stable',
   array['civil','engineer','structural','analysis','mathematics','project','planning','physics']),

  ('8', 'Graphic Designer',
   'Graphic designers create visual materials such as logos, advertisements and digital media.',
   array['Degree in Graphic Design or Visual Communication'],
   array['Creativity', 'Adobe Photoshop / Illustrator', 'Visual storytelling'],
   array['Art', 'Design', 'Media'],
   8000, 16000, 'Design studios, marketing agencies, freelance', 'moderate',
   array['graphic','designer','creativity','adobe','photoshop','illustrator','visual','storytelling','art','design','media']),

  ('9', 'Psychologist',
   'Psychologists study human behavior and help individuals manage emotional and mental challenges.',
   array['Bachelor degree in Psychology', 'Master''s or PhD in Psychology'],
   array['Empathy', 'Communication', 'Research', 'Analytical thinking'],
   array['Biology', 'Psychology', 'Social studies'],
   10000, 22000, 'Hospitals, clinics, schools, private practice', 'moderate',
   array['psychologist','empathy','communication','research','analytical','thinking','biology','psychology','social','studies']),

  ('10', 'Cybersecurity Analyst',
   'Cybersecurity analysts protect computer networks and systems from hacking and cyber threats.',
   array['BSc in Cybersecurity or Computer Science', 'Security certifications'],
   array['Network security', 'Ethical hacking', 'Risk analysis'],
   array['Computer Science', 'Mathematics', 'Information Technology'],
   22000, 38000, 'Tech companies, banks, government agencies', 'very_high',
   array['cybersecurity','analyst','network','security','ethical','hacking','risk','analysis','computer','science','mathematics','technology']),

  ('11', 'Teacher',
   'Teachers educate students and help them develop academic knowledge and critical thinking skills.',
   array['Bachelor degree in Education', 'Teaching certification'],
   array['Communication', 'Patience', 'Teaching methods'],
   array['Literature', 'Mathematics', 'Social studies'],
   8000, 16000, 'Schools and educational institutions', 'stable',
   array['teacher','communication','patience','teaching','methods','literature','mathematics','social','studies']),

  ('12', 'Environmental Scientist',
   'Environmental scientists research environmental issues and help develop solutions to pollution and climate change.',
   array['BSc in Environmental Science'],
   array['Scientific research', 'Data analysis', 'Environmental policy understanding'],
   array['Biology', 'Chemistry', 'Geography'],
   12000, 22000, 'Research institutes, environmental organizations', 'moderate',
   array['environmental','scientist','scientific','research','data','analysis','policy','understanding','biology','chemistry','geography']),

  ('13', 'Business Analyst',
   'Business analysts help organizations improve performance by analyzing data and business processes.',
   array['Bachelor degree in Business Administration or Economics'],
   array['Data analysis', 'Business strategy', 'Problem solving'],
   array['Mathematics', 'Economics', 'Business studies'],
   18000, 32000, 'Corporations, consulting firms', 'moderate',
   array['business','analyst','data','analysis','strategy','problem','solving','mathematics','economics','studies']),

  ('14', 'Journalist',
   'Journalists research and report news stories across television, newspapers and digital media.',
   array['Degree in Journalism or Communications'],
   array['Writing', 'Research', 'Communication'],
   array['Literature', 'History', 'Media studies'],
   7000, 14000, 'News organizations and media companies', 'moderate',
   array['journalist','writing','research','communication','literature','history','media','studies']),

  ('15', 'Pharmacist',
   'Pharmacists prepare and dispense medications while advising patients on safe drug use.',
   array['Doctor of Pharmacy (PharmD)', 'Pharmacy license'],
   array['Chemistry knowledge', 'Attention to detail', 'Communication'],
   array['Chemistry', 'Biology', 'Mathematics'],
   12000, 20000, 'Hospitals, pharmacies, pharmaceutical companies', 'stable',
   array['pharmacist','chemistry','knowledge','attention','detail','communication','biology','mathematics']),

  ('16', 'UX/UI Designer',
   'UX/UI designers create user-friendly and visually appealing interfaces for apps and websites.',
   array['Degree in Design or Human-Computer Interaction'],
   array['User research', 'Wireframing', 'Design tools (Figma, Sketch)'],
   array['Art', 'Computer Science', 'Design'],
   18000, 32000, 'Tech companies, startups, freelance', 'high',
   array['ux','ui','designer','user','research','wireframing','design','figma','sketch','art','computer','science'])
on conflict (id) do nothing;


insert into public.activities
  (id, title, category, location, price_amount, description, tags)
values
  ('1', 'Hospital Volunteer Program', 'Volunteering', 'Jerusalem', 0,
   'Help patients, support staff, and gain healthcare exposure.',
   array['hospital','volunteer','program','volunteering']),

  ('2', 'Engineering Career Workshop', 'Workshop', 'Haifa', 20,
   'Hands-on workshop exploring engineering study paths and careers.',
   array['engineering','career','workshop']),

  ('3', 'Job Shadowing at Tech Company', 'Job Shadowing', 'Tel Aviv', 0,
   'Shadow professionals and learn what a real workday looks like.',
   array['job','shadowing','tech','company']),

  ('4', 'University Open Day Visit', 'University Visit', 'Jerusalem', 0,
   'Explore majors, meet students, and attend info sessions.',
   array['university','open','day','visit']),

  ('5', 'Professional Networking Meetup', 'Professional Meetings', 'Haifa', 10,
   'Meet professionals, ask questions, and learn about career fields.',
   array['professional','networking','meetup','meetings']),

  ('6', 'Summer Internship Intro Program', 'Internship', 'Remote', 0,
   'Intro internship experience with mentorship and weekly tasks.',
   array['summer','internship','intro','program']),

  ('7', 'Animal Shelter Volunteer', 'Volunteering', 'Tel Aviv', 0,
   'Assist with caring for rescued animals and helping visitors.',
   array['animal','shelter','volunteer','volunteering']),

  ('8', 'Startup Founder Q&A', 'Professional Meetings', 'Tel Aviv', 15,
   'Meet startup founders and ask questions about entrepreneurship.',
   array['startup','founder','qa','professional','meetings']),

  ('9', 'Robotics Engineering Workshop', 'Workshop', 'Haifa', 25,
   'Build and program simple robots with university mentors.',
   array['robotics','engineering','workshop']),

  ('10', 'Architecture Job Shadow Day', 'Job Shadowing', 'Jerusalem', 0,
   'Spend a day with architects learning about design and planning.',
   array['architecture','job','shadow','day','shadowing']),

  ('11', 'Environmental Volunteer Cleanup', 'Volunteering', 'Haifa', 0,
   'Join a community beach and park cleanup initiative.',
   array['environmental','volunteer','cleanup','volunteering']),

  ('12', 'Medical Research Internship Intro', 'Internship', 'Tel Aviv', 0,
   'Assist research assistants in basic data collection tasks.',
   array['medical','research','internship','intro']),

  ('13', 'University Science Lab Tour', 'University Visit', 'Haifa', 8,
   'Tour advanced science laboratories and meet professors.',
   array['university','science','lab','tour','visit']),

  ('14', 'Creative Writing Workshop', 'Workshop', 'Jerusalem', 14,
   'Improve storytelling and writing skills with professional authors.',
   array['creative','writing','workshop']),

  ('15', 'Law Firm Job Shadow Program', 'Job Shadowing', 'Tel Aviv', 0,
   'Observe lawyers during meetings and legal preparation.',
   array['law','firm','job','shadow','program','shadowing']),

  ('16', 'Community Food Bank Volunteer', 'Volunteering', 'Jerusalem', 0,
   'Help organize food donations and assist families in need.',
   array['community','food','bank','volunteer','volunteering']),

  ('17', 'Tech Industry Networking Event', 'Professional Meetings', 'Tel Aviv', 20,
   'Connect with software engineers and startup employees.',
   array['tech','industry','networking','event','professional','meetings']),

  ('18', 'Computer Science University Visit', 'University Visit', 'Tel Aviv', 6,
   'Learn about computer science degrees and student projects.',
   array['computer','science','university','visit']),

  ('19', 'Marine Life Conservation Volunteer', 'Volunteering', 'Eilat', 0,
   'Assist marine biologists with coral reef monitoring and beach cleanups.',
   array['marine','life','conservation','volunteer','volunteering']),

  ('20', 'Sustainability & Climate Workshop', 'Workshop', 'Modiin', 16,
   'Learn about sustainability practices and environmental impact.',
   array['sustainability','climate','workshop']),

  ('21', 'Hotel Management Job Shadow', 'Job Shadowing', 'Eilat', 0,
   'Spend a day shadowing hotel managers and learning hospitality operations.',
   array['hotel','management','job','shadow','shadowing']),

  ('22', 'Cyber Security Networking Event', 'Professional Meetings', 'Modiin', 18,
   'Meet cyber security professionals and discuss careers in digital security.',
   array['cyber','security','networking','event','professional','meetings']),

  ('23', 'Youth Education Internship', 'Internship', 'Nazareth', 0,
   'Assist educators in youth learning programs and workshops.',
   array['youth','education','internship']),

  ('24', 'Northern Campus Exploration Day', 'University Visit', 'Nazareth', 7,
   'Visit university facilities, meet students, and attend mini lectures.',
   array['northern','campus','exploration','day','university','visit']),

  ('25', 'Youth Environmental Club', 'Extracurricular', 'Nazareth', 0,
   'Students organize sustainability projects and environmental awareness campaigns.',
   array['youth','environmental','club','extracurricular']),

  ('26', 'Robotics Club', 'Extracurricular', 'Haifa', 15,
   'Join a robotics team and build programmable robots for competitions.',
   array['robotics','club','extracurricular']),

  ('27', 'Photography Club', 'Extracurricular', 'Haifa', 12,
   'Learn photography techniques and participate in creative exhibitions.',
   array['photography','club','extracurricular']),

  ('28', 'School Debate Team', 'Extracurricular', 'Jerusalem', 0,
   'Develop public speaking, persuasion and critical thinking skills.',
   array['school','debate','team','extracurricular'])
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- career_activities: best-effort links.
--
-- Heuristic: an activity is linked to a career when the activity's title or
-- category shares a clear domain keyword with the career's title or tags
-- (e.g. "tech"/"computer"/"software" -> Software Engineer / Data Scientist /
-- Cybersecurity Analyst / UX-UI Designer; "engineering"/"robotics" ->
-- Mechanical/Civil Engineer; "medical"/"hospital" -> Doctor; "architecture"
-- -> Architect; "law"/"legal" -> Lawyer; "environment"/"sustainability"/
-- "marine" -> Environmental Scientist; "writing"/"debate" -> Journalist;
-- "startup"/"business" -> Business Analyst; "education"/"youth" -> Teacher;
-- "photography" -> Graphic Designer). This is intentionally sparse: generic
-- activities with no clear domain keyword (e.g. plain "University Open Day
-- Visit", "Professional Networking Meetup", "Animal Shelter Volunteer") are
-- left unlinked rather than guessed at.
-- ----------------------------------------------------------------------------
insert into public.career_activities (career_id, activity_id) values
  ('2', '1'),   -- Doctor <- Hospital Volunteer Program
  ('5', '2'),   -- Mechanical Engineer <- Engineering Career Workshop
  ('7', '2'),   -- Civil Engineer <- Engineering Career Workshop
  ('1', '3'),   -- Software Engineer <- Job Shadowing at Tech Company
  ('6', '3'),   -- Data Scientist <- Job Shadowing at Tech Company
  ('10', '3'),  -- Cybersecurity Analyst <- Job Shadowing at Tech Company
  ('16', '3'),  -- UX/UI Designer <- Job Shadowing at Tech Company
  ('13', '8'),  -- Business Analyst <- Startup Founder Q&A
  ('5', '9'),   -- Mechanical Engineer <- Robotics Engineering Workshop
  ('1', '9'),   -- Software Engineer <- Robotics Engineering Workshop
  ('3', '10'),  -- Architect <- Architecture Job Shadow Day
  ('12', '11'), -- Environmental Scientist <- Environmental Volunteer Cleanup
  ('2', '12'),  -- Doctor <- Medical Research Internship Intro
  ('6', '13'),  -- Data Scientist <- University Science Lab Tour
  ('12', '13'), -- Environmental Scientist <- University Science Lab Tour
  ('14', '14'), -- Journalist <- Creative Writing Workshop
  ('4', '15'),  -- Lawyer <- Law Firm Job Shadow Program
  ('1', '17'),  -- Software Engineer <- Tech Industry Networking Event
  ('6', '17'),  -- Data Scientist <- Tech Industry Networking Event
  ('10', '17'), -- Cybersecurity Analyst <- Tech Industry Networking Event
  ('1', '18'),  -- Software Engineer <- Computer Science University Visit
  ('6', '18'),  -- Data Scientist <- Computer Science University Visit
  ('10', '18'), -- Cybersecurity Analyst <- Computer Science University Visit
  ('16', '18'), -- UX/UI Designer <- Computer Science University Visit
  ('12', '19'), -- Environmental Scientist <- Marine Life Conservation Volunteer
  ('12', '20'), -- Environmental Scientist <- Sustainability & Climate Workshop
  ('10', '22'), -- Cybersecurity Analyst <- Cyber Security Networking Event
  ('11', '23'), -- Teacher <- Youth Education Internship
  ('12', '25'), -- Environmental Scientist <- Youth Environmental Club
  ('5', '26'),  -- Mechanical Engineer <- Robotics Club
  ('1', '26'),  -- Software Engineer <- Robotics Club
  ('8', '27'),  -- Graphic Designer <- Photography Club
  ('4', '28'),  -- Lawyer <- School Debate Team
  ('14', '28')  -- Journalist <- School Debate Team
on conflict (career_id, activity_id) do nothing;
