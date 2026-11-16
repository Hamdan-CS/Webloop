-- 026_teams (Part B): teams are reusable groups of students.
--
-- A student creates a team once (name, optional logo/bio) and uses it for many
-- projects. Only students can create or be in teams. Membership changes go
-- through SECURITY DEFINER functions (like accept_invite in 017), so the rules
-- live in one place; clients can read teams/members and the owner can edit the
-- team's name, logo and bio directly.
--
-- Open questions from the plan, using the plan's suggestions:
--   * owner leaves  -> ownership passes to the longest-standing active member;
--                      nobody left -> team archived (archived_at), page stays.
--   * max team size -> 8 (active + invited).
--   * universities  -> not now (students only).

-- ============================================================
-- 1. Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 40),
  slug text NOT NULL UNIQUE,
  logo_url text,
  bio text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile ON team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_team_members_invited_by ON team_members(invited_by);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);

-- a project invitation can also be a team invitation ("join team X on project Y")
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invitations_team ON invitations(team_id);

-- ============================================================
-- 2. Helpers (SECURITY DEFINER: avoid RLS recursion on team_members)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_team_owner(p_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND profile_id = public.current_profile_id()
      AND role = 'owner' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND profile_id = public.current_profile_id() AND status = 'active'
  );
$$;

-- read policy helper: invited rows are visible to the invitee and the team owner
CREATE OR REPLACE FUNCTION public.can_see_team_invite(p_team_id uuid, p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_profile_id = public.current_profile_id() OR public.is_team_owner(p_team_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_team_invite(uuid, uuid) TO anon, authenticated;

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- anyone can read teams (public team pages)
DROP POLICY IF EXISTS "public_read_teams" ON teams;
CREATE POLICY "public_read_teams" ON teams FOR SELECT TO anon, authenticated USING (true);

-- only the owner edits name / logo / bio (creating goes through create_team)
DROP POLICY IF EXISTS "owner_update_team" ON teams;
CREATE POLICY "owner_update_team" ON teams FOR UPDATE TO authenticated
  USING (public.is_team_owner(id)) WITH CHECK (public.is_team_owner(id));

REVOKE INSERT, UPDATE, DELETE ON teams FROM anon, authenticated;
GRANT SELECT ON teams TO anon, authenticated;
GRANT UPDATE (name, logo_url, bio) ON teams TO authenticated;

-- active members are public; invited rows are visible to the invitee and the team's owner
DROP POLICY IF EXISTS "read_team_members" ON team_members;
CREATE POLICY "read_team_members" ON team_members FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public.can_see_team_invite(team_id, profile_id));

REVOKE INSERT, UPDATE, DELETE ON team_members FROM anon, authenticated;
GRANT SELECT ON team_members TO anon, authenticated;

-- ============================================================
-- 4. Team functions
-- ============================================================

-- create_team: the caller (a student) becomes the active owner
CREATE OR REPLACE FUNCTION public.create_team(p_name text, p_bio text DEFAULT NULL, p_logo_url text DEFAULT NULL)
RETURNS teams
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_base text;
  v_slug text;
  v_n int := 0;
  v_team teams;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_me AND creator_type = 'student') THEN
    RAISE EXCEPTION 'ONLY_STUDENTS';
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 2 AND 40 THEN RAISE EXCEPTION 'BAD_TEAM_NAME'; END IF;

  v_base := trim(both '-' from lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  IF v_base = '' THEN v_base := 'team'; END IF;
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM teams WHERE slug = v_slug) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;

  INSERT INTO teams (name, slug, bio, logo_url, created_by)
  VALUES (btrim(p_name), v_slug, nullif(btrim(p_bio), ''), nullif(btrim(p_logo_url), ''), v_me)
  RETURNING * INTO v_team;

  INSERT INTO team_members (team_id, profile_id, role, status, joined_at)
  VALUES (v_team.id, v_me, 'owner', 'active', now());

  RETURN v_team;
END;
$$;

-- invite_to_team: owner invites a student. With p_project_id (a project the
-- owner owns) it is also a project invitation: "<Name> invited you to join team
-- <Team> on project <Project>", accepted through accept_invite.
CREATE OR REPLACE FUNCTION public.invite_to_team(p_team_id uuid, p_profile_id uuid, p_project_id uuid DEFAULT NULL)
RETURNS team_members
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_row team_members;
  v_email text;
  v_new boolean;
BEGIN
  IF NOT public.is_team_owner(p_team_id) THEN RAISE EXCEPTION 'NOT_TEAM_OWNER'; END IF;
  IF p_profile_id = v_me THEN RAISE EXCEPTION 'CANNOT_INVITE_SELF'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND creator_type = 'student') THEN
    RAISE EXCEPTION 'ONLY_STUDENTS';
  END IF;
  IF (SELECT count(*) FROM team_members WHERE team_id = p_team_id) >= 8
     AND NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND profile_id = p_profile_id) THEN
    RAISE EXCEPTION 'TEAM_FULL';
  END IF;
  IF p_project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = v_me) THEN
    RAISE EXCEPTION 'NOT_PROJECT_OWNER';
  END IF;

  v_new := NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND profile_id = p_profile_id);
  INSERT INTO team_members (team_id, profile_id, role, status, invited_by)
  VALUES (p_team_id, p_profile_id, 'member', 'invited', v_me)
  ON CONFLICT (team_id, profile_id) DO NOTHING;
  SELECT * INTO v_row FROM team_members WHERE team_id = p_team_id AND profile_id = p_profile_id;

  IF p_project_id IS NOT NULL THEN
    SELECT lower(u.email) INTO v_email FROM auth.users u JOIN profiles p ON p.user_id = u.id WHERE p.id = p_profile_id;
    INSERT INTO invitations (project_id, inviter_id, invitee_email, invitee_id, team_id, status)
    VALUES (p_project_id, v_me, coalesce(v_email, p_profile_id::text), p_profile_id, p_team_id, 'pending')
    ON CONFLICT (project_id, invitee_email)
    DO UPDATE SET team_id = EXCLUDED.team_id, status = 'pending', updated_at = now();
  END IF;

  -- notification: "<Name> invited you to join team <Team> [on project <Project>]"
  IF v_new OR p_project_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, payload)
    SELECT p_profile_id, 'team_invitation', jsonb_build_object(
      'team_id', t.id, 'team_name', t.name, 'team_slug', t.slug,
      'inviter_id', v_me, 'inviter_name', (SELECT display_name FROM profiles WHERE id = v_me),
      'project_id', pr.id, 'project_title', pr.title, 'project_slug', pr.slug
    )
    FROM teams t LEFT JOIN projects pr ON pr.id = p_project_id
    WHERE t.id = p_team_id;
  END IF;

  RETURN v_row;
END;
$$;

-- respond_team_invite: accept or decline a team-only invite (no project)
CREATE OR REPLACE FUNCTION public.respond_team_invite(p_team_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_profile_id();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND profile_id = v_me AND status = 'invited') THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND';
  END IF;
  IF p_accept THEN
    UPDATE team_members SET status = 'active', joined_at = now() WHERE team_id = p_team_id AND profile_id = v_me;
    UPDATE invitations SET status = 'accepted', updated_at = now()
    WHERE team_id = p_team_id AND invitee_id = v_me AND status = 'pending';
    INSERT INTO project_members (project_id, profile_id)
    SELECT project_id, v_me FROM invitations WHERE team_id = p_team_id AND invitee_id = v_me AND status = 'accepted'
    ON CONFLICT (project_id, profile_id) DO NOTHING;
  ELSE
    DELETE FROM team_members WHERE team_id = p_team_id AND profile_id = v_me;
    UPDATE invitations SET status = 'declined', updated_at = now()
    WHERE team_id = p_team_id AND invitee_id = v_me AND status = 'pending';
  END IF;
END;
$$;

-- remove_team_member: owner removes a member or cancels an invite
CREATE OR REPLACE FUNCTION public.remove_team_member(p_team_id uuid, p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_team_owner(p_team_id) THEN RAISE EXCEPTION 'NOT_TEAM_OWNER'; END IF;
  IF p_profile_id = public.current_profile_id() THEN RAISE EXCEPTION 'OWNER_CANNOT_REMOVE_SELF'; END IF;
  DELETE FROM team_members WHERE team_id = p_team_id AND profile_id = p_profile_id;
  UPDATE invitations SET status = 'declined', updated_at = now()
  WHERE team_id = p_team_id AND invitee_id = p_profile_id AND status = 'pending';
END;
$$;

-- leave_team: a member leaves; an owner hands ownership to the longest-standing
-- active member, or the team is archived when nobody is left
CREATE OR REPLACE FUNCTION public.leave_team(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_profile_id();
  v_was_owner boolean;
  v_next uuid;
BEGIN
  SELECT role = 'owner' INTO v_was_owner FROM team_members WHERE team_id = p_team_id AND profile_id = v_me AND status = 'active';
  IF v_was_owner IS NULL THEN RAISE EXCEPTION 'NOT_TEAM_MEMBER'; END IF;

  DELETE FROM team_members WHERE team_id = p_team_id AND profile_id = v_me;

  IF v_was_owner THEN
    SELECT profile_id INTO v_next FROM team_members
    WHERE team_id = p_team_id AND status = 'active'
    ORDER BY joined_at NULLS LAST, created_at
    LIMIT 1;
    IF v_next IS NULL THEN
      UPDATE teams SET archived_at = now() WHERE id = p_team_id;
    ELSE
      UPDATE team_members SET role = 'owner' WHERE team_id = p_team_id AND profile_id = v_next;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team(text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.invite_to_team(uuid, uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.respond_team_invite(uuid, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.remove_team_member(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.leave_team(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_team(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_to_team(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_team_invite(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;

-- ============================================================
-- 5. accept_invite (latest live version, from 020) + team: accepting a team
--    invitation also makes the invitee an active team member
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_invite(p_invite_id uuid)
RETURNS invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invitee_id uuid;
  v_invite invitations;
BEGIN
  SELECT profiles.id INTO v_invitee_id
  FROM profiles
  WHERE profiles.user_id = auth.uid();

  IF v_invitee_id IS NULL THEN
    RAISE EXCEPTION 'NOT_SIGNED_IN';
  END IF;

  UPDATE invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = p_invite_id AND invitee_id = v_invitee_id
  RETURNING * INTO v_invite;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND';
  END IF;

  INSERT INTO project_members (project_id, profile_id, role)
  VALUES (v_invite.project_id, v_invitee_id, v_invite.role_title)
  ON CONFLICT (project_id, profile_id) DO NOTHING;

  UPDATE applications
  SET status = 'accepted', updated_at = now()
  WHERE project_id = v_invite.project_id
    AND applicant_id = v_invitee_id
    AND status = 'pending';

  IF v_invite.team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, profile_id, role, status, invited_by, joined_at)
    VALUES (v_invite.team_id, v_invitee_id, 'member', 'active', v_invite.inviter_id, now())
    ON CONFLICT (team_id, profile_id) DO UPDATE SET status = 'active', joined_at = coalesce(team_members.joined_at, now());
  END IF;

  RETURN v_invite;
END;
$function$;

-- declining a team invitation (invitee updates invitations.status directly,
-- as today) also drops the pending team_members row
CREATE OR REPLACE FUNCTION public.on_team_invitation_declined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NEW.status = 'declined' AND OLD.status <> 'declined' THEN
    DELETE FROM team_members WHERE team_id = NEW.team_id AND profile_id = NEW.invitee_id AND status = 'invited';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_team_declined ON invitations;
CREATE TRIGGER invitations_team_declined AFTER UPDATE OF status ON invitations
  FOR EACH ROW EXECUTE FUNCTION public.on_team_invitation_declined();

-- ============================================================
-- 6. projects.team_id: only to a team the owner is an active member of.
--    Setting it adds the team's active members to the project.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_project_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.team_id IS DISTINCT FROM OLD.team_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = NEW.team_id AND profile_id = NEW.owner_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'NOT_TEAM_MEMBER';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_check_team ON projects;
CREATE TRIGGER projects_check_team BEFORE INSERT OR UPDATE OF team_id ON projects
  FOR EACH ROW EXECUTE FUNCTION public.check_project_team();

CREATE OR REPLACE FUNCTION public.add_team_to_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.team_id IS DISTINCT FROM OLD.team_id) THEN
    INSERT INTO project_members (project_id, profile_id)
    SELECT NEW.id, tm.profile_id FROM team_members tm
    WHERE tm.team_id = NEW.team_id AND tm.status = 'active' AND tm.profile_id <> NEW.owner_id
    ON CONFLICT (project_id, profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_add_team ON projects;
CREATE TRIGGER projects_add_team AFTER INSERT OR UPDATE OF team_id ON projects
  FOR EACH ROW EXECUTE FUNCTION public.add_team_to_project();
