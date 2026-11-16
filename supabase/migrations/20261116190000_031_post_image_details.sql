/*
  # 031 — Per-image terminal command and link on Pictures posts

  Each picture in a Pictures post can carry its own terminal command and
  link (e.g. a GitHub repo screenshot with its `git clone` and repo URL).

  1. post_images: command (≤2000 chars), link_url (≤500, http/https only),
     link_label (≤60). All nullable; empty strings are rejected (the UI
     trims empty fields to NULL).
  2. Reads: post_images already has a table-level SELECT grant for
     `authenticated` (migration 021), which covers new columns. The explicit
     column grant below just documents it next to the columns.
  3. Edit: post_images had no UPDATE at all (captions were fixed after
     publish). EditPostModal now edits caption/command/link, so the post's
     author gets UPDATE on those four columns only (not path, post_id or
     position), with the same "own post" check as the insert/delete policies.
  4. get_guest_feed(): the images JSON also returns id, command, link_url and
     link_label. Everything else is unchanged from migration 024.
*/

-- 1. columns + checks
ALTER TABLE post_images
  ADD COLUMN IF NOT EXISTS command text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_label text;

ALTER TABLE post_images DROP CONSTRAINT IF EXISTS post_images_command_check;
ALTER TABLE post_images ADD CONSTRAINT post_images_command_check
  CHECK (command IS NULL OR (char_length(command) <= 2000 AND char_length(btrim(command)) > 0));

ALTER TABLE post_images DROP CONSTRAINT IF EXISTS post_images_link_url_check;
ALTER TABLE post_images ADD CONSTRAINT post_images_link_url_check
  CHECK (link_url IS NULL OR (char_length(link_url) <= 500 AND link_url ~* '^https?://[^\s]+$'));

ALTER TABLE post_images DROP CONSTRAINT IF EXISTS post_images_link_label_check;
ALTER TABLE post_images ADD CONSTRAINT post_images_link_label_check
  CHECK (link_label IS NULL OR (char_length(link_label) <= 60 AND char_length(btrim(link_label)) > 0));

-- 2. reads (same role as the existing table grant)
GRANT SELECT (command, link_url, link_label) ON post_images TO authenticated;

-- 3. author may edit an image's details (not its file, post or position)
GRANT UPDATE (caption, command, link_url, link_label) ON post_images TO authenticated;

DROP POLICY IF EXISTS "update_own_post_images" ON post_images;
CREATE POLICY "update_own_post_images" ON post_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = public.current_profile_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.author_id = public.current_profile_id())
  );

-- 4. guest feed: same as 024, images carry the new fields
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
          SELECT jsonb_agg(jsonb_build_object(
            'id', pi.id,
            'path', pi.path,
            'position', pi.position,
            'caption', pi.caption,
            'command', pi.command,
            'link_url', pi.link_url,
            'link_label', pi.link_label
          ) ORDER BY pi.position)
          FROM post_images pi WHERE pi.post_id = p.id
        ), '[]'::jsonb)
      ) AS row
    FROM picked k
    JOIN posts p ON p.id = k.id
    JOIN profiles a ON a.id = p.author_id
  ) rows;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_feed() TO anon, authenticated;
