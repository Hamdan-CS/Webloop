/*
# Devloop — Core Platform Tables (Phase 1: Public Experience)

## Purpose
Creates the foundational schema for a student project collaboration & talent marketplace.
Phase 1 focuses on public browsing: guests can explore projects, portfolios, and creator
profiles without logging in. All public data is readable by the anon role; writes are
owner-scoped to authenticated users.

## New Tables

1. `profiles` — Public creator profiles (students, teams, companies, universities).
   - id (uuid, PK, references auth.users)
   - display_name, handle, avatar_url, bio
   - creator_type (student | team | company | university)
   - verified (bool), location, website_url, github_url
   - experience_level, availability, interests (text[])
   - is_demo (bool) — flags demo/sample content
   - created_at, updated_at

2. `projects` — Published projects (student ideas, company opportunities, university programs).
   - id, owner_id (-> profiles)
   - title, slug, summary, overview, problem, target_users
   - category, difficulty, status (draft|published|recruiting|in_progress|completed|archived)
   - project_type (student|company|university|open_source)
   - compensation (paid|unpaid_educational|open_source)
   - is_beginner_friendly, is_remote
   - cover_image_url, demo_url, repo_url
   - team_size, duration_weeks, time_commitment_hours
   - location, published_at
   - is_demo (bool)

3. `project_skills` — Technologies used/required by a project.
   - id, project_id (-> projects), name, category

4. `project_roles` — Open positions / required roles on a project.
   - id, project_id, title, description, is_open

5. `project_members` — Team membership for a project.
   - id, project_id, profile_id, role, joined_at

6. `portfolio_items` — Student showcase work.
   - id, profile_id, title, description, cover_image_url
   - demo_url, repo_url, category, project_status
   - role, contributions, lessons_learned, work_type
   - is_public, is_demo, created_at

7. `reviews` — Public reviews/ratings (dimensions: quality, reliability, communication, teamwork, problem_solving).
   - id, reviewer_id, reviewee_id (-> profiles), project_id
   - rating (1-5), dimensions (jsonb), comment
   - is_verified_participation, created_at

## Security (RLS)
- All tables have RLS enabled.
- SELECT on public-facing tables (profiles, projects, project_skills, project_roles,
  portfolio_items, reviews, project_members) is open to `anon, authenticated` so guests
  can browse. Private fields are filtered at the query level (we only expose public columns).
- INSERT/UPDATE/DELETE are owner-scoped to `authenticated` via auth.uid() ownership checks.
- profiles uses auth.uid() = id for self-edits.

## Notes
- Demo data is flagged with is_demo = true so the UI can label it clearly.
- owner_id on projects defaults to auth.uid() so authenticated inserts work without
  threading the owner through the client.
- profile_id on portfolio_items defaults to auth.uid() for the same reason.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  handle text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  creator_type text NOT NULL DEFAULT 'student' CHECK (creator_type IN ('student','team','company','university')),
  verified boolean NOT NULL DEFAULT false,
  location text,
  website_url text,
  github_url text,
  experience_level text,
  availability text,
  interests text[] DEFAULT '{}',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary text NOT NULL,
  overview text,
  problem text,
  target_users text,
  category text,
  difficulty text CHECK (difficulty IN ('beginner','intermediate','advanced')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','recruiting','in_progress','completed','archived')),
  project_type text NOT NULL DEFAULT 'student' CHECK (project_type IN ('student','company','university','open_source')),
  compensation text CHECK (compensation IN ('paid','unpaid_educational','open_source')),
  is_beginner_friendly boolean NOT NULL DEFAULT false,
  is_remote boolean NOT NULL DEFAULT true,
  cover_image_url text,
  demo_url text,
  repo_url text,
  team_size int DEFAULT 0,
  duration_weeks int,
  time_commitment_hours text,
  location text,
  published_at timestamptz DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_projects" ON projects;
CREATE POLICY "public_read_projects" ON projects FOR SELECT
  TO anon, authenticated USING (status IN ('published','recruiting','in_progress','completed'));

DROP POLICY IF EXISTS "insert_own_project" ON projects;
CREATE POLICY "insert_own_project" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_project" ON projects;
CREATE POLICY "update_own_project" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_project" ON projects;
CREATE POLICY "delete_own_project" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- 3. project_skills
CREATE TABLE IF NOT EXISTS project_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text
);
ALTER TABLE project_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_project_skills" ON project_skills;
CREATE POLICY "public_read_project_skills" ON project_skills FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "manage_own_project_skills" ON project_skills;
CREATE POLICY "manage_own_project_skills" ON project_skills FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_skills.project_id AND projects.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_skills.project_id AND projects.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills(project_id);

-- 4. project_roles
CREATE TABLE IF NOT EXISTS project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_open boolean NOT NULL DEFAULT true
);
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_project_roles" ON project_roles;
CREATE POLICY "public_read_project_roles" ON project_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "manage_own_project_roles" ON project_roles;
CREATE POLICY "manage_own_project_roles" ON project_roles FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_roles.project_id AND projects.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_roles.project_id AND projects.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_project_roles_project ON project_roles(project_id);

-- 5. project_members
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, profile_id)
);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_project_members" ON project_members;
CREATE POLICY "public_read_project_members" ON project_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "manage_own_project_members" ON project_members;
CREATE POLICY "manage_own_project_members" ON project_members FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_members.project_id AND projects.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);

-- 6. portfolio_items
CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  demo_url text,
  repo_url text,
  category text,
  project_status text DEFAULT 'completed',
  role text,
  contributions text,
  lessons_learned text,
  work_type text,
  is_public boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_portfolio" ON portfolio_items;
CREATE POLICY "public_read_portfolio" ON portfolio_items FOR SELECT
  TO anon, authenticated USING (is_public = true);

DROP POLICY IF EXISTS "insert_own_portfolio" ON portfolio_items;
CREATE POLICY "insert_own_portfolio" ON portfolio_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "update_own_portfolio" ON portfolio_items;
CREATE POLICY "update_own_portfolio" ON portfolio_items FOR UPDATE
  TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "delete_own_portfolio" ON portfolio_items;
CREATE POLICY "delete_own_portfolio" ON portfolio_items FOR DELETE
  TO authenticated USING (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_profile ON portfolio_items(profile_id);

-- 7. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  dimensions jsonb,
  comment text,
  is_verified_participation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_review" ON reviews;
CREATE POLICY "insert_own_review" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
