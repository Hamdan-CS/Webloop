import { supabase } from '@/lib/supabase';
import type {
  Application,
  Message,
  PortfolioItem,
  Profile,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectSkill,
  Review,
  Task,
  TaskStatus,
  TaskSubmission,
} from '@/lib/types';

export interface ProjectQuery {
  type?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  compensation?: string;
  beginner?: boolean;
  remote?: boolean;
  recruiting?: boolean;
  search?: string;
  sort?: 'newest' | 'recently_updated' | 'most_active';
  technology?: string;
}

const VISIBLE_STATUSES = ['published', 'recruiting', 'in_progress', 'completed'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: ProjectQuery, base: any): any {
  let q = base;
  if (query.type && query.type !== 'all') q = q.eq('project_type', query.type);
  if (query.category && query.category !== 'all') q = q.eq('category', query.category);
  if (query.difficulty && query.difficulty !== 'all') q = q.eq('difficulty', query.difficulty);
  if (query.status && query.status !== 'all') q = q.eq('status', query.status);
  if (query.compensation && query.compensation !== 'all') q = q.eq('compensation', query.compensation);
  if (query.beginner) q = q.eq('is_beginner_friendly', true);
  if (query.remote) q = q.eq('is_remote', true);
  if (query.recruiting) q = q.eq('status', 'recruiting');
  if (query.search) q = q.or(`title.ilike.%${query.search}%,summary.ilike.%${query.search}%`);
  return q;
}

export async function fetchProjects(query: ProjectQuery = {}): Promise<Project[]> {
  let q = supabase.from('projects').select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      skills:project_skills(*),
      roles:project_roles(*),
      members:project_members(
        *,
        profile:profiles!project_members_profile_id_fkey(*)
      )
    `);

  // Filter visible statuses unless a specific status is requested
  if (!query.status || query.status === 'all') {
    q = q.in('status', VISIBLE_STATUSES);
  }

  q = applyFilters(query, q);

  switch (query.sort) {
    case 'recently_updated':
      q = q.order('created_at', { ascending: false });
      break;
    case 'most_active':
      q = q.order('team_size', { ascending: false });
      break;
    default:
      q = q.order('published_at', { ascending: false, nullsFirst: false });
  }

  const { data, error } = await q;
  if (error) throw error;

  let projects = (data ?? []) as unknown as Project[];

  // Technology filter (client-side since it's in a related table)
  if (query.technology) {
    const t = query.technology.toLowerCase();
    projects = projects.filter((p) => p.skills?.some((s) => s.name.toLowerCase().includes(t)));
  }

  return projects;
}

export async function fetchFeaturedProjects(limit = 6): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      skills:project_skills(*),
      roles:project_roles(*),
      members:project_members(
        *,
        profile:profiles!project_members_profile_id_fkey(*)
      )
    `)
    .in('status', VISIBLE_STATUSES)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function fetchProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      skills:project_skills(*),
      roles:project_roles(*),
      members:project_members(
        *,
        profile:profiles!project_members_profile_id_fkey(*)
      )
    `)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Project) ?? null;
}

export async function fetchProfileByHandle(handle: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as Profile) ?? null;
}

export async function fetchProfileProjects(profileId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      skills:project_skills(*),
      roles:project_roles(*),
      members:project_members(
        *,
        profile:profiles!project_members_profile_id_fkey(*)
      )
    `)
    .eq('owner_id', profileId)
    .in('status', VISIBLE_STATUSES)
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function fetchProfilePortfolio(profileId: string): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(`
      *,
      profile:profiles!portfolio_items_profile_id_fkey(*)
    `)
    .eq('profile_id', profileId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PortfolioItem[];
}

export async function fetchProfileReviews(profileId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviews_reviewer_id_fkey(*),
      project:projects!reviews_project_id_fkey(title, slug)
    `)
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function fetchProfileStats(profileId: string): Promise<{ review_count: number; avg_rating: number }> {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewee_id', profileId);

  if (error) throw error;
  const rs = data ?? [];
  const avg = rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
  return { review_count: rs.length, avg_rating: Math.round(avg * 10) / 10 };
}

export async function fetchProfileContributions(profileId: string): Promise<{ total: number; approved: number }> {
  try {
    const { data, error } = await supabase.rpc('get_profile_contribution_counts', { profile_uid: profileId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { total: row?.total ?? 0, approved: row?.approved ?? 0 };
  } catch {
    return { total: 0, approved: 0 };
  }
}

export async function fetchPortfolioGallery(limit = 24): Promise<PortfolioItem[]> {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select(`
      *,
      profile:profiles!portfolio_items_profile_id_fkey(*)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PortfolioItem[];
}

export async function fetchCompanies(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('creator_type', 'company')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Profile[];
}

export type { ProjectMember, ProjectRole, ProjectSkill };

// ============================================================
// Phase 2: Authenticated user actions
// ============================================================

export interface CreateProjectInput {
  title: string;
  slug: string;
  summary: string;
  overview?: string;
  problem?: string;
  target_users?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  project_type?: string;
  compensation?: string;
  is_beginner_friendly?: boolean;
  is_remote?: boolean;
  cover_image_url?: string;
  demo_url?: string;
  repo_url?: string;
  team_size?: number;
  duration_weeks?: number;
  time_commitment_hours?: string;
  location?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function createProject(
  profileId: string,
  input: CreateProjectInput,
  skills: string[] = [],
  roles: { title: string; description?: string }[] = [],
): Promise<Project> {
  const slug = input.slug || slugify(input.title);
  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: profileId,
      title: input.title,
      slug,
      summary: input.summary,
      overview: input.overview ?? null,
      problem: input.problem ?? null,
      target_users: input.target_users ?? null,
      category: input.category ?? null,
      difficulty: input.difficulty ?? null,
      status: input.status ?? 'recruiting',
      project_type: input.project_type ?? 'student',
      compensation: input.compensation ?? null,
      is_beginner_friendly: input.is_beginner_friendly ?? false,
      is_remote: input.is_remote ?? true,
      cover_image_url: input.cover_image_url ?? null,
      demo_url: input.demo_url ?? null,
      repo_url: input.repo_url ?? null,
      team_size: input.team_size ?? 0,
      duration_weeks: input.duration_weeks ?? null,
      time_commitment_hours: input.time_commitment_hours ?? null,
      location: input.location ?? null,
      published_at: new Date().toISOString(),
      is_demo: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  const project = data as unknown as Project;

  // Insert skills
  if (skills.length > 0) {
    const { error: skErr } = await supabase
      .from('project_skills')
      .insert(skills.map((name) => ({ project_id: project.id, name })));
    if (skErr) throw skErr;
  }

  // Insert roles
  if (roles.length > 0) {
    const { error: rErr } = await supabase
      .from('project_roles')
      .insert(roles.map((r) => ({ project_id: project.id, title: r.title, description: r.description ?? null, is_open: true })));
    if (rErr) throw rErr;
  }

  return project;
}

export async function createApplication(
  projectId: string,
  applicantId: string,
  roleTitle: string | null,
  message: string | null,
): Promise<Application> {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      project_id: projectId,
      applicant_id: applicantId,
      role_title: roleTitle,
      message,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as Application;
}

export async function fetchMyApplications(profileId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      project:projects!applications_project_id_fkey(title, slug, status)
    `)
    .eq('applicant_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Application[];
}

export async function fetchProjectApplications(projectId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      applicant:profiles!applications_applicant_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Application[];
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) throw error;
}

export async function updateProfile(
  profileId: string,
  updates: {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    banner_url?: string;
    location?: string;
    website_url?: string;
    github_url?: string;
    linkedin_url?: string;
    experience_level?: string;
    availability?: string;
    interests?: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', profileId);

  if (error) throw error;
}

export async function checkExistingApplication(projectId: string, applicantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('project_id', projectId)
    .eq('applicant_id', applicantId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// ============================================================
// Phase 3: Project management + messaging
// ============================================================

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

export async function updateProjectStatus(projectId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  if (error) throw error;
}

export async function updateProject(
  projectId: string,
  updates: {
    title?: string;
    summary?: string;
    overview?: string | null;
    problem?: string | null;
    target_users?: string | null;
    category?: string | null;
    difficulty?: string | null;
    project_type?: string;
    compensation?: string | null;
    status?: string;
    is_beginner_friendly?: boolean;
    is_remote?: boolean;
    cover_image_url?: string | null;
    demo_url?: string | null;
    repo_url?: string | null;
    team_size?: number;
    duration_weeks?: number | null;
    time_commitment_hours?: string | null;
    location?: string | null;
  },
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      skills:project_skills(*),
      roles:project_roles(*),
      members:project_members(
        *,
        profile:profiles!project_members_profile_id_fkey(*)
      )
    `)
    .single();
  if (error) throw error;
  return data as unknown as Project;
}

export async function updateMemberRole(
  projectId: string,
  profileId: string,
  role: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function fetchProjectApplicationCount(projectId: string): Promise<number> {
  const { count, error } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

export async function fetchProjectApplicationsDetailed(projectId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      applicant:profiles!applications_applicant_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Application[];
}

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string,
  projectId?: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      project_id: projectId ?? null,
      body,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

export async function fetchInboxMessages(profileId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(*),
      recipient:profiles!messages_recipient_id_fkey(*),
      project:projects!messages_project_id_fkey(title, slug)
    `)
    .or(`recipient_id.eq.${profileId},sender_id.eq.${profileId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function fetchUnreadMessageCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchPendingReviewCount(profileId: string): Promise<number> {
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', profileId);
  if (projErr || !projects?.length) return 0;

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id')
    .in('project_id', projects.map((p) => p.id));
  if (taskErr || !tasks?.length) return 0;

  const { count, error } = await supabase
    .from('task_submissions')
    .select('id', { count: 'exact', head: true })
    .in('task_id', tasks.map((t) => t.id))
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);
  if (error) throw error;
}

// ============================================================
// Phase 5: Team management + project-scoped messaging
// ============================================================

export async function addProjectMember(
  projectId: string,
  profileId: string,
  role: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, profile_id: profileId, role }, { onConflict: 'project_id,profile_id' });
  if (error) throw error;
}

export async function removeProjectMember(
  projectId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles!project_members_profile_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ProjectMember[];
}

export async function fetchConversation(
  profileId: string,
  otherProfileId: string,
  projectId?: string,
): Promise<Message[]> {
  let q = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(*),
      recipient:profiles!messages_recipient_id_fkey(*),
      project:projects!messages_project_id_fkey(title, slug)
    `)
    .or(`and(sender_id.eq.${profileId},recipient_id.eq.${otherProfileId}),and(sender_id.eq.${otherProfileId},recipient_id.eq.${profileId})`);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function acceptApplicationAndAddMember(
  applicationId: string,
  projectId: string,
  applicantId: string,
  roleTitle: string | null,
): Promise<void> {
  const { error: appErr } = await supabase
    .from('applications')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (appErr) throw appErr;

  await addProjectMember(projectId, applicantId, roleTitle);
}

// ============================================================
// Phase 5: Task management + submissions
// ============================================================

export async function createTask(
  projectId: string,
  createdBy: string,
  input: {
    title: string;
    description?: string;
    acceptance_criteria?: string;
    assignee_id?: string | null;
    due_date?: string | null;
  },
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      created_by: createdBy,
      title: input.title,
      description: input.description ?? null,
      acceptance_criteria: input.acceptance_criteria ?? null,
      assignee_id: input.assignee_id ?? null,
      due_date: input.due_date ?? null,
      status: input.assignee_id ? 'in_progress' : 'open',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Task;
}

export async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(*),
      submissions:task_submissions(
        *,
        submitter:profiles!task_submissions_submitted_by_fkey(*)
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Task[];
}

export async function fetchAssignedTasks(profileId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects!tasks_project_id_fkey(title, slug),
      submissions:task_submissions(
        *,
        submitter:profiles!task_submissions_submitted_by_fkey(*)
      )
    `)
    .eq('assignee_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Task[];
}

export async function updateTask(
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    acceptance_criteria?: string;
    assignee_id?: string | null;
    status?: TaskStatus;
    due_date?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function createSubmission(
  taskId: string,
  submittedBy: string,
  input: { evidence_url?: string; notes?: string },
): Promise<TaskSubmission> {
  const { data, error } = await supabase
    .from('task_submissions')
    .insert({
      task_id: taskId,
      submitted_by: submittedBy,
      evidence_url: input.evidence_url ?? null,
      notes: input.notes ?? null,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;

  await updateTask(taskId, { status: 'submitted' });

  return data as unknown as TaskSubmission;
}

export async function reportCannotComplete(
  taskId: string,
  submittedBy: string,
  reason: string,
): Promise<TaskSubmission> {
  const { data, error } = await supabase
    .from('task_submissions')
    .insert({
      task_id: taskId,
      submitted_by: submittedBy,
      notes: reason,
      evidence_url: null,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;

  await updateTask(taskId, { status: 'submitted' });

  return data as unknown as TaskSubmission;
}

export async function reviewSubmission(
  submissionId: string,
  taskId: string,
  review: {
    status: 'approved' | 'changes_requested' | 'not_completed' | 'rejected';
    reviewer_feedback?: string;
    rating?: number;
  },
): Promise<void> {
  const { error: subErr } = await supabase
    .from('task_submissions')
    .update({
      status: review.status,
      reviewer_feedback: review.reviewer_feedback ?? null,
      rating: review.rating ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
  if (subErr) throw subErr;

  const taskStatus: TaskStatus = review.status === 'approved' ? 'approved'
    : review.status === 'changes_requested' ? 'changes_requested'
    : review.status === 'not_completed' ? 'in_progress'
    : 'rejected';

  await updateTask(taskId, { status: taskStatus });
}
