/*
# Feed: posts, comments, reactions, bookmarks, views, reports, tries, admin moderation

## Purpose
Adds the "Feed" feature: students (and any creator type) can publish guide /
pictures / text posts, with likes, comments, bookmarks, "I tried this" (linkable
to a project for the contribution grid), daily-capped guide views, reporting with
auto-hide, and admin moderation (remove/restore/verify/warn).

## Why this shape (read before touching)

### No existing admin/role concept
The live schema's only role field is `profiles.creator_type`, constrained to
exactly `student|team|company|university` — there is no admin flag anywhere.
Rather than widen that check constraint or add a column to `profiles` (both of
which would be a change to an *existing* table/column), this migration adds a
new, fully additive `admin_roles` table. Granting admin is a manual
`INSERT INTO admin_roles (profile_id) VALUES (...)` run by whoever operates the
project — there is no self-serve UI for it, by design.

### Guests get zero direct table access
`anon` is explicitly revoked from every table this migration creates. The only
way a guest reads feed content is `get_guest_feed()`, a SECURITY DEFINER RPC
capped at the 2 newest public (`visibility='everyone'`), non-removed posts.
Everything else (likes, comments, "I tried this", posting) requires auth, which
the RLS policies below enforce independently of the frontend.

### Students-only visibility is enforced in RLS, not just the UI
`can_view_post()` is a SECURITY DEFINER helper (same pattern as migration 020's
`is_project_member`) so the policy doesn't need to re-check profiles per row via
a plain EXISTS that could get expensive, and so it can be reused identically by
`posts`, `comments`, `reactions`, etc. A company/university profile can never
read a `students_only` post, even via a raw PostgREST request.

### "Not helpful" counts and report counts are hidden from regular users
Column-level grants exclude `not_helpful_count` and `report_count` from the
general `authenticated` SELECT grant (mirroring migration 005's/009's approach
of narrowing grants rather than only filtering in RLS). Admins read them through
`admin_list_moderation_queue()`, a SECURITY DEFINER function that bypasses
column grants because it runs as the function owner.

### Posting-pause (3 warnings -> 7 days) has no new column
`is_posting_paused()` computes the pause window from the `warnings` table
itself (the timestamp of the 3rd-ever warning + 7 days) instead of adding a
`profiles.posting_paused_until` column — again, additive only.

### "I tried this" -> contribution grid
The existing `daily_contributions`/`daily_contribution_tasks` RPCs (migration
015) are task-submission-specific and are NOT modified here. This migration
adds a parallel `daily_tries(student_id, days)` RPC with the same per-day shape
so the frontend can merge try-activity into the existing <ContributionGrid>
without touching the existing, already-shipped grid functions.

### Fixed tag list
Reuses the 8-tag taxonomy that proved out in the reference prototype (Claude,
AI tools, React, Supabase, Design, Python, Hackathons, Careers) — this is
product taxonomy, not prototype-only fake data, so it's kept. Enforced with a
plain `<@` (contained-in) CHECK, 1-3 tags per post.

## New tables
admin_roles, posts, post_images, comments, reactions, bookmarks, post_views,
reports, tries, user_interests, warnings, notifications.

## Security
- RLS enabled on every new table. `anon` revoked everywhere except the two
  guest RPCs. Admin mutations go through narrow SECURITY DEFINER RPCs, never a
  blanket admin UPDATE policy.
- Nothing in this migration touches an existing table, column, or policy.
*/

-- ============================================================
-- 0. Shared helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

CREATE TABLE IF NOT EXISTS admin_roles (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_roles FROM anon, authenticated;
-- No SELECT/INSERT/UPDATE/DELETE policies at all: this table is reachable only
-- through is_admin() and the admin RPCs below (SECURITY DEFINER bypasses RLS
-- and column grants because those functions run as the table owner).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles ar
    JOIN profiles p ON p.id = ar.profile_id
    WHERE p.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 0b. warnings (created early: is_posting_paused() below reads it, and it has
-- no dependency of its own on posts) — RLS policy for it is further down,
-- next to the rest of the per-table policies, to keep that grouping together.
-- ============================================================

CREATE TABLE IF NOT EXISTS warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON warnings FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_warnings_profile ON warnings(profile_id, created_at);

-- ============================================================
-- 1. posts
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('guide', 'pictures', 'text')),
  visibility text NOT NULL DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'students_only')),
  title text NOT NULL,
  body text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  bookmark_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  try_count integer NOT NULL DEFAULT 0,
  not_helpful_count integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  removed_at timestamptz,
  removed_reason text,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_guide_needs_two_steps CHECK (post_type <> 'guide' OR jsonb_array_length(steps) >= 2),
  CONSTRAINT posts_tags_count CHECK (cardinality(tags) BETWEEN 1 AND 3),
  CONSTRAINT posts_tags_fixed_list CHECK (
    tags <@ ARRAY['Claude', 'AI tools', 'React', 'Supabase', 'Design', 'Python', 'Hackathons', 'Careers']::text[]
  )
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON posts FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING gin(tags);

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
              AND profiles.creator_type IN ('student', 'team')
          )
        )
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = p_author_id AND profiles.user_id = auth.uid())
    OR public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.can_view_post(timestamptz, text, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.can_view_post(timestamptz, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(timestamptz, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_posting_paused(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT created_at, row_number() OVER (ORDER BY created_at) AS rn
      FROM warnings
      WHERE profile_id = p_profile_id
    ) w
    WHERE w.rn = 3 AND now() < w.created_at + interval '7 days'
  );
$$;

REVOKE ALL ON FUNCTION public.is_posting_paused(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_posting_paused(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_posting_paused(uuid) TO authenticated;

DROP POLICY IF EXISTS "select_visible_posts" ON posts;
CREATE POLICY "select_visible_posts" ON posts FOR SELECT
  TO authenticated
  USING (public.can_view_post(removed_at, visibility, author_id));

DROP POLICY IF EXISTS "insert_own_post" ON posts;
CREATE POLICY "insert_own_post" ON posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = public.current_profile_id() AND NOT public.is_posting_paused(author_id));

DROP POLICY IF EXISTS "update_own_post" ON posts;
CREATE POLICY "update_own_post" ON posts FOR UPDATE
  TO authenticated
  USING (author_id = public.current_profile_id())
  WITH CHECK (author_id = public.current_profile_id());

DROP POLICY IF EXISTS "delete_own_post" ON posts;
CREATE POLICY "delete_own_post" ON posts FOR DELETE
  TO authenticated
  USING (author_id = public.current_profile_id());

-- Column-level grants: authors can only ever write their own content columns,
-- never the moderation columns (removed_at/removed_reason/is_verified) or the
-- counters (those are trigger-maintained). Moderation writes happen only
-- through the SECURITY DEFINER admin RPCs further down, which bypass grants.
GRANT SELECT (
  id, author_id, post_type, visibility, title, body, steps, tags,
  like_count, comment_count, bookmark_count, view_count, try_count,
  is_verified, removed_at, removed_reason, edited_at, created_at, updated_at
) ON posts TO authenticated;

GRANT INSERT (
  id, author_id, post_type, visibility, title, body, steps, tags
) ON posts TO authenticated;

GRANT UPDATE (
  post_type, visibility, title, body, steps, tags, edited_at
) ON posts TO authenticated;

GRANT DELETE ON posts TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_posts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_posts_updated_at();

-- ============================================================
-- 2. post_images
-- ============================================================

CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  path text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, position)
);

ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON post_images FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);

CREATE OR REPLACE FUNCTION public.enforce_post_image_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM post_images WHERE post_id = NEW.post_id) >= 8 THEN
    RAISE EXCEPTION 'POST_IMAGE_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_images_limit ON post_images;
CREATE TRIGGER post_images_limit BEFORE INSERT ON post_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_image_limit();

DROP POLICY IF EXISTS "select_visible_post_images" ON post_images;
CREATE POLICY "select_visible_post_images" ON post_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "insert_own_post_images" ON post_images;
CREATE POLICY "insert_own_post_images" ON post_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = public.current_profile_id())
  );

DROP POLICY IF EXISTS "delete_own_post_images" ON post_images;
CREATE POLICY "delete_own_post_images" ON post_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = public.current_profile_id())
  );

GRANT SELECT, INSERT, DELETE ON post_images TO authenticated;

-- ============================================================
-- 3. comments
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON comments FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);

DROP POLICY IF EXISTS "select_visible_post_comments" ON comments;
CREATE POLICY "select_visible_post_comments" ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "insert_own_comment" ON comments;
CREATE POLICY "insert_own_comment" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "update_own_comment" ON comments;
CREATE POLICY "update_own_comment" ON comments FOR UPDATE
  TO authenticated
  USING (author_id = public.current_profile_id())
  WITH CHECK (author_id = public.current_profile_id());

DROP POLICY IF EXISTS "delete_own_comment" ON comments;
CREATE POLICY "delete_own_comment" ON comments FOR DELETE
  TO authenticated
  USING (author_id = public.current_profile_id());

GRANT SELECT, INSERT, DELETE ON comments TO authenticated;
GRANT UPDATE (body, edited_at) ON comments TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_comment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comments_counter ON comments;
CREATE TRIGGER comments_counter AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_change();

-- ============================================================
-- 4. reactions (like / not_helpful)
-- ============================================================

CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'not_helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id, type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reactions FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

DROP POLICY IF EXISTS "select_own_reactions" ON reactions;
CREATE POLICY "select_own_reactions" ON reactions FOR SELECT
  TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_reaction" ON reactions;
CREATE POLICY "insert_own_reaction" ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = reactions.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "delete_own_reaction" ON reactions;
CREATE POLICY "delete_own_reaction" ON reactions FOR DELETE
  TO authenticated
  USING (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, DELETE ON reactions TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_reaction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'like' THEN
      UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE posts SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'like' THEN
      UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    ELSE
      UPDATE posts SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reactions_counter ON reactions;
CREATE TRIGGER reactions_counter AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_reaction_change();

-- ============================================================
-- 5. bookmarks
-- ============================================================

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bookmarks FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_bookmarks_profile ON bookmarks(profile_id);

DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks FOR SELECT
  TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "insert_own_bookmark" ON bookmarks;
CREATE POLICY "insert_own_bookmark" ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = bookmarks.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "delete_own_bookmark" ON bookmarks;
CREATE POLICY "delete_own_bookmark" ON bookmarks FOR DELETE
  TO authenticated
  USING (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, DELETE ON bookmarks TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_bookmark_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookmarks_counter ON bookmarks;
CREATE TRIGGER bookmarks_counter AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.handle_bookmark_change();

-- ============================================================
-- 6. post_views (guides only, one per user per post per day)
-- ============================================================

CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id, viewed_on)
);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON post_views FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);

DROP POLICY IF EXISTS "select_own_post_views" ON post_views;
CREATE POLICY "select_own_post_views" ON post_views FOR SELECT
  TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "insert_own_post_view" ON post_views;
CREATE POLICY "insert_own_post_view" ON post_views FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_views.post_id
        AND posts.post_type = 'guide'
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

GRANT SELECT, INSERT ON post_views TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_post_view_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_views_counter ON post_views;
CREATE TRIGGER post_views_counter AFTER INSERT ON post_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_view_insert();

-- ============================================================
-- 7. reports (auto-hide at 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reports FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reports_post ON reports(post_id);

DROP POLICY IF EXISTS "select_own_reports_or_admin" ON reports;
CREATE POLICY "select_own_reports_or_admin" ON reports FOR SELECT
  TO authenticated
  USING (reporter_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_report" ON reports;
CREATE POLICY "insert_own_report" ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = public.current_profile_id()
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = reports.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

GRANT SELECT, INSERT ON reports TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_report_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE posts SET report_count = report_count + 1
  WHERE id = NEW.post_id
  RETURNING report_count INTO v_new_count;

  IF v_new_count >= 3 THEN
    UPDATE posts
    SET removed_at = now(), removed_reason = 'Auto-hidden: reached 3 reports, awaiting admin review'
    WHERE id = NEW.post_id AND removed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_counter ON reports;
CREATE TRIGGER reports_counter AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_report_insert();

-- ============================================================
-- 8. tries ("I tried this", optionally linked to one of the user's projects)
-- ============================================================

CREATE TABLE IF NOT EXISTS tries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id)
);

ALTER TABLE tries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tries FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_tries_post ON tries(post_id);
CREATE INDEX IF NOT EXISTS idx_tries_profile ON tries(profile_id, created_at);

DROP POLICY IF EXISTS "select_own_tries" ON tries;
CREATE POLICY "select_own_tries" ON tries FOR SELECT
  TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "insert_own_try" ON tries;
CREATE POLICY "insert_own_try" ON tries FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = public.current_profile_id()
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM projects
        JOIN profiles ON profiles.id = projects.owner_id
        WHERE projects.id = tries.project_id AND profiles.user_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = tries.post_id
        AND public.can_view_post(posts.removed_at, posts.visibility, posts.author_id)
    )
  );

DROP POLICY IF EXISTS "delete_own_try" ON tries;
CREATE POLICY "delete_own_try" ON tries FOR DELETE
  TO authenticated
  USING (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, DELETE ON tries TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_try_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET try_count = try_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET try_count = GREATEST(try_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tries_counter ON tries;
CREATE TRIGGER tries_counter AFTER INSERT OR DELETE ON tries
  FOR EACH ROW EXECUTE FUNCTION public.handle_try_change();

-- daily_tries: same per-day shape as migration 015's daily_contributions, kept
-- separate so the existing, already-shipped contribution-grid RPCs are never
-- touched. The frontend merges this with daily_contributions client-side.
CREATE OR REPLACE FUNCTION public.daily_tries(student_id uuid, days integer DEFAULT 365)
RETURNS TABLE (day date, tries_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day
    FROM tries
    WHERE profile_id = student_id
      AND created_at >= (now() - ((greatest(days, 1) - 1) || ' days')::interval)
  ),
  series AS (
    SELECT generate_series(
      CURRENT_DATE - (greatest(days, 1) - 1),
      CURRENT_DATE,
      interval '1 day'
    )::date AS day
  )
  SELECT s.day, COUNT(m.day)::integer AS tries_count
  FROM series s
  LEFT JOIN mine m ON m.day = s.day
  GROUP BY s.day
  ORDER BY s.day;
$$;

GRANT EXECUTE ON FUNCTION public.daily_tries(uuid, integer) TO anon, authenticated;

-- ============================================================
-- 9. user_interests (onboarding topic picker, "For you" sort)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_interests (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (
    tag = ANY (ARRAY['Claude', 'AI tools', 'React', 'Supabase', 'Design', 'Python', 'Hackathons', 'Careers'])
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, tag)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_interests FROM anon, authenticated;

DROP POLICY IF EXISTS "manage_own_interests" ON user_interests;
CREATE POLICY "manage_own_interests" ON user_interests FOR ALL
  TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

GRANT SELECT, INSERT, DELETE ON user_interests TO authenticated;

-- ============================================================
-- 10. warnings RLS (table itself created earlier, in section 0b, since
-- is_posting_paused() needs it to exist before posts' INSERT policy is created)
-- ============================================================

DROP POLICY IF EXISTS "select_own_warnings_or_admin" ON warnings;
CREATE POLICY "select_own_warnings_or_admin" ON warnings FOR SELECT
  TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_admin());

GRANT SELECT ON warnings TO authenticated;
-- No INSERT policy: warnings are created only by admin_warn_user() below.

-- ============================================================
-- 11. notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON notifications FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated
  USING (recipient_id = public.current_profile_id());

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = public.current_profile_id())
  WITH CHECK (recipient_id = public.current_profile_id());

GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE (read_at) ON notifications TO authenticated;
-- No INSERT policy: notifications are created only by the admin RPCs below.

-- ============================================================
-- 12. get_guest_feed() — the only way `anon` reads feed content
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_guest_feed()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'post_type', p.post_type,
      'title', p.title,
      'body', p.body,
      'steps', p.steps,
      'tags', p.tags,
      'like_count', p.like_count,
      'comment_count', p.comment_count,
      'is_verified', p.is_verified,
      'created_at', p.created_at,
      'author', jsonb_build_object(
        'id', a.id,
        'display_name', a.display_name,
        'handle', a.handle,
        'avatar_url', a.avatar_url,
        'creator_type', a.creator_type
      ),
      'images', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('path', pi.path, 'position', pi.position, 'caption', pi.caption) ORDER BY pi.position)
        FROM post_images pi WHERE pi.post_id = p.id
      ), '[]'::jsonb)
    ) AS row
    FROM posts p
    JOIN profiles a ON a.id = p.author_id
    WHERE p.visibility = 'everyone' AND p.removed_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT 2
  ) rows;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_feed() TO anon, authenticated;

-- ============================================================
-- 13. Admin moderation RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_remove_post(p_post_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE posts SET removed_at = now(), removed_reason = p_reason
  WHERE id = p_post_id
  RETURNING author_id INTO v_author_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (v_author_id, 'post_removed', jsonb_build_object('post_id', p_post_id, 'reason', p_reason));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_post(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_restore_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE posts SET removed_at = NULL, removed_reason = NULL
  WHERE id = p_post_id
  RETURNING author_id INTO v_author_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (v_author_id, 'post_restored', jsonb_build_object('post_id', p_post_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_restore_post(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_verify_post(p_post_id uuid, p_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE posts SET is_verified = p_verified
  WHERE id = p_post_id
  RETURNING author_id INTO v_author_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;

  IF p_verified THEN
    INSERT INTO notifications (recipient_id, type, payload)
    VALUES (v_author_id, 'post_verified', jsonb_build_object('post_id', p_post_id));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_post(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_warn_user(p_profile_id uuid, p_reason text)
RETURNS warnings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_warning warnings;
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  v_admin_id := public.current_profile_id();

  INSERT INTO warnings (profile_id, admin_id, reason)
  VALUES (p_profile_id, v_admin_id, p_reason)
  RETURNING * INTO v_warning;

  SELECT count(*) INTO v_count FROM warnings WHERE profile_id = p_profile_id;

  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (p_profile_id, 'warning', jsonb_build_object(
    'reason', p_reason,
    'count', v_count,
    'paused', v_count >= 3
  ));

  RETURN v_warning;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_warn_user(uuid, text) TO authenticated;

-- Moderation queue: exposes the hidden not_helpful_count/report_count columns
-- to admins only, bypassing the narrow column grant on posts (SECURITY
-- DEFINER functions run as the table owner, not the caller).
CREATE OR REPLACE FUNCTION public.admin_list_moderation_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'author_id', p.author_id,
      'author_name', a.display_name,
      'report_count', p.report_count,
      'not_helpful_count', p.not_helpful_count,
      'is_verified', p.is_verified,
      'removed_at', p.removed_at,
      'removed_reason', p.removed_reason,
      'created_at', p.created_at
    ) ORDER BY p.report_count DESC, p.not_helpful_count DESC)
    FROM posts p
    JOIN profiles a ON a.id = p.author_id
    WHERE p.report_count > 0 OR p.not_helpful_count > 0 OR p.removed_at IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_moderation_queue() TO authenticated;

-- ============================================================
-- 14. Storage: post-media bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-media', 'post-media', true, 5242880, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post media public read" ON storage.objects;
CREATE POLICY "post media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post media insert own folder" ON storage.objects;
CREATE POLICY "post media insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "post media update own folder" ON storage.objects;
CREATE POLICY "post media update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "post media delete own folder" ON storage.objects;
CREATE POLICY "post media delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
