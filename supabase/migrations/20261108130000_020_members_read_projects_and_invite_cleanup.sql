/*
# Team members can read their projects; accepting an invite closes the old application

## Why
1. `projects` RLS only allowed public statuses (published/recruiting/in_progress/
   completed) plus the owner. A member invited to a **draft** project could
   accept the invite but then never open the project ("Project not found").
2. `accept_invite` added the member but left any earlier *pending* application
   from the same person untouched, so the owner kept seeing a join request
   from someone already on the team.

## Fix
1. `is_project_member(project_id)`: a SECURITY DEFINER helper, so the new
   projects policy doesn't read project_members through RLS. A plain EXISTS
   subquery would recurse: project_members' "manage_own_project_members" policy
   itself reads projects.
2. New SELECT policy `members_read_own_projects` on projects.
3. `accept_invite` now also marks that person's pending application(s) for the
   same project as accepted.
*/

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members m
    JOIN profiles pr ON pr.id = m.profile_id
    WHERE m.project_id = p_project_id
      AND pr.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "members_read_own_projects" ON projects;
CREATE POLICY "members_read_own_projects" ON projects FOR SELECT
  TO authenticated
  USING (public.is_project_member(id));

CREATE OR REPLACE FUNCTION public.accept_invite(p_invite_id uuid)
RETURNS invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- They're on the team now: an earlier pending application is no longer a request.
  UPDATE applications
  SET status = 'accepted', updated_at = now()
  WHERE project_id = v_invite.project_id
    AND applicant_id = v_invitee_id
    AND status = 'pending';

  RETURN v_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;
