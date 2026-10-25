/*
# Phase 5: Task Management and Submissions

## Purpose
Enables project owners to create tasks, assign them to accepted project members,
and review submitted work. Members can view assigned tasks, submit evidence,
and receive feedback and ratings.

## New Tables

### tasks
- `id` (uuid PK)
- `project_id` (FK -> projects.id, CASCADE) — which project this task belongs to
- `assignee_id` (FK -> profiles.id, SET NULL) — who the task is assigned to (null = unassigned)
- `title` (text, not null)
- `description` (text, nullable) — detailed task description
- `acceptance_criteria` (text, nullable) — what constitutes completion
- `status` (text, default 'open') — open, in_progress, submitted, approved, changes_requested, rejected
- `created_by` (FK -> profiles.id) — the project owner who created the task
- `due_date` (date, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### task_submissions
- `id` (uuid PK)
- `task_id` (FK -> tasks.id, CASCADE)
- `submitted_by` (FK -> profiles.id) — the member submitting evidence
- `evidence_url` (text, nullable) — link to PR, demo, document
- `notes` (text, nullable) — description of what was done
- `status` (text, default 'pending') — pending, approved, changes_requested, not_completed, rejected
- `reviewer_feedback` (text, nullable) — owner's feedback on the submission
- `rating` (int, nullable, check 1-5) — owner's rating for approved work
- `reviewed_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

## Security (RLS)
- tasks: project owner can CRUD (via project ownership check), public SELECT for visibility.
- task_submissions: submitter can INSERT + DELETE own, project owner can UPDATE (review),
  public SELECT for visibility.
- Grants to anon + authenticated on both tables.

## Important Notes
1. Ownership is checked via profiles.user_id = auth.uid() (matching existing pattern).
2. Project owner is determined by joining projects.owner_id -> profiles.user_id.
3. Assignee is determined by joining tasks.assignee_id -> profiles.user_id.
4. Status transitions: open -> in_progress (member starts) -> submitted (member submits)
   -> approved/changes_requested/not_completed/rejected (owner reviews).
*/

-- ============================================================
-- Tasks table
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  acceptance_criteria text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO anon, authenticated;

-- Public read (matching existing pattern for projects)
DROP POLICY IF EXISTS "public_read_tasks" ON tasks;
CREATE POLICY "public_read_tasks"
ON tasks FOR SELECT
TO anon, authenticated USING (true);

-- Project owner can create tasks
DROP POLICY IF EXISTS "insert_owner_tasks" ON tasks;
CREATE POLICY "insert_owner_tasks"
ON tasks FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE projects.id = tasks.project_id
    AND profiles.user_id = auth.uid()
  )
);

-- Project owner can update tasks
DROP POLICY IF EXISTS "update_owner_tasks" ON tasks;
CREATE POLICY "update_owner_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE projects.id = tasks.project_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE projects.id = tasks.project_id
    AND profiles.user_id = auth.uid()
  )
);

-- Project owner can delete tasks
DROP POLICY IF EXISTS "delete_owner_tasks" ON tasks;
CREATE POLICY "delete_owner_tasks"
ON tasks FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM projects
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE projects.id = tasks.project_id
    AND profiles.user_id = auth.uid()
  )
);

-- ============================================================
-- Task submissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_feedback text,
  rating int CHECK (rating >= 1 AND rating <= 5),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON task_submissions TO anon, authenticated;

-- Public read
DROP POLICY IF EXISTS "public_read_task_submissions" ON task_submissions;
CREATE POLICY "public_read_task_submissions"
ON task_submissions FOR SELECT
TO anon, authenticated USING (true);

-- Assignee can insert submissions for their own tasks
DROP POLICY IF EXISTS "insert_own_task_submissions" ON task_submissions;
CREATE POLICY "insert_own_task_submissions"
ON task_submissions FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN profiles ON profiles.id = tasks.assignee_id
    WHERE tasks.id = task_submissions.task_id
    AND profiles.user_id = auth.uid()
  )
);

-- Project owner can update submissions (review: approve, reject, etc.)
DROP POLICY IF EXISTS "update_owner_task_submissions" ON task_submissions;
CREATE POLICY "update_owner_task_submissions"
ON task_submissions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE tasks.id = task_submissions.task_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    JOIN profiles ON profiles.id = projects.owner_id
    WHERE tasks.id = task_submissions.task_id
    AND profiles.user_id = auth.uid()
  )
);

-- Submitter can delete their own pending submissions
DROP POLICY IF EXISTS "delete_own_task_submissions" ON task_submissions;
CREATE POLICY "delete_own_task_submissions"
ON task_submissions FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = task_submissions.submitted_by
    AND profiles.user_id = auth.uid()
  )
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_submitted_by ON task_submissions(submitted_by);

-- ============================================================
-- updated_at trigger for tasks
-- ============================================================
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
