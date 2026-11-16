-- 024_pinned_posts (Part G): admins pin up to 5 posts to the top of the Feed.
--
-- A pin is "active" when pinned_rank IS NOT NULL AND pinned_until > now().
-- Expired pins simply stop counting (nothing runs on a timer); the pin RPCs
-- clear expired values before they reorder, so an old rank never blocks a slot.
-- Only the SECURITY DEFINER admin RPCs below can write these columns: there is
-- no UPDATE grant on them for authenticated users.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS pinned_rank smallint CHECK (pinned_rank BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS pinned_until timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS posts_pinned_rank_unique ON posts(pinned_rank) WHERE pinned_rank IS NOT NULL;

-- signed-in readers need to see the pin (label + order); no write grant
GRANT SELECT (pinned_rank, pinned_until) ON posts TO authenticated;

-- ------------------------------------------------------------
-- helper: clear expired pins, then write ranks 1..n in the given order
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_pin_order(p_post_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- free every slot first so the unique index never sees two posts on one rank
  UPDATE posts SET pinned_rank = NULL WHERE pinned_rank IS NOT NULL;
  UPDATE posts p SET pinned_rank = t.idx
  FROM unnest(p_post_ids) WITH ORDINALITY AS t(id, idx)
  WHERE p.id = t.id;
END;
$$;

REVOKE ALL ON FUNCTION public._apply_pin_order(uuid[]) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._active_pin_ids(p_exclude uuid DEFAULT NULL)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(id ORDER BY pinned_rank), '{}')
  FROM posts
  WHERE pinned_rank IS NOT NULL AND pinned_until > now() AND removed_at IS NULL
    AND (p_exclude IS NULL OR id <> p_exclude);
$$;

REVOKE ALL ON FUNCTION public._active_pin_ids(uuid) FROM public, anon, authenticated;

-- ------------------------------------------------------------
-- admin_pin_post: pin (or move / change end date of) a post at position 1..5.
-- Posts at that position and below shift down one. Pinning a 6th post raises
-- PIN_LIMIT: the UI asks which pin to replace, unpins it, then pins again.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_pin_post(p_post_id uuid, p_rank integer, p_until timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_pos integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF p_rank IS NULL OR p_rank < 1 OR p_rank > 5 THEN RAISE EXCEPTION 'BAD_RANK'; END IF;
  IF p_until IS NULL OR p_until <= now() THEN RAISE EXCEPTION 'PIN_END_IN_PAST'; END IF;
  IF NOT EXISTS (SELECT 1 FROM posts WHERE id = p_post_id AND removed_at IS NULL) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;

  -- drop expired pins
  UPDATE posts SET pinned_rank = NULL, pinned_until = NULL
  WHERE pinned_rank IS NOT NULL AND (pinned_until <= now() OR removed_at IS NOT NULL);

  v_ids := public._active_pin_ids(p_post_id);
  IF cardinality(v_ids) >= 5 THEN RAISE EXCEPTION 'PIN_LIMIT'; END IF;

  v_pos := least(p_rank, cardinality(v_ids) + 1);
  v_ids := v_ids[1:v_pos - 1] || p_post_id || v_ids[v_pos:];

  UPDATE posts SET pinned_until = p_until WHERE id = p_post_id;
  PERFORM public._apply_pin_order(v_ids);
END;
$$;

-- ------------------------------------------------------------
-- admin_unpin_post: unpin now; the others close the gap.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unpin_post(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  UPDATE posts SET pinned_rank = NULL, pinned_until = NULL WHERE id = p_post_id;
  UPDATE posts SET pinned_rank = NULL, pinned_until = NULL
  WHERE pinned_rank IS NOT NULL AND (pinned_until <= now() OR removed_at IS NOT NULL);
  PERFORM public._apply_pin_order(public._active_pin_ids());
END;
$$;

-- ------------------------------------------------------------
-- admin_reorder_pins: new order for exactly the currently active pins.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reorder_pins(p_post_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active uuid[];
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  UPDATE posts SET pinned_rank = NULL, pinned_until = NULL
  WHERE pinned_rank IS NOT NULL AND (pinned_until <= now() OR removed_at IS NOT NULL);
  v_active := public._active_pin_ids();
  IF cardinality(p_post_ids) <> cardinality(v_active)
     OR NOT (p_post_ids @> v_active AND v_active @> p_post_ids) THEN
    RAISE EXCEPTION 'PINS_CHANGED';
  END IF;
  PERFORM public._apply_pin_order(p_post_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pin_post(uuid, integer, timestamptz) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_unpin_post(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_reorder_pins(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_pin_post(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unpin_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reorder_pins(uuid[]) TO authenticated;

-- ------------------------------------------------------------
-- Guest feed (from 021): active pins first (by rank), then the 2 newest
-- non-pinned posts as before. Adds 'pinned_rank' to each row.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_feed()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pinned AS (
    SELECT p.id, p.pinned_rank AS rank
    FROM posts p
    WHERE p.visibility = 'everyone' AND p.removed_at IS NULL
      AND p.pinned_rank IS NOT NULL AND p.pinned_until > now()
  ),
  latest AS (
    SELECT p.id, NULL::smallint AS rank
    FROM posts p
    WHERE p.visibility = 'everyone' AND p.removed_at IS NULL
      AND p.id NOT IN (SELECT id FROM pinned)
    ORDER BY p.created_at DESC
    LIMIT 2
  ),
  picked AS (
    SELECT id, rank FROM pinned
    UNION ALL
    SELECT id, rank FROM latest
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY sort_rank, created_at DESC), '[]'::jsonb) FROM (
    SELECT
      COALESCE(k.rank, 99) AS sort_rank,
      p.created_at,
      jsonb_build_object(
        'id', p.id,
        'post_type', p.post_type,
        'title', p.title,
        'body', p.body,
        'steps', p.steps,
        'tags', p.tags,
        'like_count', p.like_count,
        'comment_count', p.comment_count,
        'is_verified', p.is_verified,
        'pinned_rank', k.rank,
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
    FROM picked k
    JOIN posts p ON p.id = k.id
    JOIN profiles a ON a.id = p.author_id
  ) rows;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_feed() TO anon, authenticated;
