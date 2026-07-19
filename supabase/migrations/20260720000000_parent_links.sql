-- SQL Migration: Parent-Child Linking & Progress Summaries Access
-- Enable parent accounts to link to children using a 6-character code and view progress summaries.

-- 1. Add link_code column to student profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS link_code text UNIQUE;

-- 2. Generator for link codes (excludes confusable characters: 0, O, 1, I, L)
CREATE OR REPLACE FUNCTION public.generate_link_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Trigger function to assign unique code to students automatically (case-insensitive)
CREATE OR REPLACE FUNCTION public.set_profile_link_code()
RETURNS trigger security definer SET search_path = public AS $$
DECLARE
  new_code text;
  exists_code boolean;
BEGIN
  -- Automatically generate code if the user is a student and doesn't have one
  IF lower(new.role) = 'student' AND (new.link_code IS NULL OR new.link_code = '') THEN
    LOOP
      new_code := public.generate_link_code();
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE link_code = new_code) INTO exists_code;
      IF NOT exists_code THEN
        new.link_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profile_link_code_check
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_link_code();

-- 4. Create parent_links junction table
CREATE TABLE IF NOT EXISTS public.parent_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        NOT null REFERENCES public.profiles (id) ON DELETE CASCADE,
  child_id    uuid        NOT null REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at  timestamptz NOT null DEFAULT now(),
  UNIQUE (parent_id, child_id),
  CHECK (parent_id <> child_id)
);

ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_links_select" ON public.parent_links;
CREATE POLICY "parent_links_select" ON public.parent_links
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

DROP POLICY IF EXISTS "parent_links_delete" ON public.parent_links;
CREATE POLICY "parent_links_delete" ON public.parent_links
  FOR DELETE USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- 5. Helper function to check parent-child link status (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_parent_of(p_child_id uuid)
RETURNS boolean security definer STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_links
    WHERE parent_id = auth.uid() AND child_id = p_child_id
  );
$$ LANGUAGE sql;

-- 6. RLS policy additions for cross-user profile and summary access
DROP POLICY IF EXISTS "profiles_select_linked_child" ON public.profiles;
CREATE POLICY "profiles_select_linked_child" ON public.profiles
  FOR SELECT USING (public.is_parent_of(id));

DROP POLICY IF EXISTS "progress_summaries_select_parent" ON public.progress_summaries;
CREATE POLICY "progress_summaries_select_parent" ON public.progress_summaries
  FOR SELECT USING (public.is_parent_of(user_id));

-- 7. Secure RPC function for parents to link child by sharing code (case-insensitive)
CREATE OR REPLACE FUNCTION public.link_child_by_code(p_code text)
RETURNS jsonb security definer SET search_path = public AS $$
DECLARE
  v_child_id uuid;
  v_parent_role text;
  v_child_role text;
  v_child_name text;
  v_child_career_goal text;
BEGIN
  -- 1. Check if caller is authenticated and has 'parent' role
  SELECT role INTO v_parent_role FROM public.profiles WHERE id = auth.uid();
  IF v_parent_role IS NULL OR lower(v_parent_role) <> 'parent' THEN
    RAISE EXCEPTION 'Access denied: caller is not registered as a parent.';
  END IF;

  -- 2. Validate child link code
  SELECT id, role, full_name, career INTO v_child_id, v_child_role, v_child_name, v_child_career_goal
  FROM public.profiles
  WHERE link_code = upper(trim(p_code));

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid link code: student profile not found.';
  END IF;

  IF lower(v_child_role) <> 'student' THEN
    RAISE EXCEPTION 'Invalid link code: matching account is not registered as a student.';
  END IF;

  IF v_child_id = auth.uid() THEN
    RAISE EXCEPTION 'Operation invalid: cannot link to your own profile.';
  END IF;

  -- 3. Insert connection into parent_links junction
  INSERT INTO public.parent_links (parent_id, child_id)
  VALUES (auth.uid(), v_child_id)
  ON CONFLICT (parent_id, child_id) DO NOTHING;

  -- 4. Return linked child metadata
  RETURN jsonb_build_object(
    'success', true,
    'child_id', v_child_id,
    'child_name', v_child_name,
    'career_goal', coalesce(v_child_career_goal, '')
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Backfill existing blank profile roles to 'student'
UPDATE public.profiles
SET role = 'student'
WHERE role IS NULL OR trim(role) = '';

-- 9. Normalize existing roles to lowercase for database consistency
UPDATE public.profiles
SET role = 'student'
WHERE lower(role) = 'student';

UPDATE public.profiles
SET role = 'parent'
WHERE lower(role) = 'parent';

-- 10. Backfill link codes for existing student profiles
UPDATE public.profiles
SET link_code = public.generate_link_code()
WHERE lower(role) = 'student' AND (link_code IS NULL OR trim(link_code) = '');
