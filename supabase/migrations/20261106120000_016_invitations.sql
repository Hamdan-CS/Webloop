/*
# Invitations: owners invite a specific person to join their project by email

## Purpose
Lets a project owner invite a teammate by email (from the publish wizard's "Team &
links" step, and later from the project's Team tab). If the email belongs to an
existing WebLoop account, an invitation row is created and the invitee can accept or
decline it from their own "My Invitations" page. If no account exists for that email,
the caller is told so (no invitation is created).

## Changes

### 1. New table: invitations
- Mirrors the existing `applications` table's shape/RLS style (see migration 003).
- Fields: id, project_id, inviter_id, invitee_email, invitee_id (nullable until an
  account is resolved — always set on insert here since we require a match),
  role_title, message, status (pending/accepted/declined), created_at, updated_at.
- Unique on (project_id, invitee_email) so re-inviting the same address updates the
  existing invite instead of creating duplicates.
- RLS: the inviter (project owner) can select/insert/update/delete their own; the
  invitee can select/update (respond to) rows addressed to them.

### 2. New SECURITY DEFINER function: invite_user_by_email
- `profiles` has no public `email` column (email lives in `auth.users`, not reachable
  from the client via PostgREST). This function resolves an email to a `profiles` row
  the same way `get_profile_by_user_id` resolves a user id, scoped to project owners.
- Raises 'NOT_PROJECT_OWNER' if the caller doesn't own the project, 'USER_NOT_FOUND' if
  no WebLoop account matches the email, 'CANNOT_INVITE_SELF' if inviting themselves.
*/

-- ============================================================
-- 1. invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role_title text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, invitee_email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Inviters (project owners) can read invitations they sent
DROP POLICY IF EXISTS "select_own_sent_invitations" ON invitations;
CREATE POLICY "select_own_sent_invitations" ON invitations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = invitations.inviter_id AND profiles.user_id = auth.uid())
  );

-- Invitees can read invitations addressed to them
DROP POLICY IF EXISTS "select_own_received_invitations" ON invitations;
CREATE POLICY "select_own_received_invitations" ON invitations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = invitations.invitee_id AND profiles.user_id = auth.uid())
  );

-- Only project owners can insert invitations for their own projects
DROP POLICY IF EXISTS "insert_own_project_invitation" ON invitations;
CREATE POLICY "insert_own_project_invitation" ON invitations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects
      JOIN profiles ON profiles.id = projects.owner_id
      WHERE projects.id = invitations.project_id AND profiles.user_id = auth.uid() AND profiles.id = invitations.inviter_id)
  );

-- Invitees can update (accept/decline) invitations addressed to them
DROP POLICY IF EXISTS "respond_to_own_invitation" ON invitations;
CREATE POLICY "respond_to_own_invitation" ON invitations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = invitations.invitee_id AND profiles.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = invitations.invitee_id AND profiles.user_id = auth.uid())
  );

-- Inviters can cancel (delete) invitations they sent
DROP POLICY IF EXISTS "delete_own_sent_invitation" ON invitations;
CREATE POLICY "delete_own_sent_invitation" ON invitations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = invitations.inviter_id AND profiles.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_invitations_project ON invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- ============================================================
-- 2. invite_user_by_email(project_id, email, role_title, message)
-- ============================================================

CREATE OR REPLACE FUNCTION public.invite_user_by_email(
  p_project_id uuid,
  p_email text,
  p_role_title text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id uuid;
  v_invitee_user_id uuid;
  v_invitee_id uuid;
  v_invite invitations;
BEGIN
  SELECT profiles.id INTO v_inviter_id
  FROM profiles
  JOIN projects ON projects.owner_id = profiles.id
  WHERE profiles.user_id = auth.uid() AND projects.id = p_project_id;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'NOT_PROJECT_OWNER';
  END IF;

  SELECT id INTO v_invitee_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;

  IF v_invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  SELECT id INTO v_invitee_id FROM profiles WHERE user_id = v_invitee_user_id LIMIT 1;

  IF v_invitee_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_invitee_id = v_inviter_id THEN
    RAISE EXCEPTION 'CANNOT_INVITE_SELF';
  END IF;

  INSERT INTO invitations (project_id, inviter_id, invitee_email, invitee_id, role_title, message, status)
  VALUES (p_project_id, v_inviter_id, lower(p_email), v_invitee_id, p_role_title, p_message, 'pending')
  ON CONFLICT (project_id, invitee_email)
  DO UPDATE SET role_title = EXCLUDED.role_title, message = EXCLUDED.message, status = 'pending', updated_at = now()
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_user_by_email(uuid, text, text, text) TO authenticated;
