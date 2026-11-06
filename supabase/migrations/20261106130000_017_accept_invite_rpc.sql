/*
# Fix: accepting an invitation couldn't add the invitee to project_members

## Why
`project_members` RLS (migration 003, "manage_own_project_members") only lets the
*project owner* insert/update/delete rows in that table. The invitations feature
(migration 016) has the *invitee* accept their own invitation client-side, which then
tried to insert their own project_members row directly — RLS silently rejected it, so
"Accept" marked the invitation accepted without actually adding the person to the team.

## Fix
New SECURITY DEFINER function `accept_invite(p_invite_id uuid)`, matching the existing
pattern (`get_profile_by_user_id`, `invite_user_by_email`): verifies the caller is the
invitation's invitee, marks it accepted, and upserts the project_members row in one
server-side transaction — no RLS broadening needed on project_members.
*/

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

  RETURN v_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(uuid) TO authenticated;
