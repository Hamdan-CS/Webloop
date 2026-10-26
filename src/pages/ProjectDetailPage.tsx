import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { fetchProjectBySlug, fetchProfileStats, createApplication, checkExistingApplication, fetchProjectApplicationsDetailed, fetchProjectMembers, sendProjectMessage, fetchProjectMessages, markMessageRead, updateMemberRole } from '@/lib/api';
import type { Project, Application, ProjectMember, Message } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Rating, NoRating } from '@/components/ui/Rating';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import { useAuth } from '@/components/auth/AuthContext';
import { ProjectMessageModal } from '@/components/projects/ProjectMessageModal';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { ProjectProgressDashboard } from '@/components/projects/ProjectProgressDashboard';
import { Pencil, Save } from 'lucide-react';
import {
  statusLabel,
  statusTone,
  projectTypeLabel,
  compensationLabel,
  compensationTone,
  difficultyLabel,
  creatorTypeLabel,
  relativeDate,
} from '@/lib/labels';

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
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);

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
        // Load team members and pending applications for enhanced view
        fetchProjectMembers(p.id).then(setTeamMembers).catch(() => {});
        fetchProjectApplicationsDetailed(p.id).then((apps) => {
          setPendingApps(apps.filter((a) => a.status === 'pending'));
        }).catch(() => {});
      }
      setLoading(false);
    });
  }, [slug, user, profile]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex h-[60vh] items-center justify-center"
      >
        <Loader2 size={28} className="animate-spin text-accent-400" />
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

  const handleJoin = () => {
    if (isOwner) return;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="container-page py-8"
    >
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={15} /> Back to Explore
      </Link>

      {/* Hero cover */}
      <div className="relative h-[36vh] min-h-[280px] overflow-hidden rounded-xl border border-white/10">
        {project.cover_image_url ? (
          <img src={project.cover_image_url} alt={project.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/30" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge tone={statusTone[project.status]}>{statusLabel[project.status]}</Badge>
            <span className="rounded-md bg-ink-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm border border-white/10">
              {projectTypeLabel[project.project_type]}
            </span>
            {project.category && (
              <span className="rounded-md bg-ink-950/70 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm border border-white/10">
                {project.category}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white max-w-3xl leading-tight">
            {project.title}
          </h1>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div className="space-y-8">
          <p className="text-lg text-slate-300 leading-relaxed">{project.summary}</p>

          <Section title="Overview">
            <p className="text-sm text-slate-300 leading-relaxed">{project.overview}</p>
          </Section>

          <div className="grid sm:grid-cols-2 gap-6">
            <Section title="Problem">
              <p className="text-sm text-slate-400 leading-relaxed">{project.problem}</p>
            </Section>
            <Section title="Target users">
              <p className="text-sm text-slate-400 leading-relaxed">{project.target_users}</p>
            </Section>
          </div>

          {/* Technologies */}
          {project.skills && project.skills.length > 0 && (
            <Section title="Technologies & skills">
              <div className="flex flex-wrap gap-2">
                {project.skills.map((s) => (
                  <Link key={s.id} to={`/explore?technology=${encodeURIComponent(s.name)}`} className="chip hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                    {s.name}
                    {s.category && <span className="text-slate-500 text-[10px]">· {s.category}</span>}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Open roles */}
          {openRoles.length > 0 && (
            <Section title={`Available positions (${openRoles.length})`}>
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

          {/* Team members */}
          {(teamMembers.length > 0 || pendingApps.length > 0) && (
            <Section title="Team members">
              {teamMembers.length > 0 && (
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
                                className="rounded-md bg-accent-500/20 p-1 text-accent-300 hover:bg-accent-500/30 transition-colors"
                              >
                                {roleSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                onClick={() => { setEditingRoleFor(null); setRoleDraft(''); }}
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
                                  className="text-slate-600 hover:text-accent-300 transition-colors"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {m.profile?.verified && <CheckCircle2 size={14} className="text-accent-400 shrink-0" />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {pendingApps.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Pending join requests ({pendingApps.length})</p>
                  <ul className="space-y-2">
                    {pendingApps.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 rounded-xl border border-signal-amber/20 bg-signal-amber/5 p-3">
                        <Avatar src={a.applicant?.avatar_url} name={a.applicant?.display_name ?? ''} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Link to={`/creators/${a.applicant?.handle}`} className="truncate text-xs font-medium text-white hover:text-accent-300">
                            {a.applicant?.display_name}
                          </Link>
                          <p className="text-[10px] text-slate-500">{a.role_title ?? 'General application'}</p>
                        </div>
                        <Badge tone="amber">Pending</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Project progress dashboard — visible only to owner and accepted members */}
          {(isOwner || (profile && teamMembers.some((m) => m.profile_id === profile.id))) && (
            <Section title="Project progress dashboard">
              <ProjectProgressDashboard project={project} isOwner={isOwner} />
            </Section>
          )}

          {project.is_demo && (
            <div className="rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90">
              Demo content — sample project for platform preview.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* Actions */}
          <div className="surface-raised p-5 space-y-2.5">
            {isOwner ? (
              <Button className="w-full" onClick={() => setShowEditModal(true)}>
                <Pencil size={15} /> Edit Project
              </Button>
            ) : isCompleted ? (
              <Badge tone="accent" className="w-full justify-center py-2">Completed showcase</Badge>
            ) : alreadyApplied ? (
              <Badge tone="amber" className="w-full justify-center py-2">Application submitted</Badge>
            ) : (
              <Button className="w-full" onClick={handleJoin}>
                <Sparkles size={15} /> {openRoles.length > 0 ? `Apply to Join (${openRoles.length} roles)` : 'Apply to Join'}
              </Button>
            )}
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                <Play size={15} /> Visit Demo
              </a>
            )}
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full">
                <GitBranch size={15} /> Repository
              </a>
            )}
            {!isOwner && (
              <Button variant="secondary" className="w-full" onClick={() => {
                if (!user || !profile) {
                  prompt({
                    title: 'Contact the team',
                    reason: 'Messaging requires a free WebLoop account so communication stays on-platform.',
                    cta: 'Create a free account to message',
                  });
                } else {
                  setShowMessageModal(true);
                }
              }}>
                <Send size={15} /> Contact Team
              </Button>
            )}
          </div>

          {/* Creator card */}
          {owner && (
            <Link to={`/creators/${owner.handle}`} className="surface-raised p-5 block hover:border-accent-400/30 transition-all group">
              <div className="flex items-center gap-3">
                <Avatar src={owner.avatar_url} name={owner.display_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-white">{owner.display_name}</p>
                    {owner.verified && <CheckCircle2 size={14} className="text-accent-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400">{creatorTypeLabel[owner.creator_type]}</p>
                  {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="New creator" />}
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-accent-300 transition-colors" />
              </div>
              {owner.bio && <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-3">{owner.bio}</p>}
            </Link>
          )}

          {/* Meta */}
          <div className="surface p-5 space-y-3">
            <MetaRow icon={<Target size={14} />} label="Type" value={projectTypeLabel[project.project_type]} />
            {project.difficulty && <MetaRow icon={<Flag size={14} />} label="Difficulty" value={difficultyLabel[project.difficulty]} />}
            {project.compensation && <MetaRow icon={<CheckCircle2 size={14} />} label="Compensation" value={compensationLabel[project.compensation]} />}
            <MetaRow icon={<Users size={14} />} label="Team size" value={project.team_size > 0 ? `${project.team_size} members` : 'Solo / forming'} />
            {project.duration_weeks && <MetaRow icon={<Calendar size={14} />} label="Duration" value={`${project.duration_weeks} weeks`} />}
            {project.time_commitment_hours && <MetaRow icon={<Clock size={14} />} label="Commitment" value={project.time_commitment_hours} />}
            <MetaRow icon={<MapPin size={14} />} label="Location" value={project.is_remote ? 'Remote' : project.location ?? '—'} />
            <MetaRow icon={<Calendar size={14} />} label="Published" value={relativeDate(project.published_at)} />
          </div>
        </div>
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

      {/* Edit project modal */}
      {showEditModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { setProject(updated); setShowEditModal(false); }}
        />
      )}

      {/* Project message modal */}
      {showMessageModal && project && profile && owner && (
        <ProjectMessageModal
          projectId={project.id}
          projectTitle={project.title}
          senderId={profile.id}
          recipientId={owner.id}
          recipientName={owner.display_name}
          recipientAvatar={owner.avatar_url}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label-overline mb-3">{title}</h2>
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


