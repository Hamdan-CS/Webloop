import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ListChecks,
  GitBranch,
  CheckCircle2,
  Users,
  Loader2,
  Star,
  Send,
  ExternalLink,
  Clock,
  FileText,
} from 'lucide-react';
import {
  fetchProjectTasks,
  fetchProjectMembers,
} from '@/lib/api';
import type { Project, ProjectMember, Task, TaskSubmission, TaskStatus, SubmissionStatus } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating, NoRating } from '@/components/ui/Rating';
import { relativeDate } from '@/lib/labels';

const LIFECYCLE_STEPS: { key: string; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

const taskStatusBadge: Record<TaskStatus, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  open: { tone: 'default', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  submitted: { tone: 'accent', label: 'Submitted' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

const submissionStatusBadge: Record<SubmissionStatus, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  pending: { tone: 'accent', label: 'Pending Review' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  not_completed: { tone: 'amber', label: 'Not Completed' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

interface Props {
  project: Project;
  isOwner: boolean;
}

export function ProjectProgressDashboard({ project, isOwner }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        fetchProjectTasks(project.id),
        fetchProjectMembers(project.id),
      ]);
      setTasks(t);
      setMembers(m);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-accent-400" />
      </div>
    );
  }

  // Compute real totals from task data
  const totalTasks = tasks.length;
  const assignedTasks = tasks.filter((t) => t.assignee_id !== null).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'submitted' || t.status === 'changes_requested').length;
  const approvedTasks = tasks.filter((t) => t.status === 'approved').length;

  // All submissions across all tasks
  const allSubmissions: (TaskSubmission & { task: Task })[] = tasks.flatMap((t) =>
    (t.submissions ?? []).map((s) => ({ ...s, task: t })),
  );

  // Approved contributions per member (based on approved submissions)
  const approvedByMember = new Map<string, TaskSubmission[]>();
  for (const sub of allSubmissions) {
    if (sub.status === 'approved') {
      const arr = approvedByMember.get(sub.submitted_by) ?? [];
      arr.push(sub);
      approvedByMember.set(sub.submitted_by, arr);
    }
  }

  // Lifecycle: find index of current status
  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === project.status);

  return (
    <div className="space-y-6">
      {/* Section 1: Lifecycle */}
      <div>
        <h3 className="label-overline mb-3">Project lifecycle</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {LIFECYCLE_STEPS.map((s, i) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  i === currentIdx
                    ? 'bg-accent-500 text-ink-950'
                    : i < currentIdx
                    ? 'bg-signal-green/20 text-signal-green'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                {s.label}
              </span>
              {i < LIFECYCLE_STEPS.length - 1 && <ArrowRight size={12} className="text-slate-600" />}
            </span>
          ))}
        </div>
      </div>

      {/* Section 2: Task summary + list */}
      <div>
        <h3 className="label-overline mb-3">Tasks</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total tasks" value={totalTasks} />
          <StatCard label="Assigned" value={assignedTasks} />
          <StatCard label="In progress" value={inProgressTasks} />
          <StatCard label="Approved" value={approvedTasks} />
        </div>

        {totalTasks > 0 ? (
          <div className="mt-4 space-y-2">
            {tasks.map((task) => (
              <TaskListRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center">
            <ListChecks size={24} className="mx-auto text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">
              {isOwner ? 'No tasks yet. Create tasks from your dashboard to track team work.' : 'No tasks have been created for this project yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Submitted evidence */}
      <div>
        <h3 className="label-overline mb-3">Submitted evidence</h3>
        {allSubmissions.length > 0 ? (
          <div className="space-y-2">
            {allSubmissions.map((sub) => {
              const sb = submissionStatusBadge[sub.status] ?? submissionStatusBadge.pending;
              return (
                <div key={sub.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Avatar src={sub.submitter?.avatar_url} name={sub.submitter?.display_name ?? ''} size="xs" />
                        <Link to={`/creators/${sub.submitter?.handle}`} className="truncate text-xs font-medium text-white hover:text-accent-300 transition-colors">
                          {sub.submitter?.display_name ?? 'Unknown'}
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400">
                        Task: <span className="text-slate-300">{sub.task.title}</span>
                      </p>
                      {sub.evidence_url && (
                        <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200 transition-colors">
                          <ExternalLink size={11} /> View evidence
                        </a>
                      )}
                      {sub.notes && (
                        <p className="text-xs text-slate-500 line-clamp-2">{sub.notes}</p>
                      )}
                      {sub.reviewer_feedback && (
                        <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
                          <span className="text-slate-500">Owner feedback: </span>{sub.reviewer_feedback}
                          {sub.rating !== null && sub.rating !== undefined && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-signal-amber">
                              <Star size={10} fill="currentColor" /> {sub.rating}/5
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Badge tone={sb.tone}>{sb.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center">
            <GitBranch size={24} className="mx-auto text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">No evidence submissions yet.</p>
          </div>
        )}
      </div>

      {/* Section 4: Verified contributions */}
      <div>
        <h3 className="label-overline mb-3">Verified contributions</h3>
        {approvedByMember.size > 0 ? (
          <div className="space-y-2">
            {Array.from(approvedByMember.entries()).map(([memberId, subs]) => {
              const member = members.find((m) => m.profile_id === memberId);
              const profile = member?.profile;
              const ratings = subs.filter((s) => s.rating !== null && s.rating !== undefined);
              const avgRating = ratings.length > 0 ? ratings.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratings.length : null;
              return (
                <div key={memberId} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={profile?.avatar_url} name={profile?.display_name ?? ''} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/creators/${profile?.handle}`} className="truncate text-sm font-medium text-white hover:text-accent-300 transition-colors">
                          {profile?.display_name ?? 'Unknown member'}
                        </Link>
                        <p className="text-xs text-slate-500">{subs.length} approved contribution{subs.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {avgRating !== null ? (
                      <Rating value={avgRating} count={ratings.length} />
                    ) : (
                      <NoRating label="Not rated yet" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center">
            <CheckCircle2 size={24} className="mx-auto text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">No approved contributions yet.</p>
          </div>
        )}
      </div>

      {/* Section 5: Team overview */}
      <div>
        <h3 className="label-overline mb-3">Team overview</h3>
        {members.length > 0 ? (
          <div className="space-y-2">
            {members.map((m) => {
              const memberTasks = tasks.filter((t) => t.assignee_id === m.profile_id);
              const memberApproved = memberTasks.filter((t) => t.status === 'approved').length;
              const memberInProgress = memberTasks.filter((t) => t.status === 'in_progress' || t.status === 'submitted' || t.status === 'changes_requested').length;
              const progress = memberTasks.length > 0 ? Math.round((memberApproved / memberTasks.length) * 100) : 0;
              return (
                <div key={m.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="flex items-center gap-3">
                    <Link to={`/creators/${m.profile?.handle}`} className="shrink-0">
                      <Avatar src={m.profile?.avatar_url} name={m.profile?.display_name ?? ''} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/creators/${m.profile?.handle}`} className="truncate text-sm font-medium text-white hover:text-accent-300 transition-colors">
                        {m.profile?.display_name}
                      </Link>
                      <p className="text-xs text-slate-500">{m.role ?? 'Team member'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-300">
                        {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {memberApproved} approved · {memberInProgress} active
                      </p>
                    </div>
                  </div>
                  {memberTasks.length > 0 && (
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-signal-green transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center">
            <Users size={24} className="mx-auto text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">No accepted team members yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function TaskListRow({ task }: { task: Task }) {
  const sb = taskStatusBadge[task.status] ?? taskStatusBadge.open;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-slate-500 shrink-0" />
            <p className="truncate text-sm font-medium text-white">{task.title}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            {task.assignee ? (
              <span className="inline-flex items-center gap-1">
                <Avatar src={task.assignee.avatar_url} name={task.assignee.display_name} size="xs" />
                {task.assignee.display_name}
              </span>
            ) : (
              <span className="text-slate-600">Unassigned</span>
            )}
            {task.due_date && (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {relativeDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        <Badge tone={sb.tone}>{sb.label}</Badge>
      </div>
    </div>
  );
}
