export type CreatorType = 'student' | 'team' | 'company' | 'university';
export type ProjectStatus = 'draft' | 'published' | 'recruiting' | 'in_progress' | 'completed' | 'archived';
export type ProjectType = 'student' | 'company' | 'university' | 'open_source';
export type Compensation = 'paid' | 'unpaid_educational' | 'open_source';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Profile {
  id: string;
  user_id: string | null;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  creator_type: CreatorType;
  verified: boolean;
  location: string | null;
  education_level: string | null;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  experience_level: string | null;
  availability: string | null;
  interests: string[] | null;
  preferred_roles: string[] | null;
  languages: string[] | null;
  portfolio_links: string[] | null;
  headline?: string | null;
  industry?: string | null;
  company_size?: string | null;
  badge?: string | null;
  accent_hue?: number | null;
  focus_area?: string | null;
  is_remote?: boolean | null;
  is_demo: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  summary: string;
  overview: string | null;
  problem: string | null;
  target_users: string | null;
  category: string | null;
  difficulty: Difficulty | null;
  status: ProjectStatus;
  project_type: ProjectType;
  compensation: Compensation | null;
  is_beginner_friendly: boolean;
  is_remote: boolean;
  cover_image_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  team_size: number;
  duration_weeks: number | null;
  time_commitment_hours: string | null;
  location: string | null;
  tagline?: string | null;
  progress?: number | null;
  stars_count?: number | null;
  views_count?: number | null;
  commits_count?: number | null;
  license?: string | null;
  published_at: string | null;
  is_demo: boolean;
  created_at: string;
  owner?: Profile;
  skills?: ProjectSkill[];
  roles?: ProjectRole[];
  members?: ProjectMember[];
}

export interface ProjectSkill {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  is_open: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface PortfolioItem {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  category: string | null;
  project_status: string | null;
  role: string | null;
  contributions: string | null;
  lessons_learned: string | null;
  work_type: string | null;
  tech?: string[] | null;
  activity?: number | null;
  is_verified?: boolean | null;
  is_public: boolean;
  is_demo: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  project_id: string | null;
  rating: number;
  dimensions: Record<string, number> | null;
  comment: string | null;
  is_verified_participation: boolean;
  created_at: string;
  reviewer?: Profile;
  project?: { title: string; slug: string } | null;
}

export interface ProfileWithStats extends Profile {
  review_count?: number;
  avg_rating?: number;
  project_count?: number;
  portfolio_count?: number;
}

export interface Application {
  id: string;
  project_id: string;
  applicant_id: string;
  role_title: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  applicant?: Profile;
  project?: { title: string; slug: string; status: string };
}

export interface Invitation {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id: string | null;
  role_title: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  inviter?: Profile;
  project?: { title: string; slug: string; status: string };
}

export type TaskStatus = 'open' | 'in_progress' | 'submitted' | 'approved' | 'changes_requested' | 'rejected';
export type SubmissionStatus = 'pending' | 'approved' | 'changes_requested' | 'not_completed' | 'rejected';
export type TaskSize = 'small' | 'medium' | 'large';

export interface Task {
  id: string;
  project_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  status: TaskStatus;
  size: TaskSize;
  tag?: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: Profile | null;
  project?: { title: string; slug: string } | null;
  submissions?: TaskSubmission[];
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  submitted_by: string;
  evidence_url: string | null;
  notes: string | null;
  status: SubmissionStatus;
  reviewer_feedback: string | null;
  rating: number | null;
  reviewed_at: string | null;
  created_at: string;
  submitter?: Profile;
}

export interface MessageTaskRef {
  id: string;
  title: string;
  status: TaskStatus;
  assignee_id: string | null;
  due_date: string | null;
  assignee?: { display_name: string; avatar_url: string | null } | null;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  project_id: string | null;
  body: string;
  is_read: boolean;
  created_at: string;
  task_id: string | null;
  /** The message being quoted, if any. Not embedded by the API (self-referencing FK —
   * see the comment on MESSAGE_SELECT in services/api.ts); resolve it client-side by
   * looking this id up in the same conversation's already-fetched messages. */
  reply_to_id: string | null;
  sender?: Profile;
  recipient?: Profile;
  project?: { title: string; slug: string; owner_id?: string } | null;
  task?: MessageTaskRef | null;
}

export type NotificationType =
  | 'application_received'
  | 'application_accepted'
  | 'application_declined'
  | 'invitation_accepted'
  | 'post_comment'
  | 'post_like'
  | 'post_removed'
  | 'post_restored'
  | 'post_verified'
  | 'warning';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  /** Shape depends on `type`; see the trigger functions in migration 022 for exactly
   * which keys each type writes (e.g. application_received carries project_title/
   * applicant_name, post_comment carries post_title/commenter_name). */
  payload: Record<string, string | number | boolean | null>;
  read_at: string | null;
  created_at: string;
}
