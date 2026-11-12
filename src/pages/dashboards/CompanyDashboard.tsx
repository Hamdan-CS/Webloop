import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import {
  Building2,
  Briefcase,
  ClipboardCheck,
  Inbox,
  Mail,
  Plus,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Users,
  ListChecks,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingPanel } from '@/components/FloatingPanel';
import {
  fetchProfileProjects,
  fetchJoinedProjects,
  fetchProfileStats,
  fetchProjectApplicationsDetailed,
  fetchProjectTasks,
} from '@/services/api';
import type { Application, Project, Task } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ManagedProjectGrid } from '@/components/projects/ManagedProjectGrid';
import { MyTasksPanel } from '@/components/projects/MyTasksPanel';
import { TaskManagementPanel } from '@/components/projects/TaskManagementPanel';
import { ApplicantsInbox } from '@/components/companies/ApplicantsInbox';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';

type Tab = 'overview' | 'projects' | 'applicants' | 'tasks';
const TABS: Tab[] = ['overview', 'projects', 'applicants', 'tasks'];

type ProjectFilter = 'all' | 'draft' | 'live' | 'finished';
const PROJECT_FILTERS: { key: ProjectFilter; label: string; statuses?: Project['status'][] }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts', statuses: ['draft'] },
  { key: 'live', label: 'Live', statuses: ['published', 'recruiting', 'in_progress'] },
  { key: 'finished', label: 'Finished', statuses: ['completed', 'archived'] },
];
const ACTIVE_STATUSES = PROJECT_FILTERS.find((f) => f.key === 'live')!.statuses!;
const ATTENTION_LIMIT = 4;

export function CompanyDashboard() {
  const { profile, unreadMessages, refreshCounts } = useAuth();
  const { openPanel } = useFloatingPanel();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'overview';

  const [projects, setProjects] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [applicantsProject, setApplicantsProject] = useState<string | undefined>();
  const [chosenTaskProject, setChosenTaskProject] = useState<string | null>(null);

  const reduceMotion = useReducedMotion();
  const paneControls = useAnimationControls();
  const previousTab = useRef(tab);

  // Slide in from the side you're moving towards. Animates a wrapper instead of re-keying
  // it so the Tasks panel and its data stay mounted between tabs.
  useEffect(() => {
    if (previousTab.current === tab) return;
    const direction = TABS.indexOf(tab) > TABS.indexOf(previousTab.current) ? 1 : -1;
    previousTab.current = tab;
    if (reduceMotion) return;
    void paneControls.start({ opacity: [0, 1], x: [direction * 18, 0], transition: { duration: 0.26, ease: 'easeOut' } });
  }, [tab, reduceMotion, paneControls]);

  const setTab = (t: Tab) => setSearchParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  const loadTasks = useCallback(async (owned: Project[]) => {
    const perProject = await Promise.all(owned.map((p) => fetchProjectTasks(p.id).catch(() => [] as Task[])));
    setTasks(perProject.flat());
  }, []);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [owned, st, jn] = await Promise.all([
          fetchProfileProjects(profile.id, { includeDrafts: true }),
          fetchProfileStats(profile.id),
          fetchJoinedProjects(profile.id).catch(() => [] as Project[]),
        ]);
        setProjects(owned);
        setJoined(jn);
        setStats({ avg: st.avg_rating, count: st.review_count });
        const perProject = await Promise.all(owned.map(async (p) => {
          const apps = await fetchProjectApplicationsDetailed(p.id).catch(() => [] as Application[]);
          return apps.map((a) => ({ ...a, project: { title: p.title, slug: p.slug, status: p.status } }));
        }));
        setApplications(perProject.flat());
        await loadTasks(owned);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile, reloadKey, loadTasks]);

  if (!profile) return null;

  const pending = applications.filter((a) => a.status === 'pending');
  const toReview = tasks.filter((t) => t.status === 'submitted');
  const activeProjects = projects.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const pendingFor = (projectId: string) => pending.filter((a) => a.project_id === projectId).length;
  const reviewFor = (projectId: string) => toReview.filter((t) => t.project_id === projectId).length;

  const taskProjectId = chosenTaskProject ?? toReview[0]?.project_id ?? projects[0]?.id ?? '';
  const visibleProjects = projects.filter((p) => {
    const statuses = PROJECT_FILTERS.find((f) => f.key === projectFilter)?.statuses;
    return !statuses || statuses.includes(p.status);
  });
  const projectTitle = (id: string) => projects.find((p) => p.id === id)?.title ?? 'Project';

  const openApplicants = (projectId?: string) => { setApplicantsProject(projectId); setTab('applicants'); };
  const openReview = (projectId: string) => { setChosenTaskProject(projectId); setTab('tasks'); };
  const handleDecided = (id: string, status: 'accepted' | 'declined') => {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    void refreshCounts();
  };

  const nothingWaiting = pending.length === 0 && toReview.length === 0 && unreadMessages === 0;

  return (
    <div className="container-page py-8 pf sdash">
      <div className="surface-raised pf-card pf-head p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="pf-name">{profile.display_name}</h1>
              <span className="ref-tag pf-type">Company</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              @{profile.handle} · {activeProjects} active project{activeProjects === 1 ? '' : 's'} · {pending.length} applicant{pending.length === 1 ? '' : 's'} waiting
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/publish"><Button className="btn-sm"><Plus size={15} /> Post a Project</Button></Link>
            <Link to={`/creators/${profile.handle}`}><Button variant="ghost" className="btn-sm"><Building2 size={15} /> View Profile</Button></Link>
          </div>
        </div>
        <div className="pf-tabs cw-tabs mt-5" role="tablist">
          {([
            ['overview', 'Overview', null],
            ['projects', 'Projects', projects.length],
            ['applicants', 'Applicants', pending.length],
            ['tasks', 'Tasks', toReview.length],
          ] as [Tab, string, number | null][]).map(([key, label, n]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={cn('pf-tab', tab === key && 'on')} onClick={() => setTab(key)}>
              {tab === key && (
                <motion.span
                  layoutId="company-tab-pill"
                  className="cw-tab-pill"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <span className="cw-tab-label">
                {label}
                {n ? <span className={cn('pf-count', (key === 'applicants' || key === 'tasks') && 'amber')}>{n}</span> : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={loading ? undefined : 'reveal'}>
{loading ? (
        <div className="flex h-[40vh] items-center justify-center"><LoopLoader size={28} /></div>
      ) : loadError ? (
        <div className="surface pf-card app-empty mt-6">
          <p>Your dashboard couldn't be loaded.</p>
          <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>
        </div>
      ) : (
        <motion.div className="mt-6" animate={paneControls}>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="pf-kpis">
                <KpiButton value={activeProjects} label="Active projects" onClick={() => setTab('projects')} />
                <KpiButton value={pending.length} label="Pending applicants" tone="c2" onClick={() => openApplicants()} />
                <KpiButton value={toReview.length} label="Work to review" tone="c2" onClick={() => setTab('tasks')} />
                <div className="pf-kpi"><b>{stats.count > 0 ? stats.avg.toFixed(1) : '—'}</b><span>Avg rating</span></div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <section className="surface pf-card p-5">
                  <h2 className="pf-h4 mb-3">Needs your attention</h2>
                  {projects.length === 0 ? (
                    <div className="sd-empty">
                      <Briefcase size={22} />
                      <p>Post your first project to start receiving applicants.</p>
                      <Link to="/publish" className="btn btn-primary btn-sm"><Plus size={14} /> Post a Project</Link>
                    </div>
                  ) : nothingWaiting ? (
                    <div className="sd-empty">
                      <CheckCircle2 size={22} />
                      <p>You're all caught up.</p>
                    </div>
                  ) : (
                    <ul className="sd-next">
                      {pending.slice(0, ATTENTION_LIMIT).map((a) => (
                        <li key={a.id}>
                          <button type="button" onClick={() => openApplicants(a.project_id)}>
                            <Avatar src={a.applicant?.avatar_url} name={a.applicant?.display_name ?? ''} size="sm" />
                            <span className="sd-next-t">
                              <b>{a.applicant?.display_name ?? 'Applicant'} applied</b>
                              <small>{a.project?.title} · {relativeDate(a.created_at)}</small>
                            </span>
                            <ArrowRight size={14} />
                          </button>
                        </li>
                      ))}
                      {toReview.slice(0, ATTENTION_LIMIT).map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => openReview(t.project_id)}>
                            <span className="pf-ic"><ClipboardCheck size={15} /></span>
                            <span className="sd-next-t">
                              <b>Review "{t.title}"</b>
                              <small>{projectTitle(t.project_id)}{t.assignee ? ` · ${t.assignee.display_name}` : ''}</small>
                            </span>
                            <ArrowRight size={14} />
                          </button>
                        </li>
                      ))}
                      {unreadMessages > 0 && (
                        <li>
                          <button type="button" onClick={() => openPanel('messages')}>
                            <span className="pf-ic"><Mail size={15} /></span>
                            <span className="sd-next-t">
                              <b>{unreadMessages} unread message{unreadMessages === 1 ? '' : 's'}</b>
                              <small>Open your inbox</small>
                            </span>
                            <ArrowRight size={14} />
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </section>

                <div className="space-y-5">
                  <section className="surface pf-card p-5">
                    <h2 className="pf-h4 mb-3">Find talent</h2>
                    <nav className="space-y-1.5">
                      <QuickLink to="/gallery" icon={<Users size={15} />} label="Browse student work" />
                      <QuickLink to="/explore" icon={<TrendingUp size={15} />} label="Browse projects" />
                      <QuickLink to="/settings/profile" icon={<Building2 size={15} />} label="Edit company profile" />
                    </nav>
                  </section>
                  <section className="surface pf-card p-5">
                    <h2 className="pf-h4 mb-3">Reputation</h2>
                    {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}
                    <p className="mt-3 text-xs text-slate-500">Ratings come from contributors who worked on your projects.</p>
                  </section>
                </div>
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <div>
              {projects.length === 0 ? (
                <div className="surface pf-card app-empty">
                  <span className="pf-ic"><Briefcase size={22} /></span>
                  <p>Your company hasn't posted a project yet.</p>
                  <Link to="/publish" className="btn btn-primary"><Plus size={14} /> Post your first project</Link>
                </div>
              ) : (
                <>
                  <div className="ft-row mb-5">
                    {PROJECT_FILTERS.map((f) => (
                      <button key={f.key} type="button" className={`pill${projectFilter === f.key ? ' on' : ''}`} onClick={() => setProjectFilter(f.key)}>{f.label}</button>
                    ))}
                  </div>
                  {visibleProjects.length === 0 ? (
                    <div className="surface pf-card app-empty"><p>No projects in this group.</p></div>
                  ) : (
                    <ManagedProjectGrid
                      projects={visibleProjects}
                      onProjectsChange={setProjects}
                      renderFooter={(p) => {
                        const apps = pendingFor(p.id);
                        const reviews = reviewFor(p.id);
                        if (!apps && !reviews) return null;
                        return (
                          <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs">
                            {apps > 0 && <button type="button" className="link-accent inline-flex items-center gap-1" onClick={() => openApplicants(p.id)}><Inbox size={12} /> {apps} applicant{apps === 1 ? '' : 's'}</button>}
                            {reviews > 0 && <button type="button" className="link-accent inline-flex items-center gap-1" onClick={() => openReview(p.id)}><ClipboardCheck size={12} /> {reviews} to review</button>}
                          </div>
                        );
                      }}
                    />
                  )}
                </>
              )}
              {joined.length > 0 && (
                <section className="mt-10">
                  <h2 className="pf-h4 mb-4">Projects you joined</h2>
                  <div className="pc-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {joined.map((p) => <div key={p.id}><ProjectCard project={p} /></div>)}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'applicants' && (
            <ApplicantsInbox me={profile} projects={projects} applications={applications} initialProjectId={applicantsProject} onDecided={handleDecided} />
          )}

          {/* Stays mounted (hidden) so the count of tasks assigned to this company is known. */}
          <div hidden={tab !== 'tasks'} className="space-y-8">
            {projects.length === 0 ? (
              <div className="surface pf-card app-empty">
                <span className="pf-ic"><ListChecks size={22} /></span>
                <p>Post a project to create and assign tasks.</p>
              </div>
            ) : (
              <section>
                {projects.length > 1 && (
                  <Select
                    className="mb-5 w-full sm:w-80"
                    label="Project"
                    value={taskProjectId}
                    onChange={setChosenTaskProject}
                    options={projects.map((p) => {
                      const n = reviewFor(p.id);
                      return { value: p.id, label: n ? `${p.title} (${n} to review)` : p.title };
                    })}
                  />
                )}
                {/* Mounted per visit so someone accepted a moment ago is in the assignee list. */}
                {tab === 'tasks' && taskProjectId && (
                  <TaskManagementPanel key={taskProjectId} projectId={taskProjectId} profileId={profile.id} onChange={() => { setChosenTaskProject(taskProjectId); void loadTasks(projects); }} />
                )}
              </section>
            )}
            <section hidden={assignedCount === 0}>
              <h2 className="pf-h4 mb-4">Tasks assigned to you</h2>
              <MyTasksPanel profileId={profile.id} onTasks={(t) => setAssignedCount(t.length)} />
            </section>
          </div>
        </motion.div>
      )}
</div>
    </div>
  );
}

function KpiButton({ value, label, tone, onClick }: { value: number; label: string; tone?: 'c2'; onClick: () => void }) {
  return (
    <button type="button" className="pf-kpi text-left" onClick={onClick} style={{ cursor: 'pointer', fontFamily: 'inherit' }}>
      <b className={value > 0 ? tone : undefined}>{value}</b>
      <span>{label}</span>
    </button>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <ArrowRight size={13} className="text-slate-600" />
    </Link>
  );
}
