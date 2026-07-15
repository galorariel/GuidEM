-- Round 3 (AI Guide): RIASEC / Holland codes on careers, to power
-- personality -> career recommendations. Additive; safe on the shared DB.
-- The careers.search_vector generated column names its sources explicitly,
-- so adding a column does not affect it.
alter table public.careers
  add column if not exists holland_codes text[] not null default '{}';

create index if not exists careers_holland_idx
  on public.careers using gin (holland_codes);

-- Seed the 16 catalog careers with priority-ordered RIASEC codes (strongest
-- fit first). Values are the 6 lowercase codes matching profiles.personality_type.
update public.careers set holland_codes = '{investigative,realistic,conventional}'  where id = '1';  -- Software Engineer
update public.careers set holland_codes = '{investigative,social,realistic}'         where id = '2';  -- Doctor
update public.careers set holland_codes = '{artistic,investigative,realistic}'        where id = '3';  -- Architect
update public.careers set holland_codes = '{enterprising,investigative,social}'       where id = '4';  -- Lawyer
update public.careers set holland_codes = '{realistic,investigative,conventional}'    where id = '5';  -- Mechanical Engineer
update public.careers set holland_codes = '{investigative,conventional,realistic}'    where id = '6';  -- Data Scientist
update public.careers set holland_codes = '{realistic,investigative,conventional}'    where id = '7';  -- Civil Engineer
update public.careers set holland_codes = '{artistic,realistic,enterprising}'         where id = '8';  -- Graphic Designer
update public.careers set holland_codes = '{social,investigative,artistic}'           where id = '9';  -- Psychologist
update public.careers set holland_codes = '{investigative,conventional,realistic}'    where id = '10'; -- Cybersecurity Analyst
update public.careers set holland_codes = '{social,artistic,enterprising}'            where id = '11'; -- Teacher
update public.careers set holland_codes = '{investigative,realistic,social}'          where id = '12'; -- Environmental Scientist
update public.careers set holland_codes = '{enterprising,conventional,investigative}' where id = '13'; -- Business Analyst
update public.careers set holland_codes = '{artistic,enterprising,social}'            where id = '14'; -- Journalist
update public.careers set holland_codes = '{investigative,conventional,social}'       where id = '15'; -- Pharmacist
update public.careers set holland_codes = '{artistic,investigative,enterprising}'     where id = '16'; -- UX/UI Designer
