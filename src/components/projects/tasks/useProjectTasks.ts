import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  claimTask,
  createTask,
  deleteTask,
  fetchProjectTasks,
  reviewSubmission,
  sendMessage,
  updateTask,
} from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus, TaskSubmission } from '@/types';
import type { NewTaskInput } from './CreateTaskForm';
import type { ReviewStatus } from './taskStatus';

/**
 * One project's tasks and every task action, in one place. The action logic
 * is moved unchanged from the old TaskManagementPanel (status rules, assignee
 * notes, counts refresh, toasts); claim is the member's claim_task. Who may
 * do what is still decided by RLS and the page's isOwner / isMember checks.
 */
export function useProjectTasks(projectId: string | undefined, profileId: string | undefined) {
  const { refreshCounts } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setTasks(await fetchProjectTasks(projectId));
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { setLoading(true); void load(); }, [load]);

  // live: someone takes, submits or reviews a task → refresh
  useEffect(() => {
    if (!projectId) return;
    // unique per mount: the page and the drawer's inbox can watch the same project at once
    const channel = supabase
      .channel(`project-tasks-${projectId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, load]);

  /** Assignees otherwise only find out by opening their dashboard; a failed note must not undo the assignment. */
  const notifyAssignee = (assigneeId: string, task: Task) =>
    profileId && projectId ? sendMessage(profileId, assigneeId, `Assigned you a task: ${task.title}`, projectId, task.id).catch(() => {}) : Promise.resolve();

  const create = async (input: NewTaskInput): Promise<boolean> => {
    if (!projectId || !profileId) return false;
    setBusy(true);
    try {
      const task = await createTask(projectId, profileId, {
        title: input.title,
        description: input.description || undefined,
        acceptance_criteria: input.acceptance_criteria || undefined,
        assignee_id: input.assignee_id || null,
        due_date: input.due_date || null,
      });
      if (input.assignee_id) await notifyAssignee(input.assignee_id, task);
      await load();
      toast.success('Task created');
      setBusy(false);
      return true;
    } catch {
      toast.error("Couldn't create the task. Please try again.");
      setBusy(false);
      return false;
    }
  };

  const assign = async (task: Task, assigneeId: string) => {
    // Same rule as createTask: having an assignee means work has started.
    const status: TaskStatus =
      assigneeId && task.status === 'open' ? 'in_progress'
      : !assigneeId && task.status === 'in_progress' ? 'open'
      : task.status;
    try {
      await updateTask(task.id, { assignee_id: assigneeId || null, status });
      if (assigneeId) await notifyAssignee(assigneeId, task);
      await load();
      toast.success(assigneeId ? `Reassigned "${task.title}"` : `Unassigned "${task.title}"`);
    } catch {
      toast.error(`Couldn't reassign "${task.title}". Please try again.`);
    }
  };

  const remove = async (task: Task): Promise<boolean> => {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return false;
    try {
      await deleteTask(task.id);
      setTasks((list) => list.filter((t) => t.id !== task.id));
      toast.success(`Deleted "${task.title}"`);
      return true;
    } catch {
      toast.error(`Couldn't delete "${task.title}". Please try again.`);
      return false;
    }
  };

  const review = async (submission: TaskSubmission, taskId: string, status: ReviewStatus, feedback: string, rating: number) => {
    setReviewing(submission.id);
    try {
      await reviewSubmission(submission.id, taskId, {
        status,
        reviewer_feedback: feedback || undefined,
        rating: status === 'approved' ? rating : undefined,
      });
      await load();
      await refreshCounts();
      const reviewLabel = status === 'approved' ? 'Approved' : status === 'changes_requested' ? 'Requested changes' : status === 'not_completed' ? 'Marked as not completed' : 'Rejected';
      toast.success(reviewLabel);
    } catch {
      toast.error("Couldn't save the review. Please try again.");
    }
    setReviewing(null);
  };

  const claim = async (task: Task) => {
    setClaimingId(task.id);
    try {
      await claimTask(task.id);
      toast.success(`You took "${task.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't take this task. Please try again.");
    }
    await load();
    setClaimingId(null);
  };

  return { tasks, loading, busy, reviewing, claimingId, load, create, assign, remove, review, claim };
}
