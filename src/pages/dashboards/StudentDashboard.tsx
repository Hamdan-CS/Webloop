import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GitBranch, Inbox, Plus, Sparkles, Star, ArrowRight, Briefcase, FolderGit2,
  ClipboardList, CheckCircle2, Clock, MessageSquare, FileText, Pencil, UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingPanel } from '@/components/FloatingPanel';
import {
  fetchProfileProjects, fetchProfilePortfolio, fetchProfileStats, fetchProjectApplicationCount,
  fetchAssignedTasks, fetchMyApplications, fetchInboxMessages,
} from '@/services/api';
import type { Application, Message, PortfolioItem, Project, Task } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/shared/ui/Button';
import { statusLabel, relativeDate } from '@/utils/labels';
import { MyTasksPanel } from '@/components/projects/MyTasksPanel';
import { cn } from '@/utils/cn';

type Tab = 'ov' | 'pj' | 'tk' | 'rq';
type TaskView = 'all' | 'todo' | 'submitted' | 'approved' | 'changes';

const TODO = ['open', 'in_progress'];
const TASK_VIEWS: { key: TaskView; label: string; test: (t: Task) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'todo', label: 'To do', test: (t) => TODO.includes(t.status) },
  { key: 'changes', label: 'Needs changes', test: (t) => t.status === 'changes_requested' },
  { key: 'submitted', label: 'In review', test: (t) => t.status === 'submitted' },
  { key: 'approved', label: 'Approved', test: (t) => t.status === 'approved' },
];

interface FeedItem { id: string; icon: React.ReactNode; text: React.ReactNode; at: string }

export function StudentDashboard() {
  const { profile, unreadMessages } = useAuth();
  const { openPanel } = useFloatingPanel();
  const [tab, setTab] = useState<Tab>('ov');
  const [taskView, setTaskView] = useState<TaskView>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, pfs, st, tks, apps, msgs] = await Promise.all([
        fetchProfileProjects(profile.id),
        fetchProfilePortfolio(profile.id),
        fetchProfileStats(profile.id),
        fetchAssignedTasks(profile.id).catch(() => [] as Task[]),
        fetchMyApplications(profile.id).catch(() => [] as Application[]),
        fetchInboxMessages(profile.id).catch(() => [] as Message[]),
      ]);
      setProjects(prs);
      setPortfolio(pfs);
      setStats({ avg: st.avg_rating, count: st.review_count });
      setTasks(tks);
      setMyApps(apps);
      setMessages(msgs);
      const counts: Record<string, number> = {};
      await Promise.all(prs.map(async (p) => { counts[p.id] = await fetchProjectApplicationCount(p.id); }));
      setAppCounts(counts);
      setLoading(false);
    })();
  }, [profile]);

  const approved = tasks.filter((t) => t.status === 'approved').length;
  const inReview = tasks.filter((t) => t.status === 'submitted').length;
  const todo = tasks.filter((t) => TODO.includes(t.status)).length;
  const changes = tasks.filter((t) => t.status === 'changes_requested').length;
  const pct = tasks.length ? Math.round((approved / tasks.length) * 100) : 0;
  const requests = Object.values(appCounts).reduce((a, b) => a + b, 0);
  const activeProjects = projects.filter((p) => p.status === 'recruiting' || p.status === 'in_progress').length;

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

  return (
    <div className="container-page py-8 pf sd">
      {/* Header + tabs */}
      <div className="surface-raised pf-card pf-head p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="pf-name">Welcome back, {profile.display_name.split(' ')[0]}</h1>
              <span className="ref-tag pf-type">Student</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              @{profile.handle} · {projects.length} project{projects.length !== 1 ? 's' : ''} · {portfolio.length} portfolio item{portfolio.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/publish"><Button className="btn-sm"><Plus size={15} /> New Project</Button></Link>
            <Link to="/explore"><Button variant="ghost" className="btn-sm"><Sparkles size={15} /> Explore</Button></Link>
          </div>
        </div>
        <div className="d-tabs pf-tabs sd-tabs mt-5" role="tablist">
          {([
            ['ov', 'Overview', null],
            ['pj', 'My Projects', projects.length],
            ['tk', 'Tasks', todo + changes],
            ['rq', 'Requests', requests + pendingApps],
          ] as [Tab, string, number | null][]).map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={cn('pf-tab', tab === k && 'on')} onClick={() => setTab(k)}>
              {label}
              {n ? <span className={cn('pf-count', k === 'rq' && 'amber')}>{n}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {tab === 'ov' && (
        <div className="dpane mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
            <section className="surface pf-card p-5">
              <h2 className="pf-h4 mb-4">Your progress <small>approved tasks</small></h2>
              <div className="donut-wrap">
                <button type="button" className="donut" aria-label="Your progress. Open tasks" onClick={() => goTasks('all')}>
                  <svg viewBox="0 0 120 120">
                    <defs><linearGradient id="sdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--blue)" /></linearGradient></defs>
                    <circle className="bg" cx="60" cy="60" r="50" />
                    <circle className="fg" cx="60" cy="60" r="50" style={{ stroke: 'url(#sdg)', strokeDashoffset: 314 * (1 - pct / 100) }} />
                  </svg>
                  <b>{pct}<span>%</span></b>
                </button>
                <div className="kpis sd-kpis">
                  <button type="button" onClick={() => goTasks('all')}><b>{tasks.length}</b>Assigned</button>
                  <button type="button" onClick={() => goTasks('approved')}><b className="c1">{approved}</b>Approved</button>
                  <button type="button" onClick={() => goTasks('todo')}><b className="c2">{todo + changes}</b>To do</button>
                  <button type="button" onClick={() => goTasks('submitted')}><b>{inReview}</b>In review</button>
                </div>
              </div>
              <div className="sd-mini mt-5">
                <button type="button" onClick={() => setTab('pj')}><FolderGit2 size={15} /><b>{activeProjects}</b> active project{activeProjects !== 1 ? 's' : ''}</button>
                <button type="button" onClick={() => setTab('rq')}><Inbox size={15} /><b>{requests}</b> join request{requests !== 1 ? 's' : ''}</button>
                <span><Star size={15} />{stats.count > 0 ? <><b>{stats.avg.toFixed(1)}</b> avg rating</> : 'No ratings yet'}</span>
              </div>
            </section>

            <section className="surface pf-card p-5">
              <h2 className="pf-h4 mb-3">Next up <small>closest deadline first</small></h2>
              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : nextUp.length === 0 ? (
                <div className="sd-empty">
                  <ClipboardList size={22} />
                  <p>Nothing waiting on you. Join a project to get tasks from its owner.</p>
                  <Link to="/explore" className="btn btn-ghost btn-sm">Explore projects</Link>
                </div>
              ) : (
                <ul className="sd-next">
                  {nextUp.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => goTasks('all')}>
                        <span className={cn('sd-dot', t.status === 'changes_requested' && 'warn')} />
                        <span className="sd-next-t"><b>{t.title}</b><small>{t.project?.title ?? 'Project'}{t.due_date ? ` · due ${t.due_date}` : ''}</small></span>
                        {t.status === 'changes_requested' ? <span className="ref-tag">Needs changes</span> : <ArrowRight size={14} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="sd-quick mt-4">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openPanel('messages')}><Inbox size={14} /> Messages{unreadMessages > 0 && <span className="pf-count amber">{unreadMessages}</span>}</button>
                <Link to="/my-applications" className="btn btn-ghost btn-sm"><Briefcase size={14} /> My applications</Link>
                <Link to={`/creators/${profile.handle}`} className="btn btn-ghost btn-sm"><UserCircle2 size={14} /> View profile</Link>
                <Link to="/settings" className="btn btn-ghost btn-sm"><Pencil size={14} /> Edit profile</Link>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <section className="surface pf-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="pf-h4">My projects</h2>
                <button type="button" className="sd-link" onClick={() => setTab('pj')}>View all <ArrowRight size={12} /></button>
              </div>
              {loading ? <p className="text-sm text-slate-500">Loading…</p> : projects.length === 0 ? (
                <div className="sd-empty">
                  <GitBranch size={22} />
                  <p>You haven't published a project yet.</p>
                  <Link to="/publish" className="btn btn-ghost btn-sm"><Plus size={14} /> Publish your first project</Link>
                </div>
              ) : (
                <ul className="sd-list">
                  {projects.slice(0, 4).map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.slug}`}>
                        <span className="sd-list-t"><b>{p.title}</b><small>{statusLabel[p.status]}</small></span>
                        {appCounts[p.id] > 0 && <span className="pf-count amber">{appCounts[p.id]} request{appCounts[p.id] !== 1 ? 's' : ''}</span>}
                        <ArrowRight size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface pf-card p-5">
              <h2 className="pf-h4 mb-3">Recent activity</h2>
              {feed.length === 0 ? (
                <p className="text-sm text-slate-500">Activity from your tasks, applications and messages will show up here.</p>
              ) : (
                <div className="dash-feed" style={{ maxHeight: 'none' }}>
                  {feed.map((f) => (
                    <div key={f.id} className="fi">
                      <span className="sd-fi-ic">{f.icon}</span>
                      <div>{f.text}<small>{relativeDate(f.at)}</small></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">{stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}</div>
            </section>
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
          {loading ? (
            <div className="surface pf-card p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="surface pf-card p-8 text-center">
              <GitBranch size={24} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">You haven't published a project yet.</p>
              <Link to="/publish" className="mt-4 inline-block"><Button variant="ghost" className="btn-sm"><Plus size={14} /> Publish your first project</Button></Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div key={p.id}>
                  <ProjectCard project={p} />
                  <div className="sd-proj-foot">
                    <span className="ref-tag">{statusLabel[p.status]}</span>
                    {appCounts[p.id] > 0 && (
                      <Link to={`/creators/${profile.handle}?tab=applications`} className="sd-link amber"><Inbox size={11} /> {appCounts[p.id]} request{appCounts[p.id] !== 1 ? 's' : ''}</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="pf-h4">Join requests on your projects</h2>
              <Link to={`/creators/${profile.handle}?tab=applications`} className="sd-link">Manage <ArrowRight size={12} /></Link>
            </div>
            {requests === 0 ? <p className="text-sm text-slate-500">No pending requests right now.</p> : (
              <ul className="sd-list">
                {projects.filter((p) => appCounts[p.id] > 0).map((p) => (
                  <li key={p.id}>
                    <Link to={`/creators/${profile.handle}?tab=applications`}>
                      <span className="sd-list-t"><b>{p.title}</b><small>{appCounts[p.id]} waiting for your decision</small></span>
                      <span className="pf-count amber">{appCounts[p.id]}</span><ArrowRight size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface pf-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="pf-h4">My applications</h2>
              <Link to="/my-applications" className="sd-link">View all <ArrowRight size={12} /></Link>
            </div>
            {myApps.length === 0 ? (
              <div className="sd-empty"><Users size={22} /><p>You haven't applied to a project yet.</p><Link to="/explore" className="btn btn-ghost btn-sm">Find a project</Link></div>
            ) : (
              <ul className="sd-list">
                {myApps.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <Link to={a.project ? `/projects/${a.project.slug}` : '/my-applications'}>
                      <span className="sd-list-t"><b>{a.project?.title ?? 'Project'}</b><small>{a.role_title ?? 'General application'} · {relativeDate(a.created_at)}</small></span>
                      <span className={cn('ref-tag', a.status === 'accepted' && 'sd-ok', a.status === 'declined' && 'sd-no')}>{a.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
