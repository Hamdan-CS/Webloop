/*
# Add narrow public RPC for profile contribution counts

## Purpose
CreatorProfilePage shows an "approved contributions" stat for every
visitor to a profile, including guests. Migration 009 correctly revoked
anon SELECT on task_submissions to keep submission evidence, reviewer
feedback, and ratings private. That also broke this public aggregate:
the frontend queried task_submissions directly, which now throws a
Postgres permission error for anonymous visitors (anon has no SELECT
grant), and the calling page had no error handling, so the whole
profile page got stuck on its loading spinner.

## Changes
- New SECURITY DEFINER function `get_profile_contribution_counts`
  that returns only two aggregate integers (total, approved) for a
  given profile id. It never returns individual submission rows,
  evidence URLs, reviewer feedback, or ratings.
- GRANT EXECUTE to anon and authenticated.

## Security notes
- Does NOT grant SELECT on task_submissions to anon and does NOT
  modify the RLS policies added in migration 009. The function body
  runs with the function owner's privileges only to compute these two
  counts; callers never get row-level or table-level access.
*/

CREATE OR REPLACE FUNCTION public.get_profile_contribution_counts(profile_uid uuid)
RETURNS TABLE(total integer, approved integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::integer AS total,
    count(*) FILTER (WHERE status = 'approved')::integer AS approved
  FROM task_submissions
  WHERE submitted_by = profile_uid;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_contribution_counts(uuid) TO anon, authenticated;
