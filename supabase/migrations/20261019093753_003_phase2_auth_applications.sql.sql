/*
# Phase 2: Authentication, Profile Auto-Creation, and Applications

## Purpose
Enables real user accounts: sign-up creates a profile automatically, users can publish
projects, and students can apply to join projects. Fixes RLS policies that incorrectly
compared auth.uid() directly to owner_id (a profiles.id UUID, not an auth.users UUID).

## Changes

### 1. Fix RLS ownership checks on projects and child tables
- projects: change `auth.uid() = owner_id` to check through profiles.user_id
- project_skills, project_roles, project_members: same fix for parent ownership checks

### 2. Auto-create profile on signup (trigger)
- New function `handle_new_user()` fires after a row is inserted into auth.users
- Creates a profiles row with display_name from user_metadata, generated unique handle
- Trigger `on_auth_user_created` calls this function

### 3. New table: applications
- Students apply to join projects; project owners can accept/decline
- Fields: id, project_id, applicant_id, role_title, message, status (pending/accepted/declined)
- RLS: applicants can read/insert their own; project owners can read/update on their projects

### 4. Profile fetch helper
- New SECURITY DEFINER function `get_profile_by_user_id` so the frontend can fetch
  the authenticated user's profile row (profiles.id, display_name, handle, etc.)
  in a single call after sign-in.
*/

-- ============================================================
-- 1. Fix RLS: ownership through profiles.user_id
-- ============================================================

-- projects: SELECT stays public; INSERT/UPDATE/DELETE check through profiles
DROP POLICY IF EXISTS "insert_own_project" ON projects;
CREATE POLICY "insert_own_project" ON projects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_project" ON projects;
CREATE POLICY "update_own_project" ON projects FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_project" ON projects;
CREATE POLICY "delete_own_project" ON projects FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = projects.owner_id AND profiles.user_id = auth.uid())
  );

-- project_skills: ownership through parent project -> profiles.user_id
DROP POLICY IF EXISTS "manage_own_project_skills" ON project_skills;
CREATE POLICY "manage_own_project_skills" ON project_skills FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_skills.project_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_skills.project_id AND profiles.user_id = auth.uid())
  );

-- project_roles: same pattern
DROP POLICY IF EXISTS "manage_own_project_roles" ON project_roles;
CREATE POLICY "manage_own_project_roles" ON project_roles FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_roles.project_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_roles.project_id AND profiles.user_id = auth.uid())
  );

-- project_members: same pattern
DROP POLICY IF EXISTS "manage_own_project_members" ON project_members;
CREATE POLICY "manage_own_project_members" ON project_members FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_members.project_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = project_members.project_id AND profiles.user_id = auth.uid())
  );

-- ============================================================
-- 2. Auto-create profile on signup
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
BEGIN
  -- Use display_name from metadata, or fall back to email prefix
  base_handle := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  -- Sanitize handle: lowercase, replace spaces/special chars with hyphens
  base_handle := lower(regexp_replace(base_handle, '[^a-zA-Z0-9]+', '-', 'g'));
  base_handle := trim(both '-' from base_handle);
  IF base_handle = '' THEN
    base_handle := 'user';
  END IF;

  final_handle := base_handle;
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = final_handle) LOOP
    suffix := suffix + 1;
    final_handle := base_handle || '-' || suffix::text;
  END LOOP;

  INSERT INTO profiles (id, user_id, display_name, handle, creator_type, is_demo)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    final_handle,
    COALESCE(NEW.raw_user_meta_data->>'creator_type', 'student'),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. Applications table
-- ============================================================

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_title text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, applicant_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own applications
DROP POLICY IF EXISTS "select_own_applications" ON applications;
CREATE POLICY "select_own_applications" ON applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = applications.applicant_id AND profiles.user_id = auth.uid())
  );

-- Project owners can read applications on their projects
DROP POLICY IF EXISTS "select_project_owner_applications" ON applications;
CREATE POLICY "select_project_owner_applications" ON applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = applications.project_id AND profiles.user_id = auth.uid())
  );

-- Authenticated users can insert their own applications
DROP POLICY IF EXISTS "insert_own_application" ON applications;
CREATE POLICY "insert_own_application" ON applications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = applications.applicant_id AND profiles.user_id = auth.uid())
  );

-- Only project owners can update application status (accept/decline)
DROP POLICY IF EXISTS "update_project_owner_applications" ON applications;
CREATE POLICY "update_project_owner_applications" ON applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = applications.project_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = applications.project_id AND profiles.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_applications_project ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- ============================================================
-- 4. Profile fetch helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profile_by_user_id(user_uid uuid)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles WHERE user_id = user_uid LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_user_id(uuid) TO authenticated;
