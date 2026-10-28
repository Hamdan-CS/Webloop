import { supabase } from '@/lib/supabase';
import type { ContributionTask, DailyContribution } from '@/components/contributions/types';

export async function fetchDailyContributions(studentId: string, days = 365): Promise<DailyContribution[]> {
  const { data, error } = await supabase.rpc('daily_contributions', { student_id: studentId, days });
  if (error) throw error;
  return (data ?? []) as unknown as DailyContribution[];
}

export async function fetchDailyContributionTasks(studentId: string, day: string): Promise<ContributionTask[]> {
  const { data, error } = await supabase.rpc('daily_contribution_tasks', { student_id: studentId, for_day: day });
  if (error) throw error;
  return (data ?? []) as unknown as ContributionTask[];
}
