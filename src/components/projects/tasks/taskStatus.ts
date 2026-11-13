import type { TaskStatus } from '@/types';

/** Status badges for tasks (moved unchanged from TaskManagementPanel). */
export const statusBadge: Record<TaskStatus, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  open: { tone: 'default', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  submitted: { tone: 'accent', label: 'Submitted' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

/** Once work is submitted or decided, the assignee is part of its record and stays fixed. */
export const REASSIGNABLE: TaskStatus[] = ['open', 'in_progress', 'changes_requested'];

export type ReviewStatus = 'approved' | 'changes_requested' | 'not_completed' | 'rejected';
