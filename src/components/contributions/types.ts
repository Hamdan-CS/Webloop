import type { TaskSize, TaskStatus } from '@/lib/types';

export interface DailyContribution {
  day: string;
  points: number;
  avg_rating: number | null;
  task_count: number;
}

export interface ContributionTask {
  task_id: string;
  title: string;
  project_title: string;
  project_slug: string;
  owner_name: string;
  size: TaskSize;
  points: number;
  status: TaskStatus;
  stack: string[];
  rating: number | null;
  reviewer_feedback?: string | null;
  evidence_url?: string | null;
  notes?: string | null;
  accepted_at: string | null;
  created_at?: string;
}

/** One grid cell: a day plus its aggregate, ready to render. */
export interface DayCell {
  date: string;
  points: number;
  avgRating: number | null;
  taskCount: number;
  isToday: boolean;
  isPadding: boolean;
}

export type GridSize = 'full' | 'mini';
export type GridView = '3d' | '2d';
