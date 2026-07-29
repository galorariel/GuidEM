-- ----------------------------------------------------------------------------
-- Update handle_new_user trigger function to capture the language preference 
-- during signup metadata payload transfer.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger security definer SET search_path = public AS $$
DECLARE
  v_majors json;
  v_majors_arr text[] := '{}';
BEGIN
  v_majors := new.raw_user_meta_data -> 'majors';
  IF v_majors IS NOT NULL THEN
    SELECT array_agg(value::text) INTO v_majors_arr
    from json_array_elements_text(v_majors);
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    school,
    grade_level,
    city,
    majors,
    language
  )
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'school', ''),
    coalesce(new.raw_user_meta_data ->> 'grade_level', ''),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(v_majors_arr, '{}'::text[]),
    coalesce(new.raw_user_meta_data ->> 'language', 'en')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = excluded.full_name,
    role = excluded.role,
    school = excluded.school,
    grade_level = excluded.grade_level,
    city = excluded.city,
    majors = excluded.majors,
    language = excluded.language;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
