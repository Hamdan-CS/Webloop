/*
# Contribution grid: task size/points + daily aggregation RPCs

## Purpose
Powers the new 3D/2D <ContributionGrid> component: one tile per day for the
last 365 days, tile height from task points accepted that day, tile color
from that day's average reviewer rating.

## Why these choices (read before applying)
- The task model has no "accepted" status — the closest match is
  tasks.status = 'approved' (set when the project owner approves the
  matching task_submissions row). This migration treats "accepted" and
  "approved" as the same thing throughout.
- There is no points/size field on tasks. This adds `tasks.size`
  ('small' | 'medium' | 'large', default 'medium') and derives points
  (1 / 2 / 3) from it in SQL. Only the project owner can ever write this
  column — migration 007's `update_owner_tasks` UPDATE policy already
  restricts all task UPDATEs to the owner, so no new RLS is needed for
  that rule; students genuinely cannot influence it.
- There is no per-task "stack" field. The breakdown instead surfaces the
  parent project's `project_skills` names as "stack", which is the closest
  existing concept.
- There is no reviewer_id column on task_submissions — only the project
  owner can ever review (see migration 007/009's UPDATE policies), so the
  "reviewer" shown is always the project owner's profile.
- A day is bucketed by task_submissions.reviewed_at (the moment the owner
  accepted it), not by task creation or due date.

## Visibility (why this is function-level security, not new RLS)
Migration 009 locked `tasks`/`task_submissions` SELECT down to the project
owner or an accepted member of THAT SPECIFIC project. That is correct for
the project dashboard, but this grid also needs to render on a student's
PUBLIC profile for ANY visiting company/university, who are not members of
every project the student worked on. Per-row RLS can't express "the public
may see only the approved slice of this student's tasks" without reopening
broader access, so — exactly like the existing
`get_profile_contribution_counts` function (migration 011) — both new
functions are SECURITY DEFINER and enforce visibility in SQL:
  - `daily_contributions`: returns only capped/aggregated numbers
    (points, avg rating, count) per day. Safe for anyone, like the
    existing contribution-count RPC.
  - `daily_contribution_tasks`: returns per-task detail for one day.
    - The student themself (auth.uid() -> profiles.id = student_id) sees
      every status, including in_progress/submitted/changes_requested
      (but only for today — this grid never back-dates unfinished work),
      plus evidence_url/notes/reviewer_feedback.
    - Everyone else (including anon) sees ONLY status = 'approved' tasks,
      and never evidence_url/notes/reviewer_feedback — matching "Never
      expose in-progress or in-review work" and keeping submission
      internals private from the public.
No existing RLS policy is weakened; these functions add a narrow, audited
read path on top.

## New objects
- tasks.size (text, check small/medium/large, default 'medium')
- public.daily_contributions(student_id uuid, days integer default 365)
- public.daily_contribution_tasks(student_id uuid, for_day date)
- supporting indexes on tasks(assignee_id, status) and
  task_submissions(reviewed_at)
*/

-- ============================================================
-- tasks.size — points source, owner-only via existing UPDATE RLS
-- ============================================================
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'medium'
  CHECK (size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text]));

COMMENT ON COLUMN tasks.size IS
  'Task size set by the project owner (small=1 / medium=2 / large=3 points). '
  'Students cannot set this — tasks UPDATE is already owner-only (see update_owner_tasks policy).';

-- ============================================================
-- Indexes to support the new queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_reviewed_at ON task_submissions(reviewed_at);

-- ============================================================
-- daily_contributions — public, aggregate-only (like get_profile_contribution_counts)
-- ============================================================
CREATE OR REPLACE FUNCTION public.daily_contributions(student_id uuid, days integer DEFAULT 365)
RETURNS TABLE (
  day date,
  points integer,
  avg_rating numeric,
  task_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH accepted AS (
    SELECT
      (ts.reviewed_at AT TIME ZONE 'UTC')::date AS day,
      (CASE t.size WHEN 'small' THEN 1 WHEN 'large' THEN 3 ELSE 2 END) AS pts,
      ts.rating
    FROM task_submissions ts
    JOIN tasks t ON t.id = ts.task_id
    WHERE t.assignee_id = student_id
      AND t.status = 'approved'
      AND ts.status = 'approved'
      AND ts.reviewed_at IS NOT NULL
      AND ts.reviewed_at >= (now() - ((greatest(days, 1) - 1) || ' days')::interval)
  ),
  series AS (
    SELECT generate_series(
      CURRENT_DATE - (greatest(days, 1) - 1),
      CURRENT_DATE,
      interval '1 day'
    )::date AS day
  )
  SELECT
    s.day,
    LEAST(6, COALESCE(SUM(a.pts), 0))::integer AS points,
    ROUND(AVG(a.rating)::numeric, 2) AS avg_rating,
    COUNT(a.pts)::integer AS task_count
  FROM series s
  LEFT JOIN accepted a ON a.day = s.day
  GROUP BY s.day
  ORDER BY s.day;
$$;

GRANT EXECUTE ON FUNCTION public.daily_contributions(uuid, integer) TO anon, authenticated;

-- ============================================================
-- daily_contribution_tasks — per-day breakdown, visibility enforced in SQL
-- ============================================================
CREATE OR REPLACE FUNCTION public.daily_contribution_tasks(student_id uuid, for_day date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_profile_id uuid;
  is_self boolean;
  result jsonb;
BEGIN
  SELECT id INTO caller_profile_id FROM profiles WHERE user_id = auth.uid();
  is_self := caller_profile_id IS NOT NULL AND caller_profile_id = student_id;

  IF is_self THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'task_id', t.id,
      'title', t.title,
      'project_title', p.title,
      'project_slug', p.slug,
      'owner_name', owner.display_name,
      'size', t.size,
      'points', (CASE t.size WHEN 'small' THEN 1 WHEN 'large' THEN 3 ELSE 2 END),
      'status', t.status,
      'stack', COALESCE(sk.names, ARRAY[]::text[]),
      'rating', ts.rating,
      'reviewer_feedback', ts.reviewer_feedback,
      'evidence_url', ts.evidence_url,
      'notes', ts.notes,
      'accepted_at', ts.reviewed_at,
      'created_at', t.created_at
    ) ORDER BY COALESCE(ts.reviewed_at, t.updated_at) DESC), '[]'::jsonb)
    INTO result
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN profiles owner ON owner.id = p.owner_id
    LEFT JOIN task_submissions ts ON ts.task_id = t.id AND ts.status = 'approved'
    LEFT JOIN LATERAL (
      SELECT array_agg(name) AS names FROM project_skills WHERE project_id = p.id
    ) sk ON true
    WHERE t.assignee_id = student_id
      AND (
        (t.status = 'approved' AND (ts.reviewed_at AT TIME ZONE 'UTC')::date = for_day)
        OR (t.status IN ('in_progress', 'submitted', 'changes_requested') AND for_day = CURRENT_DATE)
      );
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'task_id', t.id,
      'title', t.title,
      'project_title', p.title,
      'project_slug', p.slug,
      'owner_name', owner.display_name,
      'size', t.size,
      'points', (CASE t.size WHEN 'small' THEN 1 WHEN 'large' THEN 3 ELSE 2 END),
      'status', t.status,
      'stack', COALESCE(sk.names, ARRAY[]::text[]),
      'rating', ts.rating,
      'accepted_at', ts.reviewed_at
    ) ORDER BY ts.reviewed_at DESC), '[]'::jsonb)
    INTO result
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN profiles owner ON owner.id = p.owner_id
    JOIN task_submissions ts ON ts.task_id = t.id AND ts.status = 'approved'
    LEFT JOIN LATERAL (
      SELECT array_agg(name) AS names FROM project_skills WHERE project_id = p.id
    ) sk ON true
    WHERE t.assignee_id = student_id
      AND t.status = 'approved'
      AND (ts.reviewed_at AT TIME ZONE 'UTC')::date = for_day;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.daily_contribution_tasks(uuid, date) TO anon, authenticated;
