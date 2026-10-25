import type { Compensation, CreatorType, Difficulty, ProjectStatus, ProjectType } from '@/lib/types';

export const statusLabel: Record<ProjectStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  recruiting: 'Recruiting',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const statusTone: Record<ProjectStatus, 'default' | 'accent' | 'green' | 'amber' | 'rose' | 'violet'> = {
  draft: 'default',
  published: 'default',
  recruiting: 'green',
  in_progress: 'amber',
  completed: 'accent',
  archived: 'default',
};

export const projectTypeLabel: Record<ProjectType, string> = {
  student: 'Student Project',
  company: 'Company Project',
  university: 'University Project',
  open_source: 'Open Source',
};

export const compensationLabel: Record<Compensation, string> = {
  paid: 'Paid',
  unpaid_educational: 'Unpaid · Educational',
  open_source: 'Open Source',
};

export const compensationTone: Record<Compensation, 'default' | 'accent' | 'green' | 'amber' | 'rose' | 'violet'> = {
  paid: 'green',
  unpaid_educational: 'amber',
  open_source: 'violet',
};

export const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const creatorTypeLabel: Record<CreatorType, string> = {
  student: 'Student',
  team: 'Student Team',
  company: 'Company',
  university: 'University',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function relativeDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 1) return 'today';
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}
