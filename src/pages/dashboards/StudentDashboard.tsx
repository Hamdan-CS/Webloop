import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GitBranch, Inbox, Plus, ArrowRight, Briefcase,
  ClipboardList, CheckCircle2, Clock, MessageSquare, FileText, Pencil, UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingPanel } from '@/components/FloatingPanel';
import {
  fetchProfileProjects, fetchJoinedProjects, fetchProfilePortfolio, fetchProfileStats, fetchProjectApplicationsDetailed,
  fetchAssignedTasks, fetchMyApplications, fetchInboxMessages,
} from '@/services/api';
import type { Application, Message, PortfolioItem, Project, Task } from '@/types';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ManagedProjectGrid } from '@/components/projects/ManagedProjectGrid';
import { ApplicantsInbox } from '@/components/companies/ApplicantsInbox';
import { Button } from '@/components/shared/ui/Button';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { statusLabel, relativeDate } from '@/utils/labels';
import { MyTasksPanel } from '@/components/projects/MyTasksPanel';
import { cn } from '@/utils/cn';
import { WBox, WKpis, WPageHeader } from '@/components/app/ui';
import { WContribHeat } from '@/components/app/ui/WContribHeat';
import { projectDot, useWorkspaceMaybe } from '@/components/app/workspaceContext';

type Tab = 'ov' | 'pj' | 'tk' | 'rq';
type TaskView = 'all' | 'todo' | 'submitted' | 'approved' | 'changes';
type AppFilter = 'all' | 'pending' | 'accepted' | 'declined';

const TODO = ['open', 'in_progress'];
const TASK_VIEWS: { key: TaskView; label: string; test: (t: Task) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'todo', label: 'To do', test: (t) => TODO.includes(t.status) },
  { key: 'changes', label: 'Needs changes', test: (t) => t.status === 'changes_requested' },
  { key: 'submitted', label: 'In review', test: (t) => t.status === 'submitted' },
  { key: 'approved', label: 'Approved', test: (t) => t.status === 'approved' },
];
const APP_FILTERS: { key: AppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
];

interface FeedItem { id: string; icon: React.ReactNode; text: React.ReactNode; at: string }

export function StudentDashboard() {
  const { profile, unreadMessages, pendingInvites } = useAuth();
  const ws = useWorkspaceMaybe();
  const { openPanel } = useFloatingPanel();
  const [tab, setTab] = useState<Tab>('ov');
  const [taskView, setTaskView] = useState<TaskView>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [incomingApps, setIncomingApps] = useState<Application[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, jn, pfs, st, tks, apps, msgs] = await Promise.all([
        fetchProfileProjects(profile.id, { includeDrafts: true }),
        fetchJoinedProjects(profile.id).catch(() => [] as Project[]),
        fetchProfilePortfolio(profile.id),
        fetchProfileStats(profile.id),
        fetchAssignedTasks(profile.id).catch(() => [] as Task[]),
        fetchMyApplications(profile.id).catch(() => [] as Application[]),
        fetchInboxMessages(profile.id).catch(() => [] as Message[]),
      ]);
      setProjects(prs);
      setJoined(jn);
      setPortfolio(pfs);
      setStats({ avg: st.avg_rating, count: st.review_count });
      setTasks(tks);
      setMyApps(apps);
      setMessages(msgs);
      const perProject = await Promise.all(
        prs.map(async (p) => {
          const a = await fetchProjectApplicationsDetailed(p.id).catch(() => [] as Application[]);
          return a.map((x) => ({ ...x, project: { title: p.title, slug: p.slug, status: p.status } }));
        }),
      );
      setIncomingApps(perProject.flat());
      setLoading(false);
    })();
  }, [profile]);

  const handleAppDecided = (id: string, status: 'accepted' | 'declined') => {
    setIncomingApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const approved = tasks.filter((t) => t.status === 'approved').length;
  const inReview = tasks.filter((t) => t.status === 'submitted').length;
  const todo = tasks.filter((t) => TODO.includes(t.status)).length;
  const changes = tasks.filter((t) => t.status === 'changes_requested').length;
  const pct = tasks.length ? Math.round((approved / tasks.length) * 100) : 0;
  const appCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incomingApps.forEach((a) => {
      if (a.status === 'pending') counts[a.project_id] = (counts[a.project_id] ?? 0) + 1;
    });
    return counts;
  }, [incomingApps]);
  const requests = Object.values(appCounts).reduce((a, b) => a + b, 0);
  const allProjects = [...projects, ...joined];
  const activeProjects = allProjects.filter((p) => p.status === 'recruiting' || p.status === 'in_progress').length;
  const joinedIds = new Set(joined.map((p) => p.id));

  const nextUp = useMemo(
    () =>
      tasks
        .filter((t) => TODO.includes(t.status) || t.status === 'changes_requested')
        .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
        .slice(0, 4),
    [tasks],
  );

  const feed = useMemo<FeedItem[]>(() => {
    if (!profile) return [];
    const items: FeedItem[] = [];
    tasks.forEach((t) => {
      const proj = t.project?.title ? ` in ${t.project.title}` : '';
      if (t.status === 'approved') items.push({ id: 't' + t.id, icon: <CheckCircle2 size={14} />, text: <><b>{t.title}</b> was approved{proj}</>, at: t.updated_at });
      else if (t.status === 'changes_requested') items.push({ id: 't' + t.id, icon: <Pencil size={14} />, text: <>Changes requested on <b>{t.title}</b></>, at: t.updated_at });
      else if (t.status === 'submitted') items.push({ id: 't' + t.id, icon: <Clock size={14} />, text: <>You submitted <b>{t.title}</b> for review</>, at: t.updated_at });
    });
    myApps.forEach((a) => {
      const verb = a.status === 'accepted' ? 'was accepted' : a.status === 'declined' ? 'was declined' : 'is pending';
      items.push({ id: 'a' + a.id, icon: <FileText size={14} />, text: <>Your application to <b>{a.project?.title ?? 'a project'}</b> {verb}</>, at: a.updated_at ?? a.created_at });
    });
    messages.filter((m) => m.recipient_id === profile.id).slice(0, 5).forEach((m) =>
      items.push({ id: 'm' + m.id, icon: <MessageSquare size={14} />, text: <><b>{m.sender?.display_name ?? 'Someone'}</b> sent you a message</>, at: m.created_at }));
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [tasks, myApps, messages, profile]);

  if (!profile) return null;

  const goTasks = (v: TaskView) => { setTaskView(v); setTab('tk'); };
  const view = TASK_VIEWS.find((v) => v.key === taskView) ?? TASK_VIEWS[0];
  const pendingApps = myApps.filter((a) => a.status === 'pending').length;

  const first = profile.display_name.split(' ')[0];
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const subtitle = [
    `${activeProjects} active project${activeProjects !== 1 ? 's' : ''}`,
    inReview ? `${inReview} in review` : null,
    todo + changes ? `${todo + changes} to do` : null,
    requests ? `${requests} join request${requests !== 1 ? 's' : ''} waiting on you` : null,
    portfolio.length ? `${portfolio.length} portfolio item${portfolio.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="container-page py-8 pf sdash">
      {/* Header (demo Home: greeting, one line of context, actions right) + tabs */}
      <WPageHeader
        title={`${hi}, ${first}`}
        subtitle={subtitle}
        actions={<>
          {ws && <button type="button" className="w-btn-l" onClick={ws.openPalette}>Search <kbd>⌘K</kbd></button>}
          <Link to="/publish" className="w-btn-d"><Plus size={16} /> New project</Link>
        </>}
      />
      <div className="d-tabs pf-tabs sd-tabs w-gtabs-r" role="tablist">
        {([
          ['ov', 'Overview', null],
          ['pj', 'My Projects', allProjects.length],
          ['tk', 'Tasks', todo + changes],
          ['rq', 'Requests', requests + pendingApps],
        ] as [Tab, string, number | null][]).map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={cn('pf-tab', tab === k && 'on')} onClick={() => setTab(k)}>
            {label}
            {n ? <span className={cn('pf-count', k === 'rq' && 'amber')}>{n}</span> : null}
          </button>
        ))}
      </div>

      {/* OVERVIEW — the demo's Home grid */}
      {tab === 'ov' && (
        <div className="dpane mt-6 w-grid2">
          <div className="w-col">
            <WBox title="This week" meta={`${nextUp.length} task${nextUp.length !== 1 ? 's' : ''}`}>
              {loading ? (
                <div className="flex justify-center py-3"><LoopLoader size={22} /></div>
              ) : nextUp.length === 0 ? (
                <div className="w-inner w-empty">
                  <ClipboardList size={22} />
                  <span>Nothing waiting on you. Join a project to get tasks from its owner.</span>
                  <Link to="/explore" className="w-btn-l w-btn-sm">Explore projects</Link>
                </div>
              ) : (
                <div className="w-tasks">
                  {nextUp.map((t) => (
                    <button key={t.id} type="button" className="w-task text-left" onClick={() => goTasks('all')}>
                      <span className={cn('w-dot', t.status === 'changes_requested' && 'warn')} />
                      <span className="min-w-0 truncate">{t.title}</span>
                      <small>{t.status === 'changes_requested' ? 'needs changes' : t.due_date ? `due ${t.due_date}` : t.project?.title ?? ''}</small>
                    </button>
                  ))}
                </div>
              )}
            </WBox>

            <WBox title="My projects" meta={<button type="button" className="sd-link" onClick={() => setTab('pj')}>View all <ArrowRight size={12} /></button>}>
              {loading ? <div className="flex justify-center py-3"><LoopLoader size={22} /></div> : allProjects.length === 0 ? (
                <div className="w-inner w-empty">
                  <GitBranch size={22} />
                  <span>You haven't published or joined a project yet.</span>
                  <Link to="/publish" className="w-btn-l w-btn-sm"><Plus size={14} /> Publish your first project</Link>
                </div>
              ) : (
                <div className="w-list">
                  {allProjects.slice(0, 4).map((p) => (
                    <Link key={p.id} to={`/projects/${p.slug}`} className="w-lrow">
                      <span className="w-dot" style={{ background: projectDot(p.id) }} />
                      <span><b>{p.title}</b><small>{statusLabel[p.status]}{joinedIds.has(p.id) ? ' · Member' : ' · Owner'}</small></span>
                      {appCounts[p.id] > 0 && <span className="w-ct">{appCounts[p.id]}</span>}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </WBox>

            <WBox title="Shortcuts">
              <div className="w-links">
                <button type="button" className="w-btn-l w-btn-sm" onClick={() => openPanel('messages')}><Inbox size={14} /> Messages{unreadMessages > 0 && <span className="w-ct">{unreadMessages}</span>}</button>
                <button type="button" className="w-btn-l w-btn-sm" onClick={() => setTab('rq')}><Briefcase size={14} /> My applications</button>
                <Link to={`/creators/${profile.handle}`} className="w-btn-l w-btn-sm"><UserCircle2 size={14} /> View profile</Link>
                <Link to="/settings/profile" className="w-btn-l w-btn-sm"><Pencil size={14} /> Edit profile</Link>
              </div>
            </WBox>
          </div>

          <div className="w-col">
            <WKpis items={[
              { label: 'Verified', value: approved },
              { label: 'In review', value: inReview },
              { label: 'Projects', value: allProjects.length },
              { label: 'Rating', value: stats.count > 0 ? stats.avg.toFixed(1) : '—' },
            ]} />
            <WBox title="Contributions" meta="Last 26 weeks">
              <WContribHeat studentId={profile.id} />
            </WBox>
            <WBox title="Recent activity" meta={`${pct}% of tasks approved`}>
              {feed.length === 0 ? (
                <p className="w-muted">Activity from your tasks, applications and messages will show up here.</p>
              ) : (
                <div className="w-feed">
                  {feed.map((f) => (
                    <div key={f.id} className="w-frow">
                      <span className="w-av" style={{ background: 'var(--sky)', color: 'var(--iris)' }}>{f.icon}</span>
                      <span className="w-frow-t">{f.text}</span>
                      <small>{relativeDate(f.at)}</small>
                    </div>
                  ))}
                </div>
              )}
            </WBox>
            <WBox title="Invitations" meta={pendingInvites ? `${pendingInvites} new` : 'None waiting'}>
              <div className="w-inner w-inv">
                <span className="w-logo" style={{ background: pendingInvites ? '#12996a' : '#c3c9d2' }}><Users size={16} /></span>
                <div className="min-w-0"><b>{pendingInvites ? `${pendingInvites} team${pendingInvites !== 1 ? 's' : ''} invited you` : 'No invitations right now'}</b><small>Project owners can invite you to join their team</small></div>
                <Link to="/my-invitations" className="w-btn-d">{pendingInvites ? 'Review' : 'Open'}</Link>
              </div>
            </WBox>
          </div>
        </div>
      )}

      {/* MY PROJECTS */}
      {tab === 'pj' && (
        <div className="dpane mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="pf-h4">My projects</h2>
            <Link to="/publish" className="sd-link"><Plus size={12} /> Publish new</Link>
          </div>
          {!loading && joined.length > 0 && (
            <div className="mb-8">
              <h3 className="pf-h4 mb-3 flex items-center gap-2"><Users size={15} /> Projects I joined</h3>
              <div className="pc-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {joined.map((p) => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="sd-proj-foot">
                      <span className="ref-tag">{statusLabel[p.status]}</span>
                      <button type="button" className="sd-link" onClick={() => goTasks('all')}>My tasks <ArrowRight size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="pf-h4 mt-8 mb-3">Projects I own</h3>
            </div>
          )}
          {loading ? (
            <div className="surface pf-card p-8"><div className="flex justify-center"><LoopLoader size={24} /></div></div>
          ) : projects.length === 0 ? (
            <div className="surface pf-card p-8 text-center">
              <GitBranch size={24} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">You haven't published a project yet.</p>
              <Link to="/publish" className="mt-4 inline-block"><Button variant="ghost" className="btn-sm"><Plus size={14} /> Publish your first project</Button></Link>
            </div>
          ) : (
            <ManagedProjectGrid
              projects={projects}
              onProjectsChange={setProjects}
              renderFooter={(p) =>
                appCounts[p.id] > 0 ? (
                  <div className="sd-proj-foot">
                    <button type="button" className="sd-link amber" onClick={() => setTab('rq')}>
                      <Inbox size={11} /> {appCounts[p.id]} request{appCounts[p.id] !== 1 ? 's' : ''}
                    </button>
                  </div>
                ) : null
              }
            />
          )}
        </div>
      )}

      {/* TASKS */}
      {tab === 'tk' && (
        <div className="dpane mt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {TASK_VIEWS.map((v) => (
              <button key={v.key} type="button" className={cn('pill', taskView === v.key && 'on')} onClick={() => setTaskView(v.key)}>
                {v.label}
                <span className="sd-pill-n">{tasks.filter(v.test).length}</span>
              </button>
            ))}
          </div>
          <MyTasksPanel profileId={profile.id} filter={view.test} onTasks={setTasks} />
        </div>
      )}

      {/* REQUESTS */}
      {tab === 'rq' && (
        <div className="dpane mt-6 grid gap-6 lg:grid-cols-2">
          <section className="surface pf-card p-5">
            <h2 className="pf-h4 mb-3">Join requests on your projects</h2>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">Publish a project to start receiving join requests.</p>
            ) : (
              <ApplicantsInbox me={profile} projects={projects} applications={incomingApps} onDecided={handleAppDecided} />
            )}
          </section>
          <section className="surface pf-card p-5">
            <h2 className="pf-h4 mb-3">My applications</h2>
            {myApps.length === 0 ? (
              <div className="sd-empty"><Users size={22} /><p>You haven't applied to a project yet.</p><Link to="/explore" className="btn btn-ghost btn-sm">Find a project</Link></div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {APP_FILTERS.map((f) => (
                    <button key={f.key} type="button" className={cn('pill', appFilter === f.key && 'on')} onClick={() => setAppFilter(f.key)}>
                      {f.label}
                      <span className="sd-pill-n">{f.key === 'all' ? myApps.length : myApps.filter((a) => a.status === f.key).length}</span>
                    </button>
                  ))}
                </div>
                <ul className="sd-list max-h-[420px] overflow-y-auto pr-1">
                  {(appFilter === 'all' ? myApps : myApps.filter((a) => a.status === appFilter)).map((a) => (
                    <li key={a.id}>
                      <Link to={a.project ? `/projects/${a.project.slug}` : '/explore'}>
                        <span className="sd-list-t"><b>{a.project?.title ?? 'Project'}</b><small>{a.role_title ?? 'General application'} · {relativeDate(a.created_at)}</small></span>
                        <span className={cn('ref-tag', a.status === 'accepted' && 'sd-ok', a.status === 'declined' && 'sd-no')}>{a.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
