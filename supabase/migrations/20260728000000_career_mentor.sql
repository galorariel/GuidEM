-- Add mentor contact columns to the careers table
alter table public.careers
  add column if not exists mentor_name text,
  add column if not exists mentor_title text,
  add column if not exists mentor_contact_type text check (mentor_contact_type in ('linkedin', 'email', 'phone')),
  add column if not exists mentor_contact_value text;
