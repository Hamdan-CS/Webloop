import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks,
  GitBranch,
  CheckCircle2,
  Users,
  Star,
  ExternalLink,
  Clock,
  FileText,
  UserPlus,
  X,
  Loader2,
  AlertCircle,
  Mail,
  Rocket,
  Plus,
} from 'lucide-react';
import { useFloatingPanel } from '@/components/FloatingPanel';
import {
  fetchProjectTasks,
  fetchProjectMembers,
  fetchProjectApplicationsDetailed,
  fetchProjectInvitations,
  inviteUserToProject,
} from '@/services/api';
import type { Application, Invitation, Project, ProjectMember, Task, TaskSubmission, TaskStatus, SubmissionStatus } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { relativeDate } from '@/utils/labels';

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
  onClose?: () => void;
}

const ACTIVE_TASK_STATUSES: TaskStatus[] = ['in_progress', 'submitted', 'changes_requested'];
type TaskFilter = 'all' | 'open' | 'active' | 'approved';
const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'active', label: 'In progress' },
  { key: 'approved', label: 'Approved' },
];

type DashTab = 'overview' | 'tasks' | 'team' | 'activity';
const DASH_TABS: { key: DashTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'team', label: 'Team' },
  { key: 'activity', label: 'Activity' },
];

type ActivityItem = { id: string; at: string; icon: React.ReactNode; text: string };

export function ProjectProgressDashboard({ project, isOwner, onClose }: Props) {
  const { openPanel } = useFloatingPanel();
  const [dashTab, setDashTab] = useState<DashTab>('overview');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const tiltRef = useRef<HTMLDivElement>(null);

  // Same mouse tilt as the home page panel, kept small because this one holds real work.
  const onTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || window.innerWidth <= 960 || !window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const b = el.getBoundingClientRect();
    el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
    el.style.transform = `perspective(2000px) rotateX(${(-((e.clientY - b.top) / b.height - 0.5) * 1.5).toFixed(2)}deg) rotateY(${(((e.clientX - b.left) / b.width - 0.5) * 2).toFixed(2)}deg)`;
  };
  const onTiltLeave = () => { if (tiltRef.current) tiltRef.current.style.transform = ''; };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m, apps, inv] = await Promise.all([
        fetchProjectTasks(project.id),
        fetchProjectMembers(project.id),
        isOwner ? fetchProjectApplicationsDetailed(project.id) : Promise.resolve([]),
        isOwner ? fetchProjectInvitations(project.id) : Promise.resolve([]),
      ]);
      setTasks(t);
      setMembers(m);
      setPendingApps(apps.filter((a) => a.status === 'pending'));
      setInvites(inv);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [project.id, isOwner]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoopLoader size={24} />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const assignedTasks = tasks.filter((t) => t.assignee_id !== null).length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'submitted' || t.status === 'changes_requested').length;
  const approvedTasks = tasks.filter((t) => t.status === 'approved').length;
  const completionPct = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  const allSubmissions: (TaskSubmission & { task: Task })[] = tasks.flatMap((t) =>
    (t.submissions ?? []).map((s) => ({ ...s, task: t })),
  );

  const approvedByMember = new Map<string, TaskSubmission[]>();
  for (const sub of allSubmissions) {
    if (sub.status === 'approved') {
      const arr = approvedByMember.get(sub.submitted_by) ?? [];
      arr.push(sub);
      approvedByMember.set(sub.submitted_by, arr);
    }
  }

  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === project.status);

  const activity: ActivityItem[] = [
    ...members.map((m): ActivityItem => ({
      id: `m-${m.id}`,
      at: m.joined_at,
      icon: <Users size={13} />,
      text: `${m.profile?.display_name ?? 'Someone'} joined the team`,
    })),
    ...allSubmissions.map((s): ActivityItem => ({
      id: `s-${s.id}`,
      at: s.created_at,
      icon: <GitBranch size={13} />,
      text: `${s.submitter?.display_name ?? 'Someone'} submitted evidence for "${s.task.title}"`,
    })),
    ...tasks.filter((t) => t.status === 'approved').map((t): ActivityItem => ({
      id: `t-${t.id}`,
      at: t.updated_at,
      icon: <CheckCircle2 size={13} />,
      text: `"${t.title}" was approved`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20);

  const visibleTasks = tasks.filter((t) => {
    if (assigneeFilter !== 'all' && t.assignee_id !== assigneeFilter) return false;
    if (taskFilter === 'open') return t.status === 'open';
    if (taskFilter === 'active') return ACTIVE_TASK_STATUSES.includes(t.status);
    if (taskFilter === 'approved') return t.status === 'approved';
    return true;
  });
  const showTasksFor = (memberId: string | 'all') => { setAssigneeFilter(memberId); setTaskFilter('all'); setDashTab('tasks'); };

  return (
    <div>
      <div className="dash-stage">
        <div className="dash-tilt" ref={tiltRef} onPointerMove={onTiltMove} onPointerLeave={onTiltLeave}>
          <div className="dash dash-app">
            <div className="dash-top">
              <h3>
                <span className="art" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--blue))' }} />
                <span className="truncate">{project.title}</span>
              </h3>
              <div className="d-tabs" role="tablist">
                {DASH_TABS.map((t) => (
                  <button key={t.key} type="button" role="tab" aria-selected={dashTab === t.key} className={dashTab === t.key ? 'on' : ''} onClick={() => setDashTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
              {onClose && (
                <button type="button" className="dash-close" onClick={onClose} aria-label="Close overview">
                  <X size={16} />
                </button>
              )}
            </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={dashTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="dpane space-y-6"
        >
          {dashTab === 'overview' && (
            <OverviewPane
              tasks={tasks}
              members={members}
              approved={allSubmissions.filter((s) => s.status === 'approved')}
              activity={activity}
              currentIdx={currentIdx}
              completionPct={completionPct}
              approvedTasks={approvedTasks}
              inProgressTasks={inProgressTasks}
              isOwner={isOwner}
              onInvite={() => setShowInvite(true)}
              onShowTasks={showTasksFor}
              onAddTask={() => openPanel('tasks')}
            />
          )}

          {dashTab === 'tasks' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total tasks" value={totalTasks} />
                <StatCard label="Assigned" value={assignedTasks} />
                <StatCard label="In progress" value={inProgressTasks} />
                <StatCard label="Approved" value={approvedTasks} />
              </div>

              {totalTasks > 0 ? (
                <>
                  <div className="ft-row">
                    {TASK_FILTERS.map((f) => (
                      <button key={f.key} type="button" className={`pill${taskFilter === f.key ? ' on' : ''}`} onClick={() => setTaskFilter(f.key)}>{f.label}</button>
                    ))}
                    {members.length > 0 && <span style={{ width: 10 }} />}
                    {members.length > 0 && (
                      <button type="button" className={`pill${assigneeFilter === 'all' ? ' on' : ''}`} onClick={() => setAssigneeFilter('all')}>Everyone</button>
                    )}
                    {members.map((m) => (
                      <button key={m.id} type="button" className={`pill${assigneeFilter === m.profile_id ? ' on' : ''}`} onClick={() => setAssigneeFilter(m.profile_id)}>
                        {m.profile?.display_name ?? 'Member'}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {visibleTasks.map((task) => <TaskListRow key={task.id} task={task} />)}
                    {visibleTasks.length === 0 && <EmptyState icon={<ListChecks size={22} />} text="No tasks match these filters." />}
                  </div>
                </>
              ) : (
                <div className="dcell dash-start">
                  <ListChecks size={24} className="mx-auto" />
                  <p className="mt-2">{isOwner ? 'No tasks yet. Add your first task to start tracking work.' : 'No tasks have been created for this project yet.'}</p>
                  {isOwner && <button type="button" className="btn btn-primary btn-sm" onClick={() => openPanel('tasks')}><Plus size={14} /> Add a task</button>}
                </div>
              )}

              <div>
                <h3 className="label-overline mb-3">Submitted evidence</h3>
                {allSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    {allSubmissions.map((sub) => <SubmissionRow key={sub.id} sub={sub} />)}
                  </div>
                ) : (
                  <EmptyState icon={<GitBranch size={22} />} text="No evidence submissions yet." />
                )}
              </div>
            </>
          )}

          {dashTab === 'team' && (
            <>
              {isOwner && (
                <div className="flex items-center justify-between">
                  <h3 className="label-overline">Invite a teammate</h3>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                    <UserPlus size={14} /> Invite
                  </button>
                </div>
              )}

              {isOwner && invites.length > 0 && (
                <div>
                  <h3 className="label-overline mb-3">Sent invitations</h3>
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div key={inv.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-sm text-white"><Mail size={13} className="text-slate-500" /> {inv.invitee_email}</span>
                        <Badge tone={inv.status === 'accepted' ? 'green' : inv.status === 'declined' ? 'rose' : 'amber'}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOwner && pendingApps.length > 0 && (
                <div>
                  <h3 className="label-overline mb-3">Pending join requests ({pendingApps.length})</h3>
                  <div className="space-y-2">
                    {pendingApps.map((a) => (
                      <div key={a.id} className="rounded-xl border border-signal-amber/20 bg-signal-amber/5 p-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={a.applicant?.avatar_url} name={a.applicant?.display_name ?? ''} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Link to={`/creators/${a.applicant?.handle}`} className="truncate text-xs font-medium text-white hover:text-accent-300">
                              {a.applicant?.display_name}
                            </Link>
                            <p className="text-[10px] text-slate-500">{a.role_title ?? 'General application'}</p>
                          </div>
                          <Badge tone="amber">Pending</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="label-overline mb-3">Team overview</h3>
                {members.length > 0 ? (
                  <div className="space-y-2">
                    {members.map((m) => <MemberRow key={m.id} member={m} tasks={tasks} />)}
                  </div>
                ) : (
                  <EmptyState icon={<Users size={22} />} text="No accepted team members yet." />
                )}
              </div>

              <div>
                <h3 className="label-overline mb-3">Verified contributions</h3>
                {approvedByMember.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(approvedByMember.entries()).map(([memberId, subs]) => (
                      <ContributionRow key={memberId} member={members.find((m) => m.profile_id === memberId)} subs={subs} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<CheckCircle2 size={22} />} text="No approved contributions yet." />
                )}
              </div>
            </>
          )}

          {dashTab === 'activity' && (
            activity.length > 0 ? (
              <div className="space-y-2">
                {activity.map((item) => <ActivityRow key={item.id} item={item} />)}
              </div>
            ) : (
              <EmptyState icon={<Rocket size={22} />} text="No activity yet — once tasks move and people join, it'll show up here." />
            )
          )}
        </motion.div>
      </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Outside the panel: its CSS transform would otherwise trap this fixed-position dialog. */}
      {showInvite && (
        <InviteModal
          projectId={project.id}
          onClose={() => setShowInvite(false)}
          onInvited={(inv) => { setInvites((prev) => [inv, ...prev.filter((i) => i.invitee_email !== inv.invitee_email)]); }}
        />
      )}
    </div>
  );
}

const DONUT_LENGTH = 314;
const DAY_MS = 86_400_000;

/** Counts approved work into time buckets, oldest first. */
function approvedBuckets(approved: TaskSubmission[], range: '30' | '7') {
  const bucketDays = range === '30' ? 2 : 1;
  const count = range === '30' ? 15 : 7;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: count }, (_, i) => {
    const end = startOfToday + DAY_MS - (count - 1 - i) * bucketDays * DAY_MS;
    return { end, start: end - bucketDays * DAY_MS, value: 0 };
  });
  for (const s of approved) {
    const at = new Date(s.reviewed_at ?? s.created_at).getTime();
    const bucket = buckets.find((b) => at >= b.start && at < b.end);
    if (bucket) bucket.value += 1;
  }
  return buckets;
}

function OverviewPane({
  tasks, members, approved, activity, currentIdx, completionPct, approvedTasks, inProgressTasks, isOwner, onInvite, onShowTasks, onAddTask,
}: {
  tasks: Task[];
  members: ProjectMember[];
  approved: TaskSubmission[];
  activity: ActivityItem[];
  currentIdx: number;
  completionPct: number;
  approvedTasks: number;
  inProgressTasks: number;
  isOwner: boolean;
  onInvite: () => void;
  onShowTasks: (memberId: string | 'all') => void;
  onAddTask: () => void;
}) {
  const [range, setRange] = useState<'30' | '7'>('30');
  // Starts empty and fills one frame later so the ring, bars and chart animate in.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const buckets = approvedBuckets(approved, range);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.value));
  const approvedInRange = buckets.reduce((sum, b) => sum + b.value, 0);
  const milestoneProgress = currentIdx > 0 ? (currentIdx / (LIFECYCLE_STEPS.length - 1)) * 80 : 0;

  return (
    <div>
      <div className="dgrid">
        <div className="dcell">
          <div className="donut-wrap">
            <button type="button" className="donut" aria-label={`Project ${completionPct}% complete. Open tasks`} onClick={() => onShowTasks('all')}>
              <svg viewBox="0 0 120 120">
                <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--blue)" /></linearGradient></defs>
                <circle className="bg" cx="60" cy="60" r="50" />
                <circle className="fg" cx="60" cy="60" r="50" style={{ strokeDashoffset: filled ? DONUT_LENGTH * (1 - completionPct / 100) : DONUT_LENGTH }} />
              </svg>
              <b>{completionPct}<span>%</span></b>
            </button>
            <div className="kpis">
              <div><b>{tasks.length}</b>Total tasks</div>
              <div><b className="c1">{approvedTasks}</b>Approved</div>
              <div><b className="c2">{inProgressTasks}</b>In progress</div>
              <div><b>{tasks.length - approvedTasks - inProgressTasks}</b>Remaining</div>
            </div>
          </div>
        </div>
        <div className="dcell">
          <h4>
            Team members
            {isOwner && <button type="button" className="btn btn-ghost btn-sm" onClick={onInvite}>Invite</button>}
          </h4>
          {members.length > 0 ? (
            <div className="ref-avs" style={{ display: 'flex' }}>
              {members.slice(0, 6).map((m) => <Avatar key={m.id} src={m.profile?.avatar_url} name={m.profile?.display_name ?? ''} size="sm" />)}
              {members.length > 6 && <span style={{ width: 32, height: 32 }}>+{members.length - 6}</span>}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 13 }}>No team members yet.</p>
          )}
          <h4 style={{ margin: '16px 0 4px' }}>Project stage</h4>
          <div className="miles five" style={{ gridTemplateColumns: 'repeat(5, 1fr)', ['--mp' as string]: filled ? `${milestoneProgress}%` : '0%' } as React.CSSProperties}>
            {LIFECYCLE_STEPS.map((s, i) => (
              <div key={s.key} className={`mile${i <= currentIdx ? ' done' : ''}`} aria-current={i === currentIdx ? 'step' : undefined}>{s.label}</div>
            ))}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="dcell dash-start">
          <Rocket size={24} className="mx-auto" />
          <p className="mt-2">{isOwner ? 'Add your first task and progress will show up here.' : 'Progress will show up here once tasks are added.'}</p>
          {isOwner && <button type="button" className="btn btn-primary btn-sm" onClick={onAddTask}><Plus size={14} /> Add a task</button>}
        </div>
      ) : (
        <div className="dgrid3">
          <div className="dcell">
            <h4>Task progress <span className="muted" style={{ fontWeight: 500, fontSize: 11.5 }}>click to filter</span></h4>
            <div className="dash-bars">
              {members.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Assign tasks to team members to see progress per person.</p>}
              {members.map((m) => {
                const own = tasks.filter((t) => t.assignee_id === m.profile_id);
                const done = own.filter((t) => t.status === 'approved').length;
                const name = m.profile?.display_name ?? 'Member';
                return (
                  <button key={m.id} type="button" className="dash-bar-row" onClick={() => onShowTasks(m.profile_id)} aria-label={`${name}: ${done} of ${own.length} approved. Show tasks`}>
                    <span>{name}</span>
                    <div className="tr"><i style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))', width: filled && own.length ? `${(done / own.length) * 100}%` : 0 }} /></div>
                    <span className="muted">{done}/{own.length}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dcell">
            <h4>
              Approved work
              <span className="dtog">
                <button type="button" className={range === '30' ? 'on' : ''} onClick={() => setRange('30')}>30 days</button>
                <button type="button" className={range === '7' ? 'on' : ''} onClick={() => setRange('7')}>7 days</button>
              </span>
            </h4>
            <div className="commit-big"><b>+{approvedInRange}</b><span className="muted" style={{ fontSize: 12 }}>approved in {range} days</span></div>
            <div className="commit">
              {buckets.map((b) => (
                <i key={b.end} style={{ height: filled ? `${(b.value / maxBucket) * 100}%` : 0 }} data-tip={`${b.value} approved · ${new Date(b.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
              ))}
            </div>
          </div>
          <div className="dcell">
            <h4>Activity feed</h4>
            {activity.length > 0 ? (
              <div className="dash-feed">
                {activity.slice(0, 4).map((item) => (
                  <div key={item.id} className="fi">
                    <span className="dash-fi-ic">{item.icon}</span>
                    <div>{item.text}<small>{relativeDate(item.at)}</small></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 13 }}>No activity yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InviteModal({ projectId, onClose, onInvited }: { projectId: string; onClose: () => void; onInvited: (inv: Invitation) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) { setError('Enter an email address.'); return; }
    setLoading(true);
    setError(null);
    try {
      const inv = await inviteUserToProject(projectId, email.trim(), role.trim() || null, message.trim() || null);
      onInvited(inv);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-white">Invite a teammate</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-signal-green/15 text-signal-green">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">Invitation sent!</h3>
            <p className="mt-2 text-sm text-slate-400">They'll see it on their "My Invitations" page and can accept or decline.</p>
            <button type="button" className="btn btn-primary mt-5" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">If this email has a WebLoop account, they'll receive an invitation to join this project.</p>
            <label className="block mb-3">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
              />
            </label>
            <label className="block mb-3">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Role (optional)</span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Engineer"
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
              />
            </label>
            <label className="block mb-4">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Message (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Say a bit about why you're inviting them"
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors resize-y"
              />
            </label>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose mb-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" className="btn btn-primary flex-1" disabled={loading} onClick={submit}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={15} />}
                {loading ? 'Sending…' : 'Send invite'}
              </button>
              <button type="button" className="btn btn-ghost px-5" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center text-slate-600">{icon}</span>
      <p className="mt-2 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <span className="mt-0.5 text-accent-300 shrink-0">{item.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-300">{item.text}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{relativeDate(item.at)}</p>
      </div>
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

function SubmissionRow({ sub }: { sub: TaskSubmission & { task: Task } }) {
  const sb = submissionStatusBadge[sub.status] ?? submissionStatusBadge.pending;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
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
          {sub.notes && <p className="text-xs text-slate-500 line-clamp-2">{sub.notes}</p>}
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
}

function MemberRow({ member, tasks }: { member: ProjectMember; tasks: Task[] }) {
  const memberTasks = tasks.filter((t) => t.assignee_id === member.profile_id);
  const memberApproved = memberTasks.filter((t) => t.status === 'approved').length;
  const memberInProgress = memberTasks.filter((t) => ['in_progress', 'submitted', 'changes_requested'].includes(t.status)).length;
  const progress = memberTasks.length > 0 ? Math.round((memberApproved / memberTasks.length) * 100) : 0;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-3">
        <Link to={`/creators/${member.profile?.handle}`} className="shrink-0">
          <Avatar src={member.profile?.avatar_url} name={member.profile?.display_name ?? ''} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/creators/${member.profile?.handle}`} className="truncate text-sm font-medium text-white hover:text-accent-300 transition-colors">
            {member.profile?.display_name}
          </Link>
          <p className="text-xs text-slate-500">{member.role ?? 'Team member'}</p>
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
          <div className="h-full rounded-full bg-signal-green transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function ContributionRow({ member, subs }: { member: ProjectMember | undefined; subs: TaskSubmission[] }) {
  const profile = member?.profile;
  const ratings = subs.filter((s) => s.rating !== null && s.rating !== undefined);
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratings.length : null;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
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
        {avgRating !== null ? <Rating value={avgRating} count={ratings.length} /> : <NoRating label="Not rated yet" />}
      </div>
    </div>
  );
}
