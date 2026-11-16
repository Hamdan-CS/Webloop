-- 027_independent_accounts (Part C)
-- Independent = freelancers, alumni, industry people, independent researchers.
-- They publish projects/research, guide and recommend students, but never join
-- or work on projects. creator_type 'independent' was allowed in 025.
--
-- Rules enforced here (triggers, so SECURITY DEFINER paths like accept_invite
-- are covered too, not only client inserts):
--   * an Independent can't apply to or join any project (except owning it);
--   * only students can apply to / join an Independent's project;
--   * Independents never offer paid projects; project types independent,
--     research, open_source only;
--   * before publishing: confirmed email + LinkedIn or ORCID link;
--   * max 3 open projects until WebLoop approves them (independent_verified_at);
--   * tasks approved on an unapproved Independent's project don't count as
--     verified (contribution counts + grid).

-- ============================================================
-- 1. Profile fields: approval + ORCID
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS orcid_url text,
  ADD COLUMN IF NOT EXISTS independent_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS independent_verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS independent_verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS independent_verification_note text;

CREATE INDEX IF NOT EXISTS idx_profiles_independent_verified_by ON profiles(independent_verified_by);

-- users may edit their ORCID link like their LinkedIn link; the approval
-- columns are only written by the RPCs below (no UPDATE grant)
GRANT UPDATE (orcid_url) ON profiles TO authenticated;

-- ============================================================
-- 2. Project types
-- ============================================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN ('student', 'company', 'university', 'open_source', 'independent', 'research'));

-- ============================================================
-- 3. Helpers
-- ============================================================

-- true when approving a task on this project makes it count as WebLoop-verified
CREATE OR REPLACE FUNCTION public.project_counts_as_verified(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM projects pr JOIN profiles o ON o.id = pr.owner_id
    WHERE pr.id = p_project_id AND o.creator_type = 'independent' AND o.independent_verified_at IS NULL
  );
$$;
GRANT EXECUTE ON FUNCTION public.project_counts_as_verified(uuid) TO anon, authenticated;

-- may this profile apply to / join this project?
CREATE OR REPLACE FUNCTION public.can_join_project(p_project_id uuid, p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pr.owner_id = p_profile_id
    OR (
      j.creator_type <> 'independent'
      AND (o.creator_type <> 'independent' OR j.creator_type = 'student')
    )
  FROM projects pr
  JOIN profiles o ON o.id = pr.owner_id
  JOIN profiles j ON j.id = p_profile_id
  WHERE pr.id = p_project_id;
$$;
GRANT EXECUTE ON FUNCTION public.can_join_project(uuid, uuid) TO anon, authenticated;

-- ============================================================
-- 4. Join rules (applications + project_members)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_can_join_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile uuid;
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    v_profile := NEW.applicant_id;
  ELSE
    v_profile := NEW.profile_id;
  END IF;
  IF NOT coalesce(public.can_join_project(NEW.project_id, v_profile), false) THEN
    RAISE EXCEPTION 'CANNOT_JOIN_PROJECT'
      USING HINT = 'Independents cannot join projects; only students can join an Independent''s project.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_check_can_join ON applications;
CREATE TRIGGER applications_check_can_join BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION public.check_can_join_project();

DROP TRIGGER IF EXISTS project_members_check_can_join ON project_members;
CREATE TRIGGER project_members_check_can_join BEFORE INSERT ON project_members
  FOR EACH ROW EXECUTE FUNCTION public.check_can_join_project();

-- ============================================================
-- 5. Independent projects: no paid, allowed types, email + link, 3-project cap
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_independent_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o profiles;
  v_open int;
  v_open_statuses text[] := ARRAY['published', 'recruiting', 'in_progress'];
BEGIN
  SELECT * INTO o FROM profiles WHERE id = NEW.owner_id;
  IF o.creator_type IS DISTINCT FROM 'independent' THEN RETURN NEW; END IF;

  IF NEW.compensation = 'paid' THEN RAISE EXCEPTION 'INDEPENDENT_NO_PAID'; END IF;
  IF NEW.project_type NOT IN ('independent', 'research', 'open_source') THEN RAISE EXCEPTION 'INDEPENDENT_PROJECT_TYPE'; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = o.user_id AND email_confirmed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'EMAIL_NOT_CONFIRMED';
    END IF;
    IF coalesce(btrim(o.linkedin_url), '') = '' AND coalesce(btrim(o.orcid_url), '') = '' THEN
      RAISE EXCEPTION 'NEEDS_LINKEDIN_OR_ORCID';
    END IF;
  END IF;

  IF o.independent_verified_at IS NULL AND NEW.status = ANY (v_open_statuses)
     AND (TG_OP = 'INSERT' OR NOT (OLD.status = ANY (v_open_statuses))) THEN
    SELECT count(*) INTO v_open FROM projects
    WHERE owner_id = NEW.owner_id AND status = ANY (v_open_statuses) AND id <> NEW.id;
    IF v_open >= 3 THEN RAISE EXCEPTION 'INDEPENDENT_PROJECT_LIMIT'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_check_independent ON projects;
CREATE TRIGGER projects_check_independent BEFORE INSERT OR UPDATE OF compensation, project_type, status ON projects
  FOR EACH ROW EXECUTE FUNCTION public.check_independent_project();

-- ============================================================
-- 6. Verified-task rule: contribution counts (011) and grid (015)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_profile_contribution_counts(profile_uid uuid)
RETURNS TABLE(total integer, approved integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    count(*)::integer AS total,
    count(*) FILTER (WHERE ts.status = 'approved' AND public.project_counts_as_verified(t.project_id))::integer AS approved
  FROM task_submissions ts
  JOIN tasks t ON t.id = ts.task_id
  WHERE ts.submitted_by = profile_uid;
$function$;

CREATE OR REPLACE FUNCTION public.daily_contributions(student_id uuid, days integer DEFAULT 365)
RETURNS TABLE(day date, points integer, avg_rating numeric, task_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      AND public.project_counts_as_verified(t.project_id)
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
$function$;

-- day detail: the student still sees approvals from unapproved Independents,
-- flagged webloop_verified = false; everyone else sees verified ones only
CREATE OR REPLACE FUNCTION public.daily_contribution_tasks(student_id uuid, for_day date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      'created_at', t.created_at,
      'webloop_verified', public.project_counts_as_verified(p.id)
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
      'accepted_at', ts.reviewed_at,
      'webloop_verified', true
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
      AND (ts.reviewed_at AT TIME ZONE 'UTC')::date = for_day
      AND public.project_counts_as_verified(p.id);
  END IF;

  RETURN result;
END;
$function$;

-- ============================================================
-- 7. Approval ("Verified Independent")
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_independent_verification(p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o profiles;
BEGIN
  SELECT * INTO o FROM profiles WHERE id = public.current_profile_id();
  IF o.id IS NULL OR o.creator_type <> 'independent' THEN RAISE EXCEPTION 'ONLY_INDEPENDENTS'; END IF;
  IF coalesce(btrim(o.linkedin_url), '') = '' AND coalesce(btrim(o.orcid_url), '') = '' THEN
    RAISE EXCEPTION 'NEEDS_LINKEDIN_OR_ORCID';
  END IF;
  IF char_length(btrim(coalesce(p_note, ''))) < 10 THEN RAISE EXCEPTION 'NOTE_TOO_SHORT'; END IF;
  UPDATE profiles
  SET independent_verification_requested_at = now(), independent_verification_note = left(btrim(p_note), 600)
  WHERE id = o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_independent_requests()
RETURNS TABLE(profile_id uuid, display_name text, handle text, avatar_url text, linkedin_url text, orcid_url text, note text, requested_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.handle, p.avatar_url, p.linkedin_url, p.orcid_url,
           p.independent_verification_note, p.independent_verification_requested_at
    FROM profiles p
    WHERE p.creator_type = 'independent'
      AND p.independent_verification_requested_at IS NOT NULL
      AND p.independent_verified_at IS NULL
    ORDER BY p.independent_verification_requested_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_independent(p_profile_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND creator_type = 'independent') THEN
    RAISE EXCEPTION 'NOT_INDEPENDENT';
  END IF;
  IF p_approve THEN
    UPDATE profiles SET independent_verified_at = now(), independent_verified_by = public.current_profile_id()
    WHERE id = p_profile_id;
  ELSE
    UPDATE profiles SET independent_verified_at = NULL, independent_verified_by = NULL,
      independent_verification_requested_at = NULL
    WHERE id = p_profile_id;
  END IF;
  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (p_profile_id, CASE WHEN p_approve THEN 'independent_verified' ELSE 'independent_declined' END, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.request_independent_verification(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_list_independent_requests() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_verify_independent(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_independent_verification(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_independent_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_independent(uuid, boolean) TO authenticated;

-- ============================================================
-- 8. Recommendations + skill endorsements (from Independents)
-- ============================================================
-- kind project_to_student: to_profile = the student, project_id set.
-- kind student_to_company: to_profile = the company, about_profile = the student
-- being recommended (the plan's field list had no place for the student).
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  about_profile uuid REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('project_to_student', 'student_to_company')),
  note text CHECK (note IS NULL OR char_length(note) <= 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendations_shape CHECK (
    (kind = 'project_to_student' AND project_id IS NOT NULL)
    OR (kind = 'student_to_company' AND about_profile IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_recommendations_from ON recommendations(from_profile);
CREATE INDEX IF NOT EXISTS idx_recommendations_to ON recommendations(to_profile);
CREATE INDEX IF NOT EXISTS idx_recommendations_about ON recommendations(about_profile);
CREATE INDEX IF NOT EXISTS idx_recommendations_project ON recommendations(project_id);

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL CHECK (char_length(btrim(skill)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_profile, to_profile, skill)
);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_to ON skill_endorsements(to_profile);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_from ON skill_endorsements(from_profile);

-- the right profile types for each side
CREATE OR REPLACE FUNCTION public.check_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_to text; v_about text;
BEGIN
  SELECT creator_type INTO v_to FROM profiles WHERE id = NEW.to_profile;
  IF NEW.kind = 'project_to_student' AND v_to <> 'student' THEN RAISE EXCEPTION 'RECIPIENT_MUST_BE_STUDENT'; END IF;
  IF NEW.kind = 'student_to_company' THEN
    SELECT creator_type INTO v_about FROM profiles WHERE id = NEW.about_profile;
    IF v_to <> 'company' THEN RAISE EXCEPTION 'RECIPIENT_MUST_BE_COMPANY'; END IF;
    IF v_about <> 'student' THEN RAISE EXCEPTION 'MUST_RECOMMEND_A_STUDENT'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS recommendations_check ON recommendations;
CREATE TRIGGER recommendations_check BEFORE INSERT ON recommendations
  FOR EACH ROW EXECUTE FUNCTION public.check_recommendation();

CREATE OR REPLACE FUNCTION public.is_independent(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND creator_type = 'independent');
$$;
GRANT EXECUTE ON FUNCTION public.is_independent(uuid) TO anon, authenticated;

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_endorsements ENABLE ROW LEVEL SECURITY;

-- recommendations are private to the people involved
DROP POLICY IF EXISTS "read_own_recommendations" ON recommendations;
CREATE POLICY "read_own_recommendations" ON recommendations FOR SELECT TO authenticated
  USING (public.current_profile_id() IN (from_profile, to_profile, about_profile));
DROP POLICY IF EXISTS "independent_insert_recommendation" ON recommendations;
CREATE POLICY "independent_insert_recommendation" ON recommendations FOR INSERT TO authenticated
  WITH CHECK (from_profile = public.current_profile_id() AND public.is_independent(from_profile));
DROP POLICY IF EXISTS "delete_own_recommendation" ON recommendations;
CREATE POLICY "delete_own_recommendation" ON recommendations FOR DELETE TO authenticated
  USING (from_profile = public.current_profile_id());
REVOKE ALL ON recommendations FROM anon;
GRANT SELECT, INSERT, DELETE ON recommendations TO authenticated;

-- endorsements show on the student's public profile
DROP POLICY IF EXISTS "public_read_endorsements" ON skill_endorsements;
CREATE POLICY "public_read_endorsements" ON skill_endorsements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "independent_endorse_student" ON skill_endorsements;
CREATE POLICY "independent_endorse_student" ON skill_endorsements FOR INSERT TO authenticated
  WITH CHECK (
    from_profile = public.current_profile_id()
    AND public.is_independent(from_profile)
    AND EXISTS (SELECT 1 FROM profiles WHERE id = to_profile AND creator_type = 'student')
  );
DROP POLICY IF EXISTS "delete_own_endorsement" ON skill_endorsements;
CREATE POLICY "delete_own_endorsement" ON skill_endorsements FOR DELETE TO authenticated
  USING (from_profile = public.current_profile_id());
REVOKE INSERT, UPDATE, DELETE ON skill_endorsements FROM anon;
GRANT SELECT ON skill_endorsements TO anon;
GRANT SELECT, INSERT, DELETE ON skill_endorsements TO authenticated;

-- notifications (same pattern as 022)
CREATE OR REPLACE FUNCTION public.notify_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (recipient_id, type, payload)
  SELECT NEW.to_profile, 'recommendation', jsonb_build_object(
    'recommendation_id', NEW.id,
    'kind', NEW.kind,
    'from_id', NEW.from_profile,
    'from_name', (SELECT display_name FROM profiles WHERE id = NEW.from_profile),
    'about_id', NEW.about_profile,
    'about_name', (SELECT display_name FROM profiles WHERE id = NEW.about_profile),
    'about_handle', (SELECT handle FROM profiles WHERE id = NEW.about_profile),
    'project_id', NEW.project_id,
    'project_title', (SELECT title FROM projects WHERE id = NEW.project_id),
    'project_slug', (SELECT slug FROM projects WHERE id = NEW.project_id),
    'note', NEW.note
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS recommendations_notify ON recommendations;
CREATE TRIGGER recommendations_notify AFTER INSERT ON recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_recommendation();

CREATE OR REPLACE FUNCTION public.notify_skill_endorsement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (recipient_id, type, payload)
  VALUES (NEW.to_profile, 'skill_endorsed', jsonb_build_object(
    'endorsement_id', NEW.id,
    'skill', NEW.skill,
    'from_id', NEW.from_profile,
    'from_name', (SELECT display_name FROM profiles WHERE id = NEW.from_profile)
  ));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS skill_endorsements_notify ON skill_endorsements;
CREATE TRIGGER skill_endorsements_notify AFTER INSERT ON skill_endorsements
  FOR EACH ROW EXECUTE FUNCTION public.notify_skill_endorsement();

-- ============================================================
-- 9. Reports on Independent projects and profiles -> Moderation queue
-- ============================================================
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 600),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_target CHECK ((project_id IS NOT NULL) <> (profile_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_project ON content_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_profile ON content_reports(profile_id);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_own_content_report" ON content_reports;
CREATE POLICY "insert_own_content_report" ON content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = public.current_profile_id());
DROP POLICY IF EXISTS "read_content_reports" ON content_reports;
CREATE POLICY "read_content_reports" ON content_reports FOR SELECT TO authenticated
  USING (reporter_id = public.current_profile_id() OR public.is_admin());
REVOKE ALL ON content_reports FROM anon;
GRANT SELECT, INSERT ON content_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_content_reports()
RETURNS TABLE(id uuid, reason text, created_at timestamptz, reporter_name text,
              project_id uuid, project_title text, project_slug text,
              profile_id uuid, profile_name text, profile_handle text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  RETURN QUERY
    SELECT r.id, r.reason, r.created_at, rp.display_name,
           pr.id, pr.title, pr.slug, pf.id, pf.display_name, pf.handle
    FROM content_reports r
    JOIN profiles rp ON rp.id = r.reporter_id
    LEFT JOIN projects pr ON pr.id = r.project_id
    LEFT JOIN profiles pf ON pf.id = r.profile_id
    WHERE r.resolved_at IS NULL
    ORDER BY r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_content_report(p_report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  UPDATE content_reports SET resolved_at = now() WHERE id = p_report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_content_reports() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_content_report(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_content_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_content_report(uuid) TO authenticated;
