/*
# Restrict task and submission read access to project owner and accepted members

## Purpose
The project progress dashboard displays tasks, submissions, evidence links,
reviewer feedback, and star ratings. This data must be visible only to:
1. The project owner.
2. Users whose membership in that specific project has been accepted
   (i.e. they have a row in project_members for this project).

Previously, `public_read_tasks` and `public_read_task_submissions` used
`USING (true)`, allowing anyone — including anonymous guests and unrelated
logged-in users — to read all task and submission data. This migration
replaces those permissive SELECT policies with ownership/membership checks.

## Changes
### tasks table
- Dropped: `public_read_tasks` (SELECT, USING true, TO anon + authenticated)
- Added: `select_owner_or_member_tasks` (SELECT, TO authenticated)
  - Allows read if the current user's profile is the project owner
    OR if the current user's profile has an accepted membership row
    in project_members for the task's project.

### task_submissions table
- Dropped: `public_read_task_submissions` (SELECT, USING true, TO anon + authenticated)
- Added: `select_owner_or_member_task_submissions` (SELECT, TO authenticated)
  - Allows read if the current user is the project owner OR an accepted
    project member, checked through the submission's task → project.

### Grants
- REVOKE SELECT on tasks FROM anon (anon no longer needs read access).
- REVOKE SELECT on task_submissions FROM anon.
- authenticated retains existing SELECT grant on both tables.

## Security notes
- The anon role loses SELECT on tasks and task_submissions. Guests cannot
  retrieve task or submission data via the Data API.
- Authenticated users who are not the owner and not an accepted member of
  the specific project will get zero rows from tasks/task_submissions for
  that project.
- INSERT/UPDATE/DELETE policies are unchanged.
*/

-- ── tasks: replace public SELECT with owner-or-member SELECT ──

REVOKE SELECT ON tasks FROM anon;

DROP POLICY IF EXISTS "public_read_tasks" ON tasks;

CREATE POLICY "select_owner_or_member_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  -- Project owner
  EXISTS (
    SELECT 1 FROM projects
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE projects.id = tasks.project_id
      AND profiles.user_id = auth.uid()
  )
  OR
  -- Accepted project member
  EXISTS (
    SELECT 1 FROM project_members
    JOIN profiles ON profiles.id = project_members.profile_id
    WHERE project_members.project_id = tasks.project_id
      AND profiles.user_id = auth.uid()
  )
);

-- ── task_submissions: replace public SELECT with owner-or-member SELECT ──

REVOKE SELECT ON task_submissions FROM anon;

DROP POLICY IF EXISTS "public_read_task_submissions" ON task_submissions;

CREATE POLICY "select_owner_or_member_task_submissions"
ON task_submissions FOR SELECT
TO authenticated
USING (
  -- Project owner (via task → project)
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE tasks.id = task_submissions.task_id
      AND profiles.user_id = auth.uid()
  )
  OR
  -- Accepted project member (via task → project)
  EXISTS (
    SELECT 1 FROM tasks
    JOIN project_members ON project_members.project_id = tasks.project_id
    JOIN profiles ON profiles.id = project_members.profile_id
    WHERE tasks.id = task_submissions.task_id
      AND profiles.user_id = auth.uid()
  )
);
