-- 028_group_chats (Part E): every project and every team gets a group chat.
--
-- Joining the project/team adds you to its group (triggers, SECURITY DEFINER
-- like 022); leaving sets left_at, so you keep what was said while you were
-- in it but get no new messages. Joining again clears left_at. Earlier
-- messages are visible to new members ("they see the group and earlier
-- messages"). 1-to-1 chats are unchanged: a message has either recipient_id
-- (1-to-1) or conversation_id (group).

-- ============================================================
-- 1. Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('project', 'team')),
  project_id uuid UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  team_id uuid UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_target CHECK (
    (kind = 'project' AND project_id IS NOT NULL AND team_id IS NULL)
    OR (kind = 'team' AND team_id IS NOT NULL AND project_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  muted boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_members_profile ON conversation_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_one_target;
ALTER TABLE messages ADD CONSTRAINT messages_one_target
  CHECK ((recipient_id IS NOT NULL) <> (conversation_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================================
-- 2. Helpers
-- ============================================================
-- active member now
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = public.current_profile_id() AND left_at IS NULL
  );
$$;

-- may I read a group message sent at p_created_at? (members; former members up to when they left)
CREATE OR REPLACE FUNCTION public.can_read_group_message(p_conversation_id uuid, p_created_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = public.current_profile_id()
      AND (left_at IS NULL OR p_created_at <= left_at)
  );
$$;

-- ever a member (to see the group in the list and its member list)
CREATE OR REPLACE FUNCTION public.was_conversation_member(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = public.current_profile_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_group_message(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.was_conversation_member(uuid) TO authenticated;

-- add / re-add / remove a member (used by the triggers below)
CREATE OR REPLACE FUNCTION public._conversation_join(p_conversation_id uuid, p_profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO conversation_members (conversation_id, profile_id)
  VALUES (p_conversation_id, p_profile_id)
  ON CONFLICT (conversation_id, profile_id) DO UPDATE SET left_at = NULL;
$$;
CREATE OR REPLACE FUNCTION public._conversation_leave(p_conversation_id uuid, p_profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversation_members SET left_at = now()
  WHERE conversation_id = p_conversation_id AND profile_id = p_profile_id AND left_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public._conversation_join(uuid, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._conversation_leave(uuid, uuid) FROM public, anon, authenticated;

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_conversations" ON conversations;
CREATE POLICY "members_read_conversations" ON conversations FOR SELECT TO authenticated
  USING (public.was_conversation_member(id));
REVOKE ALL ON conversations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON conversations FROM authenticated;
GRANT SELECT ON conversations TO authenticated;

DROP POLICY IF EXISTS "members_read_conversation_members" ON conversation_members;
CREATE POLICY "members_read_conversation_members" ON conversation_members FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_conversation_member(conversation_id));
REVOKE ALL ON conversation_members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON conversation_members FROM authenticated;
GRANT SELECT ON conversation_members TO authenticated;

-- group messages: read if you can read them, send only as a current member
DROP POLICY IF EXISTS "read_group_messages" ON messages;
CREATE POLICY "read_group_messages" ON messages FOR SELECT TO authenticated
  USING (conversation_id IS NOT NULL AND public.can_read_group_message(conversation_id, created_at));

DROP POLICY IF EXISTS "send_group_messages_members_only" ON messages;
CREATE POLICY "send_group_messages_members_only" ON messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (conversation_id IS NULL OR public.is_conversation_member(conversation_id));

GRANT INSERT (conversation_id) ON messages TO authenticated;

-- read state + mute (own row only)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversation_members SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND profile_id = public.current_profile_id();
$$;
CREATE OR REPLACE FUNCTION public.set_conversation_muted(p_conversation_id uuid, p_muted boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE conversation_members SET muted = p_muted
  WHERE conversation_id = p_conversation_id AND profile_id = public.current_profile_id();
$$;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_conversation_muted(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_conversation_muted(uuid, boolean) TO authenticated;

-- my groups for the Messages list: name, member count, last message, unread
CREATE OR REPLACE FUNCTION public.get_my_group_conversations()
RETURNS TABLE(
  conversation_id uuid, kind text, project_id uuid, team_id uuid,
  name text, slug text, logo_url text, owner_id uuid,
  member_count integer, muted boolean, left_at timestamptz, last_read_at timestamptz,
  last_body text, last_sender_name text, last_at timestamptz, unread integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id, c.kind, c.project_id, c.team_id,
    coalesce(pr.title, t.name), coalesce(pr.slug, t.slug), t.logo_url,
    coalesce(pr.owner_id, (SELECT tm.profile_id FROM team_members tm WHERE tm.team_id = t.id AND tm.role = 'owner' LIMIT 1)),
    (SELECT count(*)::int FROM conversation_members x WHERE x.conversation_id = c.id AND x.left_at IS NULL),
    me.muted, me.left_at, me.last_read_at,
    lm.body, lm.sender_name, lm.created_at,
    (SELECT count(*)::int FROM messages m
      WHERE m.conversation_id = c.id AND m.created_at > me.last_read_at
        AND m.sender_id <> me.profile_id
        AND (me.left_at IS NULL OR m.created_at <= me.left_at))
  FROM conversation_members me
  JOIN conversations c ON c.id = me.conversation_id
  LEFT JOIN projects pr ON pr.id = c.project_id
  LEFT JOIN teams t ON t.id = c.team_id
  LEFT JOIN LATERAL (
    SELECT m.body, p.display_name AS sender_name, m.created_at
    FROM messages m JOIN profiles p ON p.id = m.sender_id
    WHERE m.conversation_id = c.id AND (me.left_at IS NULL OR m.created_at <= me.left_at)
    ORDER BY m.created_at DESC LIMIT 1
  ) lm ON true
  WHERE me.profile_id = public.current_profile_id()
  ORDER BY coalesce(lm.created_at, c.created_at) DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_group_conversations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_group_conversations() TO authenticated;

-- ============================================================
-- 4. Membership triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_project_created_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid;
BEGIN
  INSERT INTO conversations (kind, project_id) VALUES ('project', NEW.id)
  ON CONFLICT (project_id) DO NOTHING
  RETURNING id INTO v_conv;
  IF v_conv IS NULL THEN SELECT id INTO v_conv FROM conversations WHERE project_id = NEW.id; END IF;
  PERFORM public._conversation_join(v_conv, NEW.owner_id);
  -- AFTER triggers run in name order, so projects_add_team (team project) has
  -- already added the team's active members: put them in the group too
  PERFORM public._conversation_join(v_conv, pm.profile_id) FROM project_members pm WHERE pm.project_id = NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS projects_group_chat ON projects;
CREATE TRIGGER projects_group_chat AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION public.on_project_created_group();

CREATE OR REPLACE FUNCTION public.on_project_member_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO v_conv FROM conversations WHERE project_id = NEW.project_id;
    IF v_conv IS NOT NULL THEN PERFORM public._conversation_join(v_conv, NEW.profile_id); END IF;
    RETURN NEW;
  ELSE
    SELECT id INTO v_conv FROM conversations WHERE project_id = OLD.project_id;
    -- the owner stays in their project's group
    IF v_conv IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = OLD.project_id AND owner_id = OLD.profile_id) THEN
      PERFORM public._conversation_leave(v_conv, OLD.profile_id);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS project_members_group_chat ON project_members;
CREATE TRIGGER project_members_group_chat AFTER INSERT OR DELETE ON project_members
  FOR EACH ROW EXECUTE FUNCTION public.on_project_member_group();

CREATE OR REPLACE FUNCTION public.on_team_created_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO conversations (kind, team_id) VALUES ('team', NEW.id) ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS teams_group_chat ON teams;
CREATE TRIGGER teams_group_chat AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION public.on_team_created_group();

CREATE OR REPLACE FUNCTION public.on_team_member_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO v_conv FROM conversations WHERE team_id = OLD.team_id;
    IF v_conv IS NOT NULL AND OLD.status = 'active' THEN PERFORM public._conversation_leave(v_conv, OLD.profile_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT id INTO v_conv FROM conversations WHERE team_id = NEW.team_id;
    IF v_conv IS NOT NULL THEN PERFORM public._conversation_join(v_conv, NEW.profile_id); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS team_members_group_chat ON team_members;
CREATE TRIGGER team_members_group_chat AFTER INSERT OR UPDATE OF status OR DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION public.on_team_member_group();

-- ============================================================
-- 5. Backfill: groups for existing projects and teams with current members
-- ============================================================
INSERT INTO conversations (kind, project_id)
SELECT 'project', p.id FROM projects p
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, profile_id)
SELECT c.id, p.owner_id FROM conversations c JOIN projects p ON p.id = c.project_id
WHERE p.owner_id IS NOT NULL
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, profile_id)
SELECT c.id, pm.profile_id FROM conversations c JOIN project_members pm ON pm.project_id = c.project_id
ON CONFLICT (conversation_id, profile_id) DO NOTHING;

INSERT INTO conversations (kind, team_id)
SELECT 'team', t.id FROM teams t
ON CONFLICT (team_id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, profile_id)
SELECT c.id, tm.profile_id FROM conversations c JOIN team_members tm ON tm.team_id = c.team_id
WHERE tm.status = 'active'
ON CONFLICT (conversation_id, profile_id) DO NOTHING;
