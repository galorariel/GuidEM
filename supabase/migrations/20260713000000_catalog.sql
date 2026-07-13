-- Public-read career/activity catalog. Text ids match the existing
-- profiles.career / saved.item_id references (no change to those tables).

-- Postgres marks array_to_string as non-IMMUTABLE, so it can't be used
-- directly inside a `stored generated` column. This thin IMMUTABLE wrapper
-- lets us fold text[] columns into the tsvector generation expression.
create or replace function public.immutable_array_to_string(arr text[])
  returns text language sql immutable
  as $$ select array_to_string(arr, ' ') $$;

create table public.careers (
  id                   text primary key,
  title                text not null,
  description          text not null default '',
  required_education   text[] not null default '{}',
  required_skills      text[] not null default '{}',
  recommended_subjects text[] not null default '{}',
  salary_min           int,
  salary_max           int,
  salary_currency      text not null default '₪',
  salary_period        text not null default 'month',
  work_environment     text not null default '',
  demand_level         text not null default 'moderate'
                         check (demand_level in ('low','moderate','stable','high','very_high')),
  tags                 text[] not null default '{}',
  image_url            text,
  created_at           timestamptz not null default now(),
  search_vector        tsvector generated always as (
    to_tsvector('english',
      title || ' ' || description || ' ' ||
      public.immutable_array_to_string(required_skills) || ' ' ||
      public.immutable_array_to_string(recommended_subjects) || ' ' ||
      public.immutable_array_to_string(tags)
    )
  ) stored
);
create index careers_search_idx on public.careers using gin (search_vector);

create table public.activities (
  id              text primary key,
  title           text not null,
  category        text not null default '',
  location        text not null default '',
  price_amount    int not null default 0,
  price_currency  text not null default '₪',
  description     text not null default '',
  tags            text[] not null default '{}',
  image_url       text,
  created_at      timestamptz not null default now(),
  search_vector   tsvector generated always as (
    to_tsvector('english',
      title || ' ' || description || ' ' || category || ' ' ||
      public.immutable_array_to_string(tags)
    )
  ) stored
);
create index activities_search_idx on public.activities using gin (search_vector);

create table public.career_activities (
  career_id   text not null references public.careers (id) on delete cascade,
  activity_id text not null references public.activities (id) on delete cascade,
  primary key (career_id, activity_id)
);

alter table public.careers            enable row level security;
alter table public.activities         enable row level security;
alter table public.career_activities  enable row level security;

create policy "careers_public_read"    on public.careers           for select using (true);
create policy "activities_public_read" on public.activities        for select using (true);
create policy "career_acts_public_read" on public.career_activities for select using (true);
