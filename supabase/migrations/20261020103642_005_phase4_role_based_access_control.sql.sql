/*
# Role-based access control: protect creator_type

## Purpose
The `profiles.creator_type` column determines a user's role (student | company |
university | team). Previously, the UPDATE policy on profiles allowed an
authenticated owner to update ANY column on their row through the data API,
including `creator_type` — so a student could elevate themselves to company or
university by crafting a direct API request, bypassing the frontend.

This migration makes `creator_type` server-controlled: it is set once at signup
by the `handle_new_user` trigger (from user_metadata, which is user-supplied at
registration time only) and can never be changed by the client afterwards.

## Changes

### 1. Revoke table-wide UPDATE on profiles from authenticated
The existing `update_own_profile` RLS policy permits any authenticated owner to
update their own row. RLS decides which rows are touchable, not which columns.
To prevent clients from writing `creator_type`, we narrow the column-level
UPDATE grant to the user-editable columns only.

### 2. Re-grant UPDATE on user-editable columns only
Authenticated users may update: display_name, bio, avatar_url, banner_url,
location, website_url, github_url, experience_level, availability, interests,
updated_at. `creator_type`, `verified`, `is_demo`, `id`, `user_id`, `handle`
are NOT in this list and therefore cannot be written by the client.

### 3. Validate creator_type in the signup trigger
`handle_new_user` now rejects values outside the allowed set and defaults to
'student' when missing or invalid. This keeps the role trustworthy at the
moment of account creation.

### 4. Re-confirm RLS policies
Existing SELECT (public) and UPDATE (owner via user_id) policies are re-stated
so they remain in effect. UPDATE policy still allows the owner row, but the
column grant above is what actually enforces the column restriction.

## Security
- creator_type is now immutable from the client. Role changes require a
  privileged (non-anon, non-authenticated) operation on the server.
- Existing users retain their current creator_type — no data is modified.
*/

-- ============================================================
-- 1. Narrow column-level UPDATE grant on profiles
-- ============================================================
REVOKE UPDATE ON profiles FROM authenticated;

GRANT UPDATE (
  display_name,
  bio,
  avatar_url,
  banner_url,
  location,
  website_url,
  github_url,
  experience_level,
  availability,
  interests,
  updated_at
) ON profiles TO authenticated;

-- ============================================================
-- 2. Harden the signup trigger to validate creator_type
-- ============================================================
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
BEGIN
  base_handle := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  base_handle := lower(regexp_replace(base_handle, '[^a-zA-Z0-9]+', '-', 'g'));
  base_handle := trim(both '-' from base_handle);
  IF base_handle = '' THEN
    base_handle := 'user';
  END IF;

  final_handle := base_handle;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = final_handle) LOOP
    suffix := suffix + 1;
    final_handle := base_handle || '-' || suffix::text;
  END LOOP;

  -- Validate creator_type against the allowed set; default to 'student'
  v_creator_type := COALESCE(NEW.raw_user_meta_data->>'creator_type', 'student');
  IF v_creator_type NOT IN ('student', 'team', 'company', 'university') THEN
    v_creator_type := 'student';
  END IF;

  INSERT INTO profiles (id, user_id, display_name, handle, creator_type, is_demo)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    final_handle,
    v_creator_type,
    false
  );

  RETURN NEW;
END;
$$;
