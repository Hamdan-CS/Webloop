import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CalendarDays, ListChecks, Plus, Trash2, UserRound, X } from 'lucide-react';
import type { ProjectMember, Task } from '@/types';
import { WAvatar } from '@/components/app/ui';
import { Select } from '@/components/shared/ui/Select';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { cn } from '@/utils/cn';
import { CreateTaskForm } from './CreateTaskForm';
import { SubmissionReview } from './SubmissionReview';
import { REASSIGNABLE } from './taskStatus';
import type { useProjectTasks } from './useProjectTasks';

/*
 * The project's one Tasks section: a toolbar (counts, filters, New task),
 * a three-column board of compact cards, and a detail panel for the selected
 * task with the actions your role allows:
 *   owner  → assign / reassign, review submissions, delete, create
 *   member → take an open task
 *   assignee → link to submit work on the dashboard (MyTasksPanel)
 * Everything runs through useProjectTasks; permissions are unchanged.
 */
type Api = ReturnType<typeof useProjectTasks>;
type Filter = 'all' | 'open' | 'mine' | 'review';

const COLS = [
  { key: 'todo', label: 'To do', tone: '#9aa3ae', test: (t: Task) => t.status === 'open' },
  { key: 'doing', label: 'In progress', tone: 'var(--iris)', test: (t: Task) => ['in_progress', 'submitted', 'changes_requested'].includes(t.status) },
  { key: 'done', label: 'Done', tone: '#12996a', test: (t: Task) => t.status === 'approved' || t.status === 'rejected' },
] as const;

function badge(t: Task): [string, string] {
  if (t.status === 'open') return t.assignee_id ? ['To do', ''] : ['Open to the team', 'w-pt-b-open'];
  if (t.status === 'in_progress') return ['In progress', 'w-pt-b-doing'];
  if (t.status === 'submitted') return ['In review', 'w-pt-b-review'];
  if (t.status === 'changes_requested') return ['Changes requested', 'w-pt-b-changes'];
  if (t.status === 'approved') return ['Verified', 'w-pt-b-ok'];
  return ['Rejected', 'w-pt-b-changes'];
}

function due(d: string | null) {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  const days = Math.round((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return { label: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }), late: days < 0, soon: days >= 0 && days <= 2 };
}

const SIZE: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

export function ProjectTasks({
  api,
  members,
  isOwner,
  isMember,
  meId,
  dashboardPath,
}: {
  api: Api;
  members: ProjectMember[];
  isOwner: boolean;
  isMember: boolean;
  meId?: string;
  dashboardPath: string;
}) {
  const { tasks, loading } = api;
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  // a deleted task closes its panel
  useEffect(() => { if (selectedId && !tasks.some((t) => t.id === selectedId)) setSelectedId(null); }, [tasks, selectedId]);

  const filters = useMemo(() => {
    const f: { key: Filter; label: string; test: (t: Task) => boolean }[] = [
      { key: 'all', label: 'All', test: () => true },
      { key: 'open', label: 'Open to the team', test: (t) => t.status === 'open' && !t.assignee_id },
    ];
    if (meId && (isMember || tasks.some((t) => t.assignee_id === meId))) f.push({ key: 'mine', label: 'Assigned to me', test: (t) => t.assignee_id === meId });
    if (isOwner) f.push({ key: 'review', label: 'Needs review', test: (t) => t.status === 'submitted' });
    return f;
  }, [isOwner, isMember, meId, tasks]);
  const active = filters.find((f) => f.key === filter) ?? filters[0];
  const shown = tasks.filter(active.test);
  const done = tasks.filter((t) => t.status === 'approved').length;

  if (loading) return <div className="flex justify-center py-12"><LoopLoader size={24} /></div>;

  return (
    <div className="w-pt">
      <div className="w-pt-bar">
        <div className="w-pt-sum">
          <b>Tasks</b>
          <span>{tasks.length} total · {done} verified</span>
        </div>
        <div className="w-pt-filters" role="group" aria-label="Filter tasks">
          {filters.map((f) => (
            <button key={f.key} type="button" className={cn('w-chip', active.key === f.key && 'on')} aria-pressed={active.key === f.key} onClick={() => setFilter(f.key)}>
              {f.label}<em>{tasks.filter(f.test).length}</em>
            </button>
          ))}
        </div>
        {isOwner && (
          <button type="button" className="w-btn-d w-btn-sm" onClick={() => setCreating(true)}><Plus size={15} /> New task</button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="w-pt-none">
          <ListChecks size={26} />
          <b>No tasks yet</b>
          <span>{isOwner ? 'Create a task for one member or leave it open to the team.' : 'The owner hasn’t published any tasks for this project yet.'}</span>
          {isOwner && <button type="button" className="w-btn-d w-btn-sm" onClick={() => setCreating(true)}><Plus size={15} /> New task</button>}
        </div>
      ) : (
        <div className={cn('w-pt-main', selected && 'has-detail')}>
          <div className="w-pt-board">
            {COLS.map((c) => {
              const list = shown.filter(c.test);
              return (
                <section key={c.key} className="w-pt-col" aria-label={`${c.label}, ${list.length}`}>
                  <header><i style={{ background: c.tone }} /><span>{c.label}</span><em>{list.length}</em></header>
                  {list.length === 0 ? (
                    <p className="w-pt-empty">No tasks</p>
                  ) : (
                    <ul>
                      {list.map((t) => {
                        const [label, cls] = badge(t);
                        const d = due(t.due_date);
                        return (
                          <li key={t.id}>
                            <button type="button" className={cn('w-pt-card', selectedId === t.id && 'on')} style={{ ['--tone' as string]: c.tone }} aria-pressed={selectedId === t.id} onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}>
                              <b>{t.title}</b>
                              <span className="w-pt-cmeta">
                                <span className={cn('w-pt-b', cls)}>{label}</span>
                                {d && <span className={cn('w-pt-due', d.late && 'late', d.soon && 'soon')}><CalendarDays size={12} />{d.label}</span>}
                                <span className="w-pt-who">{t.assignee ? <WAvatar name={t.assignee.display_name} src={t.assignee.avatar_url} size={22} /> : <span className="w-pt-nobody" title="Unassigned"><UserRound size={12} /></span>}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {selected && (
            <>
              <div className="w-pt-scrim" onClick={() => setSelectedId(null)} aria-hidden="true" />
              <TaskDetail
                key={selected.id}
                task={selected}
                api={api}
                members={members}
                isOwner={isOwner}
                isMember={isMember}
                meId={meId}
                dashboardPath={dashboardPath}
                onClose={() => setSelectedId(null)}
              />
            </>
          )}
        </div>
      )}

      {creating && isOwner && createPortal(
        <div className="w-modal" role="dialog" aria-modal="true" aria-label="New task" onClick={() => setCreating(false)}>
          <div className="w-modal-in" onClick={(e) => e.stopPropagation()}>
            <CreateTaskForm
              members={members}
              busy={api.busy}
              onClose={() => setCreating(false)}
              onCreate={async (input) => { if (await api.create(input)) setCreating(false); }}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function TaskDetail({
  task, api, members, isOwner, isMember, meId, dashboardPath, onClose,
}: {
  task: Task; api: Api; members: ProjectMember[]; isOwner: boolean; isMember: boolean; meId?: string; dashboardPath: string; onClose: () => void;
}) {
  const [label, cls] = badge(task);
  const d = due(task.due_date);
  const submissions = task.submissions ?? [];
  const mine = !!meId && task.assignee_id === meId;
  const canTake = isMember && !task.assignee_id && task.status === 'open';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="w-pt-detail" aria-label={`Task: ${task.title}`}>
      <header>
        <span className={cn('w-pt-b', cls)}>{label}</span>
        <button type="button" className="w-icon-btn" aria-label="Close task" onClick={onClose}><X size={16} /></button>
      </header>
      <h3>{task.title}</h3>

      <dl className="w-pt-facts">
        <div><dt>Assignee</dt><dd>{task.assignee ? <><WAvatar name={task.assignee.display_name} src={task.assignee.avatar_url} size={20} />{task.assignee.display_name}</> : 'Open to the team'}</dd></div>
        <div><dt>Due</dt><dd className={cn(d?.late && 'late', d?.soon && 'soon')}>{d ? d.label : '—'}</dd></div>
        <div><dt>Size</dt><dd>{SIZE[task.size] ?? '—'}</dd></div>
      </dl>

      <section>
        <small>Description</small>
        <p>{task.description || 'No description.'}</p>
      </section>
      {task.acceptance_criteria && (
        <section>
          <small>Done when</small>
          <p>{task.acceptance_criteria}</p>
        </section>
      )}

      {canTake && (
        <button type="button" className="w-btn-d w-pt-wide" disabled={api.claimingId === task.id} onClick={() => api.claim(task)}>
          {api.claimingId === task.id ? 'Taking…' : 'Take task'}
        </button>
      )}
      {mine && ['in_progress', 'changes_requested'].includes(task.status) && (
        <Link to={dashboardPath} className="w-btn-l w-pt-wide">Submit work on your dashboard</Link>
      )}

      {isOwner && (
        <>
          {REASSIGNABLE.includes(task.status) && (
            <section>
              <Select
                label="Assign to"
                value={task.assignee_id ?? ''}
                onChange={(v) => api.assign(task, v)}
                options={[
                  { value: '', label: 'Open to the team (unassigned)' },
                  ...members.map((m) => ({ value: m.profile_id, label: m.profile?.display_name ?? 'Member' })),
                ]}
              />
            </section>
          )}
          <section>
            <small>Submissions</small>
            {submissions.length === 0 ? (
              <p>No submissions yet.</p>
            ) : (
              <div className="w-pt-subs">
                {submissions.map((s) => (
                  <SubmissionReview key={s.id} submission={s} taskId={task.id} onReview={api.review} busy={api.reviewing === s.id} />
                ))}
              </div>
            )}
          </section>
          <button type="button" className="w-btn-l w-pt-wide w-danger" onClick={async () => { if (await api.remove(task)) onClose(); }}>
            <Trash2 size={14} /> Delete task
          </button>
        </>
      )}
    </aside>
  );
}
