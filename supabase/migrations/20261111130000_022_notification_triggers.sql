/*
# Notification triggers for join requests, invitation acceptance, comments and likes

## Why
The `notifications` table (migration 021) only ever received rows from admin
moderation actions (post removed/restored/verified, warnings). Student-facing
events that need a user's attention — a join request arriving on your
project, your join request being accepted or declined, your invitation being
accepted, a comment or like landing on your post — produced no notification
row at all, so there was no single place surfacing them with a way to jump
straight to the right screen. This migration adds narrowly-scoped
INSERT/UPDATE triggers that populate `notifications` for exactly those five
events, writing a denormalized payload (names/titles already resolved) so the
frontend's notification list needs no extra joins per row.

## Design
Each trigger function is SECURITY DEFINER (same pattern as migration 021's
`handle_comment_change` / `admin_remove_post`) because `notifications` has no
INSERT policy for `authenticated` by design — only these backend-owned
triggers may create a row in someone else's inbox. Every trigger explicitly
skips the "notify yourself" case (applying to your own project, liking/
commenting on your own post). Triggers fire regardless of whether the
underlying UPDATE came from a direct client call (`updateApplicationStatus`,
`respondToInvite`) or from inside another SECURITY DEFINER RPC
(`acceptApplicationAndAddMember`, `accept_invite`), since Postgres row
triggers run on the table itself, not on the caller's code path.

## Nothing existing is touched
No existing table, column, policy or RPC is modified — purely additive
trigger functions + CREATE TRIGGER statements on four already-existing
tables (applications, invitations, comments, reactions).
*/

-- ============================================================
-- 1. Join request received -> notify the project owner
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_application_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_owner_handle text;
  v_project_title text;
  v_applicant_name text;
BEGIN
  SELECT owner_id, title INTO v_owner_id, v_project_title FROM projects WHERE id = NEW.project_id;
  IF v_owner_id IS NULL OR v_owner_id = NEW.applicant_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_applicant_name FROM profiles WHERE id = NEW.applicant_id;
  SELECT handle INTO v_owner_handle FROM profiles WHERE id = v_owner_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (v_owner_id, 'application_received', jsonb_build_object(
    'application_id', NEW.id,
    'project_id', NEW.project_id,
    'project_title', v_project_title,
    'owner_handle', v_owner_handle,
    'applicant_id', NEW.applicant_id,
    'applicant_name', v_applicant_name
  ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_application_received() FROM public;

DROP TRIGGER IF EXISTS applications_notify_owner ON applications;
CREATE TRIGGER applications_notify_owner AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_received();

-- ============================================================
-- 2. Join request accepted/declined -> notify the applicant
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_application_decided()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title text;
  v_project_slug text;
BEGIN
  IF NEW.status = OLD.status OR NEW.status NOT IN ('accepted', 'declined') THEN
    RETURN NEW;
  END IF;

  SELECT title, slug INTO v_project_title, v_project_slug FROM projects WHERE id = NEW.project_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (
    NEW.applicant_id,
    CASE WHEN NEW.status = 'accepted' THEN 'application_accepted' ELSE 'application_declined' END,
    jsonb_build_object(
      'application_id', NEW.id,
      'project_id', NEW.project_id,
      'project_title', v_project_title,
      'project_slug', v_project_slug
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_application_decided() FROM public;

DROP TRIGGER IF EXISTS applications_notify_applicant ON applications;
CREATE TRIGGER applications_notify_applicant AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_decided();

-- ============================================================
-- 3. Invitation accepted -> notify the inviter
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_title text;
  v_project_slug text;
  v_invitee_name text;
BEGIN
  IF NEW.status = OLD.status OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT title, slug INTO v_project_title, v_project_slug FROM projects WHERE id = NEW.project_id;
  SELECT display_name INTO v_invitee_name FROM profiles WHERE id = NEW.invitee_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (NEW.inviter_id, 'invitation_accepted', jsonb_build_object(
    'invitation_id', NEW.id,
    'project_id', NEW.project_id,
    'project_title', v_project_title,
    'project_slug', v_project_slug,
    'invitee_id', NEW.invitee_id,
    'invitee_name', v_invitee_name
  ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_invitation_accepted() FROM public;

DROP TRIGGER IF EXISTS invitations_notify_inviter ON invitations;
CREATE TRIGGER invitations_notify_inviter AFTER UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION public.notify_invitation_accepted();

-- ============================================================
-- 4. Comment on your post -> notify the author
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_post_title text;
  v_commenter_name text;
BEGIN
  SELECT author_id, title INTO v_author_id, v_post_title FROM posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_commenter_name FROM profiles WHERE id = NEW.author_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (v_author_id, 'post_comment', jsonb_build_object(
    'post_id', NEW.post_id,
    'post_title', v_post_title,
    'comment_id', NEW.id,
    'commenter_id', NEW.author_id,
    'commenter_name', v_commenter_name
  ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_post_comment() FROM public;

DROP TRIGGER IF EXISTS comments_notify_author ON comments;
CREATE TRIGGER comments_notify_author AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

-- ============================================================
-- 5. Like on your post -> notify the author
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_post_title text;
  v_liker_name text;
BEGIN
  IF NEW.type <> 'like' THEN
    RETURN NEW;
  END IF;

  SELECT author_id, title INTO v_author_id, v_post_title FROM posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_liker_name FROM profiles WHERE id = NEW.profile_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (v_author_id, 'post_like', jsonb_build_object(
    'post_id', NEW.post_id,
    'post_title', v_post_title,
    'liker_id', NEW.profile_id,
    'liker_name', v_liker_name
  ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_post_like() FROM public;

DROP TRIGGER IF EXISTS reactions_notify_author ON reactions;
CREATE TRIGGER reactions_notify_author AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();
