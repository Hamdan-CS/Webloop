import { supabase } from '@/integrations/supabase/client';
import type {
  Application,
  Invitation,
  Message,
  Notification,
  PortfolioItem,
  Profile,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectSkill,
  Review,
  Task,
  TaskSize,
  TaskStatus,
  TaskSubmission,
  Team,
  TeamMember,
} from '@/types';

/** Team embed for project queries (migration 026): name/logo + members with
 * profiles (RLS returns only active members to everyone but the team owner). */
const TEAM_EMBED = `id, name, slug, logo_url, bio, created_by, archived_at, created_at,
  members:team_members(*, profile:profiles!team_members_profile_id_fkey(id, display_name, handle, avatar_url, creator_type))`;

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
      ),
      team:teams!projects_team_id_fkey(${TEAM_EMBED})
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

export interface EcosystemStats {
  projects: number;
  students: number;
  companies: number;
}

/** Sitewide headline counts for the home page's infinity scene. Best-effort —
 * any failed count comes back 0 so the caller can fall back to sample figures. */
export async function fetchEcosystemStats(): Promise<EcosystemStats> {
  const [projects, students, companies] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', VISIBLE_STATUSES),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('creator_type', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('creator_type', 'company'),
  ]);
  return {
    projects: projects.count ?? 0,
    students: students.count ?? 0,
    companies: companies.count ?? 0,
  };
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
      ),
      team:teams!projects_team_id_fkey(${TEAM_EMBED})
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
      ),
      team:teams!projects_team_id_fkey(${TEAM_EMBED})
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

/** A profile by id (Messages page: opening a chat with someone you haven't messaged yet). */
export async function fetchProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Profile) ?? null;
}

const PROJECT_WITH_RELATIONS = `
  *,
  owner:profiles!projects_owner_id_fkey(*),
  skills:project_skills(*),
  roles:project_roles(*),
  members:project_members(
    *,
    profile:profiles!project_members_profile_id_fkey(*)
  ),
  team:teams!projects_team_id_fkey(${TEAM_EMBED})
`;

/**
 * Projects owned by `profileId`. Public views (someone else's profile) only see
 * published statuses; pass `includeDrafts` on the owner's own screens so their
 * drafts and archived projects don't silently disappear.
 */
export async function fetchProfileProjects(
  profileId: string,
  options: { includeDrafts?: boolean } = {},
): Promise<Project[]> {
  let q = supabase
    .from('projects')
    .select(PROJECT_WITH_RELATIONS)
    .eq('owner_id', profileId);
  if (!options.includeDrafts) q = q.in('status', VISIBLE_STATUSES);
  const { data, error } = await q.order('published_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

/**
 * Projects `profileId` has joined as a team member (via an accepted invitation
 * or application), excluding ones they own. Drafts are only returned once the
 * members-can-read-their-projects RLS policy (migration 020) is applied.
 */
export async function fetchJoinedProjects(profileId: string): Promise<Project[]> {
  const { data: rows, error: memberError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('profile_id', profileId);
  if (memberError) throw memberError;
  const ids = (rows ?? []).map((r) => r.project_id as string);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_WITH_RELATIONS)
    .in('id', ids)
    .neq('owner_id', profileId)
    .order('updated_at', { ascending: false, nullsFirst: false });
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

export async function fetchPortfolioGallery(limit = 60): Promise<PortfolioItem[]> {
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

export interface CompanyProjectSummary {
  count: number;
  people: { id: string; display_name: string; avatar_url: string | null }[];
}

/** Published-project counts and a few contributor avatars per company profile id. */
export async function fetchCompanyProjectSummaries(ownerIds: string[]): Promise<Record<string, CompanyProjectSummary>> {
  if (ownerIds.length === 0) return {};
  const { data, error } = await supabase
    .from('projects')
    .select('owner_id, members:project_members(profile:profiles!project_members_profile_id_fkey(id, display_name, avatar_url))')
    .in('owner_id', ownerIds)
    .in('status', VISIBLE_STATUSES);
  if (error) throw error;
  const out: Record<string, CompanyProjectSummary> = {};
  for (const row of (data ?? []) as unknown as { owner_id: string; members: { profile: CompanyProjectSummary['people'][number] | null }[] }[]) {
    const e = (out[row.owner_id] ??= { count: 0, people: [] });
    e.count += 1;
    for (const m of row.members ?? []) {
      if (m.profile && !e.people.some((x) => x.id === m.profile!.id)) e.people.push(m.profile);
    }
  }
  return out;
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
  /** Team project: the team (the owner must be an active member). */
  team_id?: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Readable messages for the Independent publishing rules (migration 027). */
const PROJECT_RULES: Record<string, string> = {
  EMAIL_NOT_CONFIRMED: 'Confirm your email address before publishing a project.',
  NEEDS_LINKEDIN_OR_ORCID: 'Add your LinkedIn or ORCID link in Settings → Profile before publishing.',
  INDEPENDENT_PROJECT_LIMIT: 'You can have 3 open projects until WebLoop approves your account. Close one or ask to get verified.',
  INDEPENDENT_NO_PAID: 'Independent projects are unpaid/educational or open-source only.',
  INDEPENDENT_PROJECT_TYPE: 'Choose Independent, Research or Open-source as the project type.',
  NOT_TEAM_MEMBER: "You can only use a team you're an active member of.",
  CANNOT_JOIN_PROJECT: "This account can't join that project.",
};
export function projectRuleMessage(raw: string): string {
  const key = Object.keys(PROJECT_RULES).find((k) => raw.includes(k));
  return key ? PROJECT_RULES[key] : raw;
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
      team_id: input.team_id ?? null,
      published_at: new Date().toISOString(),
      is_demo: false,
    })
    .select('*')
    .single();

  if (error) throw new Error(projectRuleMessage(error.message));
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
    education_level?: string;
    university?: string;
    major?: string;
    graduation_year?: number | null;
    website_url?: string;
    github_url?: string;
    linkedin_url?: string;
    orcid_url?: string | null;
    experience_level?: string;
    availability?: string;
    interests?: string[];
    preferred_roles?: string[];
    languages?: string[];
    portfolio_links?: string[];
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
  const { data, error } = await supabase.from('projects').delete().eq('id', projectId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Project could not be deleted (it may already be removed, or you don't have permission).");
  }
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
      ),
      team:teams!projects_team_id_fkey(${TEAM_EMBED})
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

/**
 * No `reply_to` embed here on purpose: `messages.reply_to_id` is a self-referencing FK,
 * and PostgREST can't resolve it by constraint name (schema-cache limitation on self-joins)
 * — embedding it by column name instead returns the relationship in the wrong direction
 * (the messages that quote this one, not the message this one quotes). A quoted message is
 * always part of the same conversation fetch anyway, so callers resolve `reply_to_id` to its
 * message client-side (see `ConversationThread`'s `messagesById` lookup) instead.
 */
const MESSAGE_SELECT = `
  *,
  sender:profiles!messages_sender_id_fkey(*),
  recipient:profiles!messages_recipient_id_fkey(*),
  project:projects!messages_project_id_fkey(title, slug, owner_id),
  task:tasks!messages_task_id_fkey(id, title, status, assignee_id, due_date, assignee:profiles!tasks_assignee_id_fkey(display_name, avatar_url))
`;

export async function sendMessage(
  senderId: string,
  recipientId: string,
  body: string,
  projectId?: string,
  taskId?: string | null,
  replyToId?: string | null,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      project_id: projectId ?? null,
      body,
      task_id: taskId ?? null,
      reply_to_id: replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

export async function fetchInboxMessages(profileId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .or(`recipient_id.eq.${profileId},sender_id.eq.${profileId}`)
    .is('conversation_id', null)
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

export async function fetchNotifications(profileId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Notification[];
}

export async function fetchUnreadNotificationCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', profileId)
    .is('read_at', null);
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
    .select(MESSAGE_SELECT)
    .or(`and(sender_id.eq.${profileId},recipient_id.eq.${otherProfileId}),and(sender_id.eq.${otherProfileId},recipient_id.eq.${profileId})`);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

/** For chat UIs that only know a projectId (not the full Project) — used to decide
 * whether the signed-in viewer can "Add Task" from a conversation. */
export async function fetchProjectOwnerId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { owner_id: string }).owner_id;
}

/**
 * Creates a task and posts it as a reference-card message in the conversation with its
 * assignee, in one call. The task is always assigned to `assigneeId` (the other party in
 * the chat) — mirrors `createTask`'s existing auto-`in_progress`-on-assign behavior.
 */
export async function createTaskFromMessage(
  projectId: string,
  createdBy: string,
  recipientId: string,
  input: {
    title: string;
    description?: string;
    acceptance_criteria?: string;
    due_date?: string | null;
    /** null/empty = General task (open to the team). */
    assignee_id?: string | null;
  },
  note?: string,
): Promise<{ task: Task; message: Message }> {
  const task = await createTask(projectId, createdBy, { ...input, assignee_id: input.assignee_id || null });
  const message = await sendMessage(
    createdBy,
    recipientId,
    note?.trim() || `Created a task: ${task.title}`,
    projectId,
    task.id,
  );
  return { task, message };
}

/** Projects owned by `ownerId` that `memberId` is a member of — decides whether
 * "Add task" shows in a 1-to-1 chat and fills its Project dropdown. */
export async function fetchSharedOwnedProjects(ownerId: string, memberId: string): Promise<{ id: string; title: string }[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, project_members!inner(profile_id)')
    .eq('owner_id', ownerId)
    .eq('project_members.profile_id', memberId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as { id: string; title: string }[]).map(({ id, title }) => ({ id, title }));
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
    size?: TaskSize;
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
      size: input.size ?? 'medium',
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
    size?: TaskSize;
  },
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId);
  if (error) throw error;
}

/** A project member takes an open, unassigned task (migration 023 · claim_task). */
export async function claimTask(taskId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_task', { p_task_id: taskId });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('TASK_ALREADY_TAKEN')) throw new Error('Someone already took this task.');
    if (msg.includes('NOT_A_MEMBER')) throw new Error('Only team members can take this task.');
    throw error;
  }
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

// ============================================================
// Invitations: owner invites a specific person by email to join their project
// ============================================================

const INVITE_ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "No WebLoop account found for this email.",
  NOT_PROJECT_OWNER: "Only the project owner can invite teammates.",
  CANNOT_INVITE_SELF: "You can't invite yourself.",
};

function inviteErrorMessage(err: unknown): string {
  // Supabase/Postgrest errors are plain objects with a `message` field, not
  // `instanceof Error` — fall back to that before stringifying the whole object.
  const raw = err instanceof Error
    ? err.message
    : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : String(err);
  for (const code of Object.keys(INVITE_ERROR_MESSAGES)) {
    if (raw.includes(code)) return INVITE_ERROR_MESSAGES[code];
  }
  return raw || 'Failed to send invitation';
}

export async function inviteUserToProject(
  projectId: string,
  email: string,
  roleTitle: string | null,
  message: string | null,
): Promise<Invitation> {
  const { data, error } = await supabase.rpc('invite_user_by_email', {
    p_project_id: projectId,
    p_email: email,
    p_role_title: roleTitle,
    p_message: message,
  });
  if (error) throw new Error(inviteErrorMessage(error));
  return data as unknown as Invitation;
}

export async function fetchMyInvitations(profileId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      project:projects!invitations_project_id_fkey(title, slug, status),
      inviter:profiles!invitations_inviter_id_fkey(*),
      team:teams!invitations_team_id_fkey(name, slug)
    `)
    .eq('invitee_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Invitation[];
}

export async function fetchProjectInvitations(projectId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Invitation[];
}

export async function respondToInvite(
  inviteId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', inviteId);
  if (error) throw error;
}

/**
 * Accepting an invite must also add the invitee to `project_members`, but that
 * table's RLS only lets the project owner write to it — so this runs server-side
 * via a SECURITY DEFINER function instead of two separate client-side writes.
 */
export async function acceptInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function fetchPendingInviteCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('invitations')
    .select('id', { count: 'exact', head: true })
    .eq('invitee_id', profileId)
    .eq('status', 'pending');
  if (error) return 0;
  return count ?? 0;
}

// ============================================================
// Teams (Part B, migration 026)
// ============================================================

const TEAM_SELECT = `*, members:team_members(*, profile:profiles!team_members_profile_id_fkey(*))`;

const TEAM_ERRORS: Record<string, string> = {
  ONLY_STUDENTS: 'Only student accounts can be in a team.',
  NOT_TEAM_OWNER: 'Only the team owner can do that.',
  TEAM_FULL: 'This team is full (8 people max).',
  BAD_TEAM_NAME: 'Team names need 2–40 characters.',
  CANNOT_INVITE_SELF: "You're already in this team.",
  NOT_TEAM_MEMBER: "You're not in this team.",
  OWNER_CANNOT_REMOVE_SELF: 'Use “Leave team” instead.',
};
function teamError(error: { message: string }): Error {
  const key = Object.keys(TEAM_ERRORS).find((k) => error.message.includes(k));
  return new Error(key ? TEAM_ERRORS[key] : error.message);
}

/** Active members only (what everyone else sees). */
export const activeTeamMembers = (team?: Team | null): TeamMember[] =>
  (team?.members ?? []).filter((m) => m.status === 'active');

export async function createTeam(name: string, bio?: string, logoUrl?: string): Promise<Team> {
  const { data, error } = await supabase.rpc('create_team', { p_name: name, p_bio: bio ?? null, p_logo_url: logoUrl ?? null });
  if (error) throw teamError(error);
  return data as unknown as Team;
}

/** Teams I'm an active member of (with all members I can see). */
export async function fetchMyTeams(profileId: string): Promise<Team[]> {
  const { data: rows, error: e1 } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('profile_id', profileId)
    .eq('status', 'active');
  if (e1) throw e1;
  const ids = (rows ?? []).map((r) => r.team_id as string);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('teams').select(TEAM_SELECT).in('id', ids).is('archived_at', null).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Team[];
}

/** Teams a profile is an active member of — for the "Teams" section on profiles. */
export async function fetchTeamsForProfile(profileId: string): Promise<Team[]> {
  return fetchMyTeams(profileId);
}

/** Team invites waiting for me (no project attached are answered with respondTeamInvite). */
export async function fetchMyTeamInvites(profileId: string): Promise<(TeamMember & { team: Team; inviter: Profile | null })[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*, team:teams(*), inviter:profiles!team_members_invited_by_fkey(*)')
    .eq('profile_id', profileId)
    .eq('status', 'invited')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (TeamMember & { team: Team; inviter: Profile | null })[];
}

export interface TeamPageData {
  team: Team;
  projects: Project[];
  verifiedTasks: number;
}

export async function fetchTeamBySlug(slug: string): Promise<TeamPageData | null> {
  const { data, error } = await supabase.from('teams').select(TEAM_SELECT).eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const team = data as unknown as Team;
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select(`*, owner:profiles!projects_owner_id_fkey(*), skills:project_skills(*), members:project_members(*, profile:profiles!project_members_profile_id_fkey(*)), team:teams!projects_team_id_fkey(${TEAM_EMBED})`)
    .eq('team_id', team.id)
    .in('status', VISIBLE_STATUSES)
    .order('published_at', { ascending: false, nullsFirst: false });
  if (pErr) throw pErr;
  const list = (projects ?? []) as unknown as Project[];
  let verifiedTasks = 0;
  if (list.length > 0) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('project_id', list.map((p) => p.id))
      .eq('status', 'approved');
    verifiedTasks = count ?? 0;
  }
  return { team, projects: list, verifiedTasks };
}

/** Invite a student; with projectId it's also "join team X on project Y". */
export async function inviteToTeam(teamId: string, profileId: string, projectId?: string | null): Promise<void> {
  const { error } = await supabase.rpc('invite_to_team', { p_team_id: teamId, p_profile_id: profileId, p_project_id: projectId ?? null });
  if (error) throw teamError(error);
}

export async function respondTeamInvite(teamId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_team_invite', { p_team_id: teamId, p_accept: accept });
  if (error) throw teamError(error);
}

export async function removeTeamMember(teamId: string, profileId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_team_member', { p_team_id: teamId, p_profile_id: profileId });
  if (error) throw teamError(error);
}

export async function leaveTeam(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_team', { p_team_id: teamId });
  if (error) throw teamError(error);
}

export async function updateTeam(teamId: string, patch: { name?: string; bio?: string | null; logo_url?: string | null }): Promise<void> {
  const { error } = await supabase.from('teams').update(patch).eq('id', teamId);
  if (error) throw teamError(error);
}

/** Students by name or @handle, for team invites. */
export async function searchStudents(query: string, excludeIds: string[] = []): Promise<Profile[]> {
  const term = query.trim().replace(/^@/, '').replace(/[%,()]/g, '');
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('creator_type', 'student')
    .or(`display_name.ilike.%${term}%,handle.ilike.%${term}%`)
    .limit(8);
  if (error) throw error;
  return ((data ?? []) as Profile[]).filter((p) => !excludeIds.includes(p.id));
}

/** Owner switches a team project to personal (or back to a team they're in). */
export async function setProjectTeam(projectId: string, teamId: string | null): Promise<void> {
  const { error } = await supabase.from('projects').update({ team_id: teamId }).eq('id', projectId);
  if (error) throw teamError(error);
}

// ============================================================
// Independent accounts (Part C, migration 027)
// ============================================================

const INDEPENDENT_ERRORS: Record<string, string> = {
  NEEDS_LINKEDIN_OR_ORCID: 'Add your LinkedIn or ORCID link in Settings → Profile first.',
  NOTE_TOO_SHORT: 'Write a short note about who you are (at least 10 characters).',
  ONLY_INDEPENDENTS: 'Only Independent accounts can do that.',
  RECIPIENT_MUST_BE_STUDENT: 'Projects can only be recommended to students.',
  RECIPIENT_MUST_BE_COMPANY: 'Students can only be recommended to companies.',
  MUST_RECOMMEND_A_STUDENT: 'Only students can be recommended to companies.',
  NOT_ADMIN: 'Admins only.',
};
function indepError(error: { message: string; code?: string }): Error {
  if (error.code === '23505') return new Error('You already endorsed this skill.');
  const key = Object.keys(INDEPENDENT_ERRORS).find((k) => error.message.includes(k));
  return new Error(key ? INDEPENDENT_ERRORS[key] : error.message);
}

/** Approved by WebLoop ("Verified Independent"). */
export const isVerifiedIndependent = (p?: Pick<Profile, 'creator_type' | 'independent_verified_at'> | null): boolean =>
  !!p && p.creator_type === 'independent' && !!p.independent_verified_at;

export async function requestIndependentVerification(note: string): Promise<void> {
  const { error } = await supabase.rpc('request_independent_verification', { p_note: note });
  if (error) throw indepError(error);
}

export interface Recommendation {
  id: string;
  from_profile: string;
  to_profile: string;
  about_profile: string | null;
  project_id: string | null;
  kind: 'project_to_student' | 'student_to_company';
  note: string | null;
  created_at: string;
  to?: Profile | null;
  about?: Profile | null;
  project?: { title: string; slug: string } | null;
}

export async function recommendProjectToStudent(fromId: string, studentId: string, projectId: string, note?: string): Promise<void> {
  const { error } = await supabase.from('recommendations').insert({ from_profile: fromId, to_profile: studentId, project_id: projectId, kind: 'project_to_student', note: note?.trim() || null });
  if (error) throw indepError(error);
}

export async function recommendStudentToCompany(fromId: string, companyId: string, studentId: string, note?: string): Promise<void> {
  const { error } = await supabase.from('recommendations').insert({ from_profile: fromId, to_profile: companyId, about_profile: studentId, kind: 'student_to_company', note: note?.trim() || null });
  if (error) throw indepError(error);
}

export async function fetchRecommendationsMade(fromId: string): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, to:profiles!recommendations_to_profile_fkey(*), about:profiles!recommendations_about_profile_fkey(*), project:projects(title, slug)')
    .eq('from_profile', fromId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Recommendation[];
}

export interface SkillEndorsement {
  id: string;
  from_profile: string;
  to_profile: string;
  skill: string;
  created_at: string;
  from?: Profile | null;
  to?: Profile | null;
}

export async function endorseSkill(fromId: string, studentId: string, skill: string): Promise<void> {
  const { error } = await supabase.from('skill_endorsements').insert({ from_profile: fromId, to_profile: studentId, skill: skill.trim() });
  if (error) throw indepError(error);
}

export async function fetchEndorsementsFor(studentId: string): Promise<SkillEndorsement[]> {
  const { data, error } = await supabase
    .from('skill_endorsements')
    .select('*, from:profiles!skill_endorsements_from_profile_fkey(id, display_name, handle, avatar_url, creator_type, independent_verified_at)')
    .eq('to_profile', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SkillEndorsement[];
}

export async function fetchEndorsementsGiven(fromId: string): Promise<SkillEndorsement[]> {
  const { data, error } = await supabase
    .from('skill_endorsements')
    .select('*, to:profiles!skill_endorsements_to_profile_fkey(id, display_name, handle, avatar_url)')
    .eq('from_profile', fromId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SkillEndorsement[];
}

/** Companies by name or @handle (for "Recommend to a company"). */
export async function searchCompanies(query: string): Promise<Profile[]> {
  const term = query.trim().replace(/^@/, '').replace(/[%,()]/g, '');
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('creator_type', 'company')
    .or(`display_name.ilike.%${term}%,handle.ilike.%${term}%`)
    .limit(8);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function reportContent(reporterId: string, target: { projectId?: string; profileId?: string }, reason: string): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: reporterId,
    project_id: target.projectId ?? null,
    profile_id: target.projectId ? null : target.profileId ?? null,
    reason: reason.trim() || null,
  });
  if (error) throw error;
}

export interface IndependentRequest {
  profile_id: string; display_name: string; handle: string; avatar_url: string | null;
  linkedin_url: string | null; orcid_url: string | null; note: string | null; requested_at: string;
}
export async function adminListIndependentRequests(): Promise<IndependentRequest[]> {
  const { data, error } = await supabase.rpc('admin_list_independent_requests');
  if (error) throw indepError(error);
  return (data ?? []) as IndependentRequest[];
}
export async function adminVerifyIndependent(profileId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_verify_independent', { p_profile_id: profileId, p_approve: approve });
  if (error) throw indepError(error);
}

export interface ContentReport {
  id: string; reason: string | null; created_at: string; reporter_name: string;
  project_id: string | null; project_title: string | null; project_slug: string | null;
  profile_id: string | null; profile_name: string | null; profile_handle: string | null;
}
export async function adminListContentReports(): Promise<ContentReport[]> {
  const { data, error } = await supabase.rpc('admin_list_content_reports');
  if (error) throw indepError(error);
  return (data ?? []) as ContentReport[];
}
export async function adminResolveContentReport(reportId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_content_report', { p_report_id: reportId });
  if (error) throw indepError(error);
}

// ============================================================
// Group chats (Part E, migration 028)
// ============================================================

export interface GroupConversation {
  conversation_id: string;
  kind: 'project' | 'team';
  project_id: string | null;
  team_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string | null;
  member_count: number;
  muted: boolean;
  left_at: string | null;
  last_read_at: string;
  last_body: string | null;
  last_sender_name: string | null;
  last_at: string | null;
  unread: number;
}

/** Route id for a group chat: /messages/g:<conversation id>. */
export const groupChatId = (conversationId: string) => `g:${conversationId}`;
export const parseGroupChatId = (id: string | null | undefined): string | null => (id && id.startsWith('g:') ? id.slice(2) : null);

export async function fetchMyGroups(): Promise<GroupConversation[]> {
  const { data, error } = await supabase.rpc('get_my_group_conversations');
  if (error) throw error;
  return (data ?? []) as GroupConversation[];
}

export async function fetchGroupMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function fetchGroupMembers(conversationId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('profile:profiles!conversation_members_profile_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as { profile: Profile | null }[]).map((r) => r.profile).filter((p): p is Profile => !!p);
}

export async function sendGroupMessage(
  senderId: string,
  conversationId: string,
  body: string,
  opts: { projectId?: string | null; taskId?: string | null; replyToId?: string | null } = {},
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      conversation_id: conversationId,
      project_id: opts.projectId ?? null,
      body,
      task_id: opts.taskId ?? null,
      reply_to_id: opts.replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

/** Owner creates a task from a project group chat and posts the card there. */
export async function createTaskInGroup(
  projectId: string,
  createdBy: string,
  conversationId: string,
  input: { title: string; description?: string; acceptance_criteria?: string; due_date?: string | null; assignee_id?: string | null },
): Promise<Message> {
  const task = await createTask(projectId, createdBy, { ...input, assignee_id: input.assignee_id || null });
  return sendGroupMessage(createdBy, conversationId, `Created a task: ${task.title}`, { projectId, taskId: task.id });
}

export async function markGroupRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function setGroupMuted(conversationId: string, muted: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_conversation_muted', { p_conversation_id: conversationId, p_muted: muted });
  if (error) throw error;
}
