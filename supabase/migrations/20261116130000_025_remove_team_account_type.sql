-- 025_remove_team_account_type (Part A)
-- The 'team' account type was never offered at sign-up. Teams become groups
-- that students create (Part B). 'independent' is added now so Part C needs no
-- second constraint change. Checked before writing this: 0 profiles had
-- creator_type = 'team'.

-- 1. existing team accounts become students (0 rows today)
UPDATE profiles SET creator_type = 'student' WHERE creator_type = 'team';

-- 2. allowed account types
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_creator_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_creator_type_check
  CHECK (creator_type IN ('student', 'company', 'university', 'independent'));

-- 3. sign-up trigger (latest version from 019): unknown types fall back to student
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_handle text;
  final_handle text;
  suffix int := 0;
  v_creator_type text;
  v_display_name text;
  v_avatar_url text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  base_handle := lower(regexp_replace(v_display_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_handle := trim(both '-' from base_handle);
  IF base_handle = '' THEN
    base_handle := 'user';
  END IF;

  final_handle := base_handle;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = final_handle) LOOP
    suffix := suffix + 1;
    final_handle := base_handle || '-' || suffix::text;
  END LOOP;

  v_creator_type := COALESCE(NEW.raw_user_meta_data->>'creator_type', 'student');
  IF v_creator_type NOT IN ('student', 'company', 'university', 'independent') THEN
    v_creator_type := 'student';
  END IF;

  INSERT INTO profiles (id, user_id, display_name, handle, creator_type, avatar_url, is_demo)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    v_display_name,
    final_handle,
    v_creator_type,
    v_avatar_url,
    false
  );

  RETURN NEW;
END;
$function$;

-- 4. feed rule from 021: "students only" posts are visible to students
CREATE OR REPLACE FUNCTION public.can_view_post(p_removed_at timestamptz, p_visibility text, p_author_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      p_removed_at IS NULL
      AND (
        p_visibility = 'everyone'
        OR (
          p_visibility = 'students_only'
          AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.creator_type = 'student'
          )
        )
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = p_author_id AND profiles.user_id = auth.uid())
    OR public.is_admin();
$$;
