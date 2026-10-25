import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  ListChecks,
  Star,
  X,
  Send,
  User,
} from 'lucide-react';
import {
  fetchProjectTasks,
  fetchProjectMembers,
  createTask,
  deleteTask,
  reviewSubmission,
} from '@/lib/api';
import type { ProjectMember, Task, TaskStatus, TaskSubmission } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { relativeDate } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthContext';

const statusBadge: Record<TaskStatus, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  open: { tone: 'default', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  submitted: { tone: 'accent', label: 'Submitted' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

interface Props {
  projectId: string;
  profileId: string;
}

export function TaskManagementPanel({ projectId, profileId }: Props) {
  const { refreshCounts } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        fetchProjectTasks(projectId),
        fetchProjectMembers(projectId),
      ]);
      setTasks(t);
      setMembers(m);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (input: {
    title: string;
    description: string;
    acceptance_criteria: string;
    assignee_id: string;
    due_date: string;
  }) => {
    setBusy(true);
    try {
      await createTask(projectId, profileId, {
        title: input.title,
        description: input.description || undefined,
        acceptance_criteria: input.acceptance_criteria || undefined,
        assignee_id: input.assignee_id || null,
        due_date: input.due_date || null,
      });
      setShowCreate(false);
      await loadData();
    } catch {
      // ignore
    }
    setBusy(false);
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch {
      // ignore
    }
  };

  const handleReview = async (
    submission: TaskSubmission,
    taskId: string,
    status: 'approved' | 'changes_requested' | 'not_completed' | 'rejected',
    feedback: string,
    rating: number,
  ) => {
    setReviewing(submission.id);
    try {
      await reviewSubmission(submission.id, taskId, {
        status,
        reviewer_feedback: feedback || undefined,
        rating: status === 'approved' ? rating : undefined,
      });
      await loadData();
      await refreshCounts();
    } catch {
      // ignore
    }
    setReviewing(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-white">Task Management</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="surface p-8 text-center">
          <ListChecks size={32} className="mx-auto text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">No tasks yet. Create tasks and assign them to your team members.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              expanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              onDelete={() => handleDelete(task.id)}
              onReview={handleReview}
              reviewing={reviewing}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          members={members}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          busy={busy}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  expanded,
  onToggle,
  onDelete,
  onReview,
  reviewing,
}: {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReview: (submission: TaskSubmission, taskId: string, status: 'approved' | 'changes_requested' | 'not_completed' | 'rejected', feedback: string, rating: number) => void;
  reviewing: string | null;
}) {
  const sb = statusBadge[task.status];
  const submissions = task.submissions ?? [];

  return (
    <div className="surface-raised overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button onClick={onToggle} className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white text-sm">{task.title}</p>
              <Badge tone={sb.tone}>{sb.label}</Badge>
            </div>
            {task.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>}
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              {task.assignee && (
                <span className="inline-flex items-center gap-1">
                  <Avatar src={task.assignee.avatar_url} name={task.assignee.display_name} size="xs" />
                  {task.assignee.display_name}
                </span>
              )}
              {task.due_date && <span>Due {task.due_date}</span>}
              {submissions.length > 0 && <span>{submissions.length} submission(s)</span>}
            </div>
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-600 hover:text-signal-rose hover:bg-signal-rose/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/8 p-4 space-y-3">
          {task.acceptance_criteria && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Acceptance Criteria</p>
              <p className="text-sm text-slate-300">{task.acceptance_criteria}</p>
            </div>
          )}

          {submissions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Submissions</p>
              {submissions.map((sub) => (
                <SubmissionReview
                  key={sub.id}
                  submission={sub}
                  taskId={task.id}
                  onReview={onReview}
                  busy={reviewing === sub.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No submissions yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionReview({
  submission,
  taskId,
  onReview,
  busy,
}: {
  submission: TaskSubmission;
  taskId: string;
  onReview: (submission: TaskSubmission, taskId: string, status: 'approved' | 'changes_requested' | 'not_completed' | 'rejected', feedback: string, rating: number) => void;
  busy: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(4);
  const subStatus: Record<string, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
    pending: { tone: 'accent', label: 'Pending Review' },
    approved: { tone: 'green', label: 'Approved' },
    changes_requested: { tone: 'amber', label: 'Changes Requested' },
    not_completed: { tone: 'amber', label: 'Not Completed' },
    rejected: { tone: 'rose', label: 'Rejected' },
  };
  const ss = subStatus[submission.status] ?? subStatus.pending;
  const isPending = submission.status === 'pending';

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar src={submission.submitter?.avatar_url} name={submission.submitter?.display_name ?? ''} size="xs" />
          <span className="text-xs font-medium text-white">{submission.submitter?.display_name}</span>
        </div>
        <Badge tone={ss.tone}>{ss.label}</Badge>
      </div>

      {submission.notes && <p className="text-sm text-slate-300">{submission.notes}</p>}
      {submission.evidence_url && (
        <a href={submission.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200">
          <Send size={11} /> View evidence
        </a>
      )}

      {submission.reviewer_feedback && (
        <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
          <span className="text-slate-500">Feedback: </span>{submission.reviewer_feedback}
          {submission.rating && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-signal-amber">
              <Star size={10} fill="currentColor" /> {submission.rating}
            </span>
          )}
        </div>
      )}

      {isPending && (
        <div className="space-y-2 pt-1">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (optional for approve, recommended for changes/reject)"
            className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={cn('transition-colors', n <= rating ? 'text-signal-amber' : 'text-slate-600 hover:text-slate-400')}
              >
                <Star size={14} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => onReview(submission, taskId, 'approved', feedback, rating)}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReview(submission, taskId, 'changes_requested', feedback, 0)}>
              <RotateCcw size={13} /> Request Changes
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReview(submission, taskId, 'not_completed', feedback, 0)}>
              <AlertCircle size={13} /> Not Completed
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onReview(submission, taskId, 'rejected', feedback, 0)}>
              <XCircle size={13} /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTaskModal({
  members,
  onClose,
  onCreate,
  busy,
}: {
  members: ProjectMember[];
  onClose: () => void;
  onCreate: (input: { title: string; description: string; acceptance_criteria: string; assignee_id: string; due_date: string }) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description, acceptance_criteria: criteria, assignee_id: assigneeId, due_date: dueDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-white">Create Task</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build landing page hero section"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Acceptance Criteria</span>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={2}
              placeholder="What constitutes done?"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Assign to</span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-slate-200 focus:border-accent-400/40"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.profile_id} className="bg-ink-900">
                    {m.profile?.display_name} ({m.role ?? 'member'})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-slate-200 focus:border-accent-400/40"
              />
            </label>
          </div>

          {members.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-signal-amber">
              <User size={14} /> No accepted team members yet. Accept join requests first to assign tasks.
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={handleSubmit} disabled={busy || !title.trim()} className="flex-1">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Task
          </Button>
          <Button variant="ghost" onClick={onClose} className="px-5">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
