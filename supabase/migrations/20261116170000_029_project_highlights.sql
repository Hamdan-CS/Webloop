/*
  # 029 — Project highlights ("What we built")

  A short ordered list of points the owner writes about what the project
  built. Shown on the project page under the overview.

  - projects.highlights text[] NOT NULL DEFAULT '{}'
  - At most 12 points, each 1–160 characters (the UI trims and drops empty
    rows before saving; these checks are the server-side backstop).

  No RLS change: the existing projects UPDATE policy already limits edits
  to the owner, and the column is read with the rest of the row.
*/

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS highlights text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.highlights_valid(items text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT cardinality(items) <= 12
     AND NOT EXISTS (
       SELECT 1 FROM unnest(items) AS h
       WHERE h IS NULL OR char_length(btrim(h)) = 0 OR char_length(h) > 160
     );
$$;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_highlights_valid;
ALTER TABLE projects
  ADD CONSTRAINT projects_highlights_valid CHECK (public.highlights_valid(highlights));
