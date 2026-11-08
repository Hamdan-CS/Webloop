/*
  # Use OAuth provider metadata (Google name/avatar) on signup

  Google sign-in populates `full_name` / `name` / `avatar_url` / `picture` in
  auth.users.raw_user_meta_data, not the `display_name` key our own
  email/password signup writes via signUp()'s options.data. The signup
  trigger only ever checked `display_name`, so a Google sign-up previously
  fell straight through to the email's local-part as a display name and got
  no avatar. Widen the lookup and seed avatar_url from Google's profile photo.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_creator_type NOT IN ('student', 'team', 'company', 'university') THEN
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
$$;
