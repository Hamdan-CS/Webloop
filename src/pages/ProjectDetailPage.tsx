import { useEffect, useState } from 'react';
import { projectDot, useWorkspaceMaybe } from '@/components/app/workspaceContext';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  Play,
  GitBranch,
  Target,
  Sparkles,
  Loader2,
  Flag,
  X,
  AlertCircle,
  Send,
  Star,
  Eye,
  GitCommit,
} from 'lucide-react';
import { fetchProjectBySlug, fetchProfileStats, createApplication, checkExistingApplication, fetchProjectMembers, updateMemberRole, removeProjectMember } from '@/services/api';
import { ProjectTasks } from '@/components/projects/tasks/ProjectTasks';
import { useProjectTasks } from '@/components/projects/tasks/useProjectTasks';
import '@/components/projects/tasks/project-page.css';
import { toast } from 'sonner';
import type { Project, ProjectMember } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { ConversationModal } from '@/components/projects/ConversationModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { Pencil, Save } from 'lucide-react';
import { getDashboardPath } from '@/utils/roles';
import {
  statusLabel,
  statusTone,
  projectTypeLabel,
  compensationLabel,
  difficultyLabel,
  creatorTypeLabel,
} from '@/utils/labels';

type Tab = 'ov' | 'tk' | 'tm' | 'st';

export function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const { prompt } = useAuthPrompt();
  const { user, profile } = useAuth();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyRole, setApplyRole] = useState<string>('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('ov');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const ws = useWorkspaceMaybe();
  const [starred, setStarred] = useState(false);
  // the project's tasks and every task action (Tasks tab, header progress)
  const taskApi = useProjectTasks(project?.id, profile?.id);
  const tasks = taskApi.tasks;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchProjectBySlug(slug).then((p) => {
      setProject(p);
      if (p) {
        fetchProfileStats(p.owner_id).then((s) => setStats({ avg: s.avg_rating, count: s.review_count }));
        if (user && profile) {
          checkExistingApplication(p.id, profile.id).then(setAlreadyApplied);
        }
        // Load team members for the Team tab
        fetchProjectMembers(p.id).then(setTeamMembers).catch(() => {});
        try { setStarred(localStorage.getItem(`wl-star-${p.id}`) === '1'); } catch { /* storage unavailable */ }
      }
      setLoading(false);
    });
  }, [slug, user, profile]);

  const toggleStar = () => {
    if (!project) return;
    const next = !starred;
    setStarred(next);
    try { localStorage.setItem(`wl-star-${project.id}`, next ? '1' : '0'); } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex h-[60vh] items-center justify-center"
      >
        <LoopLoader size={28} />
      </motion.div>
    );
  }
  if (!project) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Project not found</h1>
        <Link to="/explore" className="mt-4 inline-block link-accent">Back to Explore</Link>
      </div>
    );
  }

  const owner = project.owner;
  const openRoles = project.roles?.filter((r) => r.is_open) ?? [];
  const isCompleted = project.status === 'completed';
  const isOwner = !!(user && profile && project.owner_id === profile.id);
  const isMember = !isOwner && !!profile && teamMembers.some((m) => m.profile_id === profile.id);
  const myRole = isMember ? teamMembers.find((m) => m.profile_id === profile?.id)?.role : null;
  const taskDone = tasks.filter((t) => t.status === 'approved');
  const progressPct = project.progress && project.progress > 0
    ? project.progress
    : tasks.length ? Math.round((taskDone.length / tasks.length) * 100) : 0;
  const starCount = (project.stars_count ?? 0) + (starred ? 1 : 0);
  const contributors = Math.max(teamMembers.length, project.team_size);

  const handleJoin = () => {
    if (isOwner || isMember) return;
    if (!user || !profile) {
      prompt({
        title: 'Join this project',
        reason:
          'Applying to join requires a free WebLoop account so the project owner can review your profile and contributions. Guests can browse everything — an account is only needed to apply, contribute, or contact teams.',
        cta: 'Create a free account to apply',
      });
    } else if (alreadyApplied) {
      return;
    } else {
      setApplyError(null);
      setApplySuccess(false);
      setApplyRole(openRoles[0]?.title ?? '');
      setApplyMessage('');
      setShowApplyModal(true);
    }
  };

  const submitApplication = async () => {
    if (!project || !profile) return;
    setApplyLoading(true);
    setApplyError(null);
    try {
      await createApplication(project.id, profile.id, applyRole || null, applyMessage.trim() || null);
      setApplySuccess(true);
      setAlreadyApplied(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleSaveRole = async (memberRowId: string, memberProfileId: string) => {
    if (!project) return;
    setRoleSaving(true);
    try {
      await updateMemberRole(project.id, memberProfileId, roleDraft.trim() || null);
      setTeamMembers(teamMembers.map((m) => (m.id === memberRowId ? { ...m, role: roleDraft.trim() || null } : m)));
      setEditingRoleFor(null);
      setRoleDraft('');
    } catch {
      // ignore
    }
    setRoleSaving(false);
  };

  const openSettings = () => {
    setTab('st');
    document.getElementById('w-ws-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const contactTeam = () => {
    if (!user || !profile) {
      prompt({
        title: 'Contact the team',
        reason: 'Messaging requires a free WebLoop account so communication stays on-platform.',
        cta: 'Create a free account to message',
      });
    } else {
      setShowMessageModal(true);
    }
  };

  const handleRemoveMember = async (m: ProjectMember) => {
    if (!project) return;
    const name = m.profile?.display_name ?? 'this member';
    if (!window.confirm(`Remove ${name} from "${project.title}"? Their past contributions stay on record.`)) return;
    setRemovingId(m.id);
    try {
      await removeProjectMember(project.id, m.profile_id);
      setTeamMembers((list) => list.filter((x) => x.id !== m.id));
      toast.success(`Removed ${name} from the team`);
    } catch {
      toast.error(`Couldn't remove ${name}. Please try again.`);
    }
    setRemovingId(null);
  };

  const dashboardPath = profile ? getDashboardPath(profile.creator_type) : '/';
  const created = new Date(project.published_at ?? project.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

  /* One action row under the header: the only place for these actions. */
  const actions = (
    <div className="w-pd-actions">
      {isOwner ? (
        <button type="button" className="w-btn-d" onClick={openSettings}><Pencil size={15} /> Edit project</button>
      ) : isMember ? (
        <>
          <span className="w-pd-member"><CheckCircle2 size={15} /> You’re on this team{myRole ? ` · ${myRole}` : ''}</span>
          <Link to={dashboardPath} className="w-btn-l"><ArrowRight size={15} /> My tasks</Link>
        </>
      ) : isCompleted ? (
        <span className="w-pd-note">Completed showcase</span>
      ) : alreadyApplied ? (
        <span className="w-pd-note amber">Application submitted</span>
      ) : (
        <button type="button" className="w-btn-d" onClick={handleJoin}>
          <Sparkles size={15} /> {openRoles.length > 0 ? `Apply to join (${openRoles.length} role${openRoles.length !== 1 ? 's' : ''})` : 'Apply to join'}
        </button>
      )}
      {project.demo_url && <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="w-btn-l"><Play size={15} /> Demo</a>}
      {project.repo_url && <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="w-btn-l"><GitBranch size={15} /> Repository</a>}
      {!isOwner && <button type="button" className="w-btn-l" onClick={contactTeam}><Send size={15} /> Contact team</button>}
      <button type="button" className={`w-btn-l w-star${starred ? ' on' : ''}`} onClick={toggleStar} aria-pressed={starred}>
        <Star size={15} fill={starred ? 'currentColor' : 'none'} /> {starred ? 'Starred' : 'Star'}
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="container-page py-8 w-pd"
    >
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={15} /> Back to Explore
      </Link>

      {ws ? (
        /* Inside the workspace: the demo's project header (image, title, meta, the only progress bar) */
        <div className="w-ph">
          {project.cover_image_url
            ? <img src={project.cover_image_url} alt="" />
            : <span className="w-ph-art" style={{ background: `linear-gradient(135deg, ${projectDot(project.id)}, var(--iris))` }} />}
          <div className="min-w-0">
            <h1>{project.title}</h1>
            <div className="meta">
              <span>{statusLabel[project.status]}</span>
              <span>{projectTypeLabel[project.project_type]}</span>
              {project.category && <span>{project.category}</span>}
            </div>
          </div>
          <div className="w-prog">
            <small><span>{taskDone.length} of {tasks.length} tasks verified</span><b>{progressPct}%</b></small>
            <div><i style={{ width: `${progressPct}%` }} /></div>
          </div>
        </div>
      ) : (
      <>
      {/* Hero — reference's pd-hero: copy + stats on the left, a tilted browser preview on the right */}
      <div className="pd-hero">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
            <span className="ref-tag">{projectTypeLabel[project.project_type]}</span>
            {project.category && <span className="ref-tag">{project.category}</span>}
          </div>
          <h2 className="font-display font-bold text-white">{project.title}</h2>
          <p className="tl">{project.category ?? projectTypeLabel[project.project_type]}</p>
          <p className="ds">{project.summary}</p>
          <div className="pd-stats">
            <div><Star size={22} /><span><b>{starCount.toLocaleString('en')}</b>Likes</span></div>
            <div><Users size={22} /><span><b>{contributors}</b>Contributors</span></div>
            <div><Eye size={22} /><span><b>{(project.views_count ?? 0).toLocaleString('en')}</b>Views</span></div>
            <div><GitCommit size={22} /><span><b>{(project.commits_count ?? 0).toLocaleString('en')}</b>Commits</span></div>
          </div>
        </div>
        <div className="pd-prev">
          <div className="browser">
            <div className="bbar"><i /><i /><i /><span>{project.title.toLowerCase().replace(/\s+/g, '')}.app</span></div>
            <div className="big">
              {project.cover_image_url ? <img src={project.cover_image_url} alt={project.title} /> : <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--blue))' }} />}
              <h4>{project.title}</h4>
              <p>{projectTypeLabel[project.project_type]}</p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
      {ws && (
        <div className="w-ph-sub">
          {project.summary && <p>{project.summary}</p>}
          <div className="w-ph-stats">
            <span><Star size={14} /> {starCount.toLocaleString('en')} likes</span>
            <span><Users size={14} /> {contributors} contributors</span>
            <span><Eye size={14} /> {(project.views_count ?? 0).toLocaleString('en')} views</span>
            <span><GitCommit size={14} /> {(project.commits_count ?? 0).toLocaleString('en')} commits</span>
          </div>
        </div>
      )}
      {actions}

      <div className="pd-tabs" role="tablist">
        {([['ov', 'Overview'], ['tk', 'Tasks'], ['tm', 'Team'], ...(isOwner ? [['st', 'Settings']] : [])] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div key={tab} className="reveal mt-6 space-y-6">
        {/* OVERVIEW: what the project is, open positions, and its details (once) */}
        {tab === 'ov' && (
          <>
            <div className="w-pd-ov">
              <div className="space-y-6 min-w-0">
                <Section title="About the project">
                  {project.overview
                    ? <p className="text-sm text-slate-300 leading-relaxed">{project.overview}</p>
                    : <p className="text-sm text-slate-400 leading-relaxed">{project.summary}</p>}
                  {(project.problem || project.target_users) && (
                    <div className="w-pd-pt">
                      {project.problem && <div><small>Problem</small><p>{project.problem}</p></div>}
                      {project.target_users && <div><small>Target users</small><p>{project.target_users}</p></div>}
                    </div>
                  )}
                </Section>

                {openRoles.length > 0 && (
                  <Section title={`Open positions (${openRoles.length})`}>
                    <ul className="space-y-3">
                      {openRoles.map((r) => (
                        <li key={r.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{r.title}</p>
                            <Badge tone="green">Open</Badge>
                          </div>
                          {r.description && <p className="mt-1.5 text-sm text-slate-400">{r.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>

              <Section title="Project details">
                <div className="space-y-3">
                  <MetaRow icon={<Target size={14} />} label="Type" value={projectTypeLabel[project.project_type]} />
                  {owner && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-xs text-slate-500"><Users size={14} /> Owner</span>
                      <Link to={`/creators/${owner.handle}`} className="text-sm font-medium text-right link-accent">{owner.display_name}</Link>
                    </div>
                  )}
                  {project.license && <MetaRow icon={<CheckCircle2 size={14} />} label="License" value={project.license} />}
                  {project.difficulty && <MetaRow icon={<Flag size={14} />} label="Difficulty" value={difficultyLabel[project.difficulty]} />}
                  {project.compensation && <MetaRow icon={<CheckCircle2 size={14} />} label="Compensation" value={compensationLabel[project.compensation]} />}
                  <MetaRow icon={<Users size={14} />} label="Team size" value={project.team_size > 0 ? `${project.team_size} members` : 'Solo / forming'} />
                  {project.duration_weeks && <MetaRow icon={<Calendar size={14} />} label="Duration" value={`${project.duration_weeks} weeks`} />}
                  {project.time_commitment_hours && <MetaRow icon={<Clock size={14} />} label="Commitment" value={project.time_commitment_hours} />}
                  <MetaRow icon={<MapPin size={14} />} label="Location" value={project.is_remote ? 'Remote' : project.location ?? '—'} />
                  <MetaRow icon={<Calendar size={14} />} label="Created" value={created} />
                </div>
                {project.skills && project.skills.length > 0 && (
                  <div className="w-pd-tech">
                    <small>Technologies</small>
                    <div className="flex flex-wrap gap-2">
                      {project.skills.map((s) => (
                        <Link key={s.id} to={`/explore?technology=${encodeURIComponent(s.name)}`} className="chip hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            </div>

            {project.is_demo && (
              <div className="rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90">
                Demo content — sample project for platform preview.
              </div>
            )}
          </>
        )}

        {/* TASKS: the one place for everything task-related */}
        {tab === 'tk' && (
          <ProjectTasks
            api={taskApi}
            members={teamMembers}
            isOwner={isOwner}
            isMember={isMember}
            meId={profile?.id}
            dashboardPath={dashboardPath}
          />
        )}

        {/* TEAM: the owner, then members (role editing and removal for the owner) */}
        {tab === 'tm' && (
          <>
            {owner && (
              <Link to={`/creators/${owner.handle}`} className="surface-raised p-5 flex items-center gap-3 hover:border-accent-400/30 transition-colors group">
                <Avatar src={owner.avatar_url} name={owner.display_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-white">{owner.display_name}</p>
                    {owner.verified && <CheckCircle2 size={14} className="text-accent-400 shrink-0" />}
                    <span className="w-pd-role">Owner</span>
                  </div>
                  <p className="text-xs text-slate-400">{creatorTypeLabel[owner.creator_type]}</p>
                  {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="New creator" />}
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-accent-300 transition-colors" />
              </Link>
            )}

            <Section title={`Team members (${teamMembers.length})`}>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-slate-400">No members yet. {isOwner ? 'Accepted join requests appear here.' : ''}</p>
              ) : (
                <ul className="space-y-2">
                  {teamMembers.map((m) => (
                    <li key={m.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/creators/${m.profile?.handle}`} className="shrink-0">
                          <Avatar src={m.profile?.avatar_url} name={m.profile?.display_name ?? ''} size="md" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link to={`/creators/${m.profile?.handle}`} className="truncate text-sm font-medium text-white hover:text-accent-300 transition-colors">
                            {m.profile?.display_name}
                          </Link>
                          {editingRoleFor === m.id ? (
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                value={roleDraft}
                                onChange={(e) => setRoleDraft(e.target.value)}
                                placeholder="e.g. Frontend Developer"
                                className="w-full rounded-md border border-white/10 bg-ink-900/60 px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveRole(m.id, m.profile_id); }
                                  if (e.key === 'Escape') { setEditingRoleFor(null); setRoleDraft(''); }
                                }}
                              />
                              <button
                                onClick={() => handleSaveRole(m.id, m.profile_id)}
                                disabled={roleSaving}
                                aria-label="Save role"
                                className="rounded-md bg-accent-500/20 p-1 text-accent-300 hover:bg-accent-500/30 transition-colors"
                              >
                                {roleSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                onClick={() => { setEditingRoleFor(null); setRoleDraft(''); }}
                                aria-label="Cancel"
                                className="rounded-md p-1 text-slate-500 hover:text-white transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">{m.role ?? 'Team member'}</span>
                              {isOwner && (
                                <button
                                  onClick={() => { setEditingRoleFor(m.id); setRoleDraft(m.role ?? ''); }}
                                  aria-label={`Edit ${m.profile?.display_name ?? 'member'}'s role`}
                                  className="text-slate-600 hover:text-accent-300 transition-colors"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {m.profile?.verified && <CheckCircle2 size={14} className="text-accent-400 shrink-0" />}
                        {isOwner && (
                          <button
                            type="button"
                            className="w-btn-l w-btn-sm w-danger"
                            disabled={removingId === m.id}
                            onClick={() => handleRemoveMember(m)}
                          >
                            {removingId === m.id ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}

        {/* SETTINGS (owner): project details and configuration only */}
        {tab === 'st' && isOwner && (
          <EditProjectModal
            inline
            project={project}
            onClose={() => setTab('ov')}
            onSaved={(updated) => { setProject(updated); toast.success('Project saved'); }}
          />
        )}
      </div>

      {/* Apply modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
          <div className="surface-raised w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-white">Apply to join</h2>
              <button onClick={() => setShowApplyModal(false)} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            {applySuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-signal-green/15 text-signal-green">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">Application sent!</h3>
                <p className="mt-2 text-sm text-slate-400">The project owner will review your profile and respond. You can track the status on your applications page.</p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button onClick={() => setShowApplyModal(false)}>Done</Button>
                  <Link to="/my-applications"><Button variant="secondary">View My Applications</Button></Link>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Applying to <span className="text-white font-medium">{project.title}</span>. The owner will review your profile and respond.
                </p>

                {openRoles.length > 0 && (
                  <div className="mb-4">
                    <Select
                      label="Role you're applying for"
                      value={applyRole}
                      onChange={setApplyRole}
                      options={[
                        { value: '', label: 'General contribution' },
                        ...openRoles.map((r) => ({ value: r.title, label: r.title })),
                      ]}
                    />
                  </div>
                )}

                <label className="block mb-4">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Message to the owner (optional)</span>
                  <textarea
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    rows={4}
                    placeholder="Introduce yourself, share relevant experience, and explain why you'd like to join."
                    className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors resize-y"
                  />
                </label>

                {applyError && (
                  <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose mb-4">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={submitApplication} disabled={applyLoading} className="flex-1">
                    {applyLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    {applyLoading ? 'Sending...' : 'Submit Application'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowApplyModal(false)} className="px-5">Cancel</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Project message modal */}
      {showMessageModal && project && profile && owner && (
        <ConversationModal
          myProfile={profile}
          otherProfile={owner}
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-g pbox">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        {icon} {label}
      </span>
      <span className="text-sm font-medium text-slate-200 text-right">{value}</span>
    </div>
  );
}


