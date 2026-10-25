import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2,
  MapPin,
  Github,
  Linkedin,
  Globe,
  CheckCircle2,
  Star,
  GitBranch,
  Briefcase,
  Calendar,
  ArrowRight,
  Sparkles,
  Trash2,
  MessageSquare,
  Inbox,
  Users,
  X,
  Send,
  AlertCircle,
  Mail,
  Image as ImageIcon,
  ListChecks,
  Award,
  FolderGit2,
} from 'lucide-react';
import {
  fetchProfileByHandle,
  fetchProfileProjects,
  fetchProfilePortfolio,
  fetchProfileReviews,
  fetchProfileStats,
  fetchProfileContributions,
  fetchProjectApplicationsDetailed,
  fetchProjectApplicationCount,
  deleteProject,
  updateProjectStatus,
  updateApplicationStatus,
  acceptApplicationAndAddMember,
  sendMessage,
  fetchInboxMessages,
  markMessageRead,
  fetchProjectMembers,
} from '@/lib/api';
import type { Application, Message, PortfolioItem, Profile, Project, Review, ProjectStatus } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating, NoRating } from '@/components/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/Button';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import { useAuth } from '@/components/auth/AuthContext';
import { creatorTypeLabel, relativeDate, statusLabel, statusTone } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { TaskManagementPanel } from '@/components/projects/TaskManagementPanel';
import { ConversationModal } from '@/components/projects/ConversationModal';

const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'published', 'recruiting', 'in_progress', 'completed', 'archived'];

type Tab = 'projects' | 'applications' | 'tasks' | 'messages';

export function CreatorProfilePage() {
  const { handle } = useParams();
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [contributions, setContributions] = useState({ total: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('projects');
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectApps, setProjectApps] = useState<Application[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<{ profile: Profile; projectId?: string; projectTitle?: string } | null>(null);
  const [memberList, setMemberList] = useState<Record<string, { id: string; display_name: string; avatar_url: string | null; role: string | null }[]>>({});
  const { prompt } = useAuthPrompt();

  const isOwner = !!(user && myProfile && profile && myProfile.id === profile.id);

  const loadData = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    const p = await fetchProfileByHandle(handle);
    setProfile(p);
    if (p) {
      const [prs, pfs, rvs, st, ctr] = await Promise.all([
        fetchProfileProjects(p.id),
        fetchProfilePortfolio(p.id),
        fetchProfileReviews(p.id),
        fetchProfileStats(p.id),
        fetchProfileContributions(p.id),
      ]);
      setProjects(prs);
      setPortfolio(pfs);
      setReviews(rvs);
      setStats({ avg: st.avg_rating, count: st.review_count });
      setContributions({ total: ctr.total, approved: ctr.approved });

      if (myProfile && p.id === myProfile.id) {
        const counts: Record<string, number> = {};
        let totalPending = 0;
        await Promise.all(
          prs.map(async (proj) => {
            const c = await fetchProjectApplicationCount(proj.id);
            counts[proj.id] = c;
            totalPending += c;
          }),
        );
        setAppCounts(counts);
        setPendingApps(totalPending);

        const msgs = await fetchInboxMessages(p.id);
        setMessages(msgs);
        setUnreadCount(msgs.filter((m) => !m.is_read && m.recipient_id === p.id).length);

        const members: Record<string, { id: string; display_name: string; avatar_url: string | null; role: string | null }[]> = {};
        await Promise.all(
          prs.map(async (proj) => {
            const m = await fetchProjectMembers(proj.id);
            members[proj.id] = m.map((mem) => ({
              id: mem.profile_id,
              display_name: mem.profile?.display_name ?? 'Unknown',
              avatar_url: mem.profile?.avatar_url ?? null,
              role: mem.role,
            }));
          }),
        );
        setMemberList(members);
      }
    } else {
      setProjects([]);
      setPortfolio([]);
      setReviews([]);
    }
    setLoading(false);
  }, [handle, myProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExpandApps = async (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    const apps = await fetchProjectApplicationsDetailed(projectId);
    setProjectApps(apps);
  };

  const handleDeleteProject = async (projectId: string) => {
    setStatusUpdating(projectId);
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleStatusChange = async (projectId: string, status: string) => {
    setStatusUpdating(projectId);
    try {
      await updateProjectStatus(projectId, status);
      setProjects(projects.map((p) => (p.id === projectId ? { ...p, status: status as ProjectStatus } : p)));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleAppDecision = async (a: Application, status: 'accepted' | 'declined') => {
    try {
      if (status === 'accepted') {
        await acceptApplicationAndAddMember(a.id, a.project_id, a.applicant_id, a.role_title);
      } else {
        await updateApplicationStatus(a.id, status);
      }
      setProjectApps(projectApps.map((pa) => (pa.id === a.id ? { ...pa, status } : pa)));
      const projId = a.project_id;
      const newCount = projectApps.filter((pa) => pa.id !== a.id && pa.status === 'pending').length;
      setAppCounts({ ...appCounts, [projId]: newCount });
    } catch (err) {
      console.error('Failed to update application:', err);
    }
  };

  const handleMessageRead = async (msgId: string) => {
    await markMessageRead(msgId);
    setMessages(messages.map((m) => (m.id === msgId ? { ...m, is_read: true } : m)));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const handleContact = () => {
    if (!user || !myProfile) {
      prompt({
        title: `Message ${profile?.display_name}`,
        reason: 'Reaching out requires a free WebLoop account so communication stays on-platform and respectful.',
        cta: 'Create a free account to message',
      });
      return;
    }
    setContactOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent-400" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Profile not found</h1>
        <Link to="/explore" className="mt-4 inline-block link-accent">Back to Explore</Link>
      </div>
    );
  }

  const isCompany = profile.creator_type === 'company' || profile.creator_type === 'university';
  const publishedProjects = projects.filter((p) => p.status !== 'draft' && p.status !== 'archived');

  return (
    <div className="container-page py-8 max-w-5xl">
      {/* ===== Profile Card (LinkedIn-style header) ===== */}
      <div className="surface-raised overflow-hidden">
        {/* Banner */}
        <div className="relative h-32 sm:h-40">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-ink-700 via-ink-800 to-ink-850" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        </div>

        {/* Profile body */}
        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + name row */}
          <div className="flex flex-col gap-4 -mt-14">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="xl"
              className="ring-4 ring-ink-850 shrink-0"
            />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">{profile.display_name}</h1>
                {profile.verified && <CheckCircle2 size={18} className="text-accent-400 shrink-0" />}
              </div>
              {profile.experience_level && (
                <p className="mt-0.5 text-sm text-slate-300">{profile.experience_level}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <Badge tone="accent">{creatorTypeLabel[profile.creator_type]}</Badge>
                {profile.location && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>
                )}
                {profile.availability && (
                  <span className="inline-flex items-center gap-1"><Calendar size={12} /> {profile.availability}</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-2xl">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            {stats.count > 0 ? (
              <Rating value={stats.avg} count={stats.count} size="md" />
            ) : (
              <NoRating label="Not rated yet" />
            )}
            <StatPill icon={<FolderGit2 size={13} />} label={`${publishedProjects.length} project${publishedProjects.length !== 1 ? 's' : ''}`} />
            <StatPill icon={<Award size={13} />} label={`${contributions.approved} approved contribution${contributions.approved !== 1 ? 's' : ''}`} />
            {portfolio.length > 0 && (
              <StatPill icon={<ImageIcon size={13} />} label={`${portfolio.length} portfolio item${portfolio.length !== 1 ? 's' : ''}`} />
            )}
          </div>

          {/* Action buttons + social links */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {isOwner ? (
              <Link to="/settings">
                <Button variant="secondary" size="sm">
                  <Sparkles size={14} /> Edit Profile
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={handleContact}>
                <Mail size={14} /> Message
              </Button>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-accent-400/30 hover:text-accent-200 transition-colors"
              >
                <Globe size={13} /> Website
              </a>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-accent-400/30 hover:text-accent-200 transition-colors"
              >
                <Github size={13} /> GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-accent-400/30 hover:text-accent-200 transition-colors"
              >
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
          </div>

          {/* Demo badge */}
          {profile.is_demo && (
            <div className="mt-4 rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90 inline-block">
              Demo content — sample profile for platform preview.
            </div>
          )}
        </div>
      </div>

      {/* ===== Owner management tabs ===== */}
      {isOwner && (
        <div className="mt-6 flex gap-1 border-b border-white/8">
          <TabButton active={tab === 'projects'} onClick={() => setTab('projects')} icon={<GitBranch size={15} />} label="My Projects" badge={projects.length} />
          <TabButton active={tab === 'applications'} onClick={() => setTab('applications')} icon={<Users size={15} />} label="Join Requests" badge={pendingApps} badgeTone="amber" />
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListChecks size={15} />} label="Tasks" />
          <TabButton active={tab === 'messages'} onClick={() => setTab('messages')} icon={<Inbox size={15} />} label="Messages" badge={unreadCount} badgeTone="accent" />
        </div>
      )}

      {/* ===== Main content grid ===== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT — primary content */}
        <div className="space-y-6 min-w-0">
          {/* Owner management views */}
          {isOwner && tab === 'applications' && (
            <section className="surface p-5">
              <h2 className="label-overline mb-4">Join requests across your projects</h2>
              {projects.length === 0 ? (
                <EmptyState label="You haven't published any projects yet." />
              ) : (
                <div className="space-y-4">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/projects/${p.slug}`} className="font-display text-sm font-semibold text-white hover:text-accent-300 transition-colors">
                            {p.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                            {appCounts[p.id] > 0 && <Badge tone="amber">{appCounts[p.id]} pending</Badge>}
                          </div>
                        </div>
                        <Button variant="secondary" onClick={() => handleExpandApps(p.id)} className="text-xs">
                          {expandedProject === p.id ? 'Hide' : 'View requests'}
                        </Button>
                      </div>
                      {expandedProject === p.id && (
                        <div className="mt-4 space-y-3">
                          {projectApps.length === 0 ? (
                            <p className="text-xs text-slate-500">No applications yet.</p>
                          ) : (
                            projectApps.map((a) => (
                              <div key={a.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                                <div className="flex items-center gap-3">
                                  <Avatar src={a.applicant?.avatar_url} name={a.applicant?.display_name ?? ''} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <Link to={`/creators/${a.applicant?.handle}`} className="text-xs font-medium text-white hover:text-accent-300">
                                      {a.applicant?.display_name}
                                    </Link>
                                    <p className="text-[10px] text-slate-500">
                                      {a.role_title ? `Applied for: ${a.role_title}` : 'General application'} · {relativeDate(a.created_at)}
                                    </p>
                                  </div>
                                  <Badge tone={a.status === 'pending' ? 'amber' : a.status === 'accepted' ? 'green' : 'rose'}>
                                    {a.status}
                                  </Badge>
                                </div>
                                {a.message && <p className="mt-2 text-xs text-slate-400 leading-relaxed">{a.message}</p>}
                                {a.status === 'pending' && (
                                  <div className="mt-3 flex gap-2">
                                    <Button onClick={() => handleAppDecision(a, 'accepted')} className="text-xs px-3 py-1.5">
                                      <CheckCircle2 size={12} /> Accept
                                    </Button>
                                    <Button variant="ghost" onClick={() => handleAppDecision(a, 'declined')} className="text-xs px-3 py-1.5">
                                      <X size={12} /> Decline
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {isOwner && tab === 'tasks' && (
            <section className="surface p-5">
              <h2 className="label-overline mb-4">Task Management</h2>
              {projects.length === 0 ? (
                <EmptyState label="Publish a project first, then manage tasks here." />
              ) : (
                <div className="space-y-6">
                  {projects.map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <Link to={`/projects/${p.slug}`} className="font-display text-sm font-semibold text-white hover:text-accent-300 transition-colors">
                          {p.title}
                        </Link>
                        <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      </div>
                      <TaskManagementPanel projectId={p.id} profileId={profile.id} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {isOwner && tab === 'messages' && (
            <section className="surface p-5">
              <h2 className="label-overline mb-4">Messages</h2>
              <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs font-medium text-slate-400 mb-3">Start a conversation with a team member</p>
                <div className="space-y-2">
                  {projects.map((p) => {
                    const members = memberList[p.id] ?? [];
                    if (members.length === 0) return null;
                    return (
                      <div key={p.id}>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">{p.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {members.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setMessageTarget({ profile: { id: m.id, display_name: m.display_name, avatar_url: m.avatar_url, handle: '', creator_type: 'student', verified: false, is_demo: false, created_at: '', updated_at: '', interests: [], user_id: null, bio: null, location: null, website_url: null, github_url: null, linkedin_url: null, experience_level: null, availability: null, banner_url: null } as unknown as Profile, projectId: p.id, projectTitle: p.title })}
                              className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-accent-400/30 hover:text-white transition-all"
                            >
                              <Avatar src={m.avatar_url} name={m.display_name} size="xs" />
                              {m.display_name}
                              {m.role && <span className="text-slate-500">· {m.role}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.values(memberList).every((m) => m.length === 0) && (
                    <p className="text-xs text-slate-500">No accepted team members yet. Accept join requests first.</p>
                  )}
                </div>
              </div>

              {messages.length === 0 ? (
                <EmptyState label="No messages yet. Start a conversation with a team member above." />
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const conversations = new Map<string, { other: Profile; lastMsg: Message; unread: number; projectId?: string; projectTitle?: string }>();
                    for (const m of messages) {
                      const received = m.recipient_id === profile.id;
                      const other = (received ? m.sender : m.recipient)!;
                      const existing = conversations.get(other.id);
                      if (!existing || new Date(m.created_at) > new Date(existing.lastMsg.created_at)) {
                        conversations.set(other.id, {
                          other,
                          lastMsg: m,
                          unread: 0,
                          projectId: m.project_id ?? undefined,
                          projectTitle: m.project?.title,
                        });
                      }
                      if (received && !m.is_read) {
                        const entry = conversations.get(other.id)!;
                        entry.unread++;
                      }
                    }
                    return Array.from(conversations.values()).sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()).map((c) => (
                      <button
                        key={c.other.id}
                        onClick={() => {
                          if (c.lastMsg.recipient_id === profile.id && !c.lastMsg.is_read) {
                            handleMessageRead(c.lastMsg.id);
                          }
                          setMessageTarget({ profile: c.other, projectId: c.projectId, projectTitle: c.projectTitle });
                        }}
                        className={cn('w-full text-left rounded-xl border p-4 transition-all', c.unread > 0 ? 'border-accent-400/20 bg-accent-500/5 hover:border-accent-400/40' : 'border-white/5 bg-white/[0.02] hover:border-white/15')}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={c.other.avatar_url} name={c.other.display_name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Link to={`/creators/${c.other.handle}`} onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-white hover:text-accent-300">
                                {c.other.display_name}
                              </Link>
                              {c.unread > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />}
                            </div>
                            <p className="text-[10px] text-slate-500">{relativeDate(c.lastMsg.created_at)}</p>
                          </div>
                          {c.projectTitle && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[120px]">re: {c.projectTitle}</span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed line-clamp-2">{c.lastMsg.body}</p>
                      </button>
                    ));
                  })()}
                </div>
              )}

              {messageTarget && myProfile && (
                <ConversationModal
                  myProfile={myProfile}
                  otherProfile={messageTarget.profile}
                  projectId={messageTarget.projectId}
                  projectTitle={messageTarget.projectTitle}
                  onClose={() => { setMessageTarget(null); loadData(); }}
                />
              )}
            </section>
          )}

          {/* Projects section (default for visitors, and owner on projects tab) */}
          {(!isOwner || tab === 'projects') && (
            <>
              {/* About */}
              <SectionCard title="About" icon={<MessageSquare size={14} />}>
                {profile.bio ? (
                  <p className="text-sm text-slate-300 leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-slate-500">No bio available.</p>
                )}
                {(profile.experience_level || profile.availability) && (
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                    {profile.experience_level && (
                      <span className="inline-flex items-center gap-1.5"><Briefcase size={12} /> {profile.experience_level}</span>
                    )}
                    {profile.availability && (
                      <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {profile.availability}</span>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Skills */}
              {profile.interests && profile.interests.length > 0 && (
                <SectionCard title="Skills" icon={<Award size={14} />}>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((skill) => (
                      <span key={skill} className="chip">{skill}</span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Published Projects */}
              {publishedProjects.length > 0 && (
                <SectionCard title={isCompany ? 'Published Projects' : 'Projects'} icon={<FolderGit2 size={14} />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {publishedProjects.map((p) => (
                      <div key={p.id} className="relative">
                        <ProjectCard project={p} compact />
                        {isOwner && (
                          <div className="mt-2 rounded-xl border border-white/8 bg-ink-900/60 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-slate-500">Status</span>
                              <select
                                value={p.status}
                                disabled={statusUpdating === p.id}
                                onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                className="flex-1 appearance-none rounded-md border border-white/10 bg-ink-900 px-2 py-1 text-xs text-slate-200 focus:border-accent-400/40"
                              >
                                {PROJECT_STATUSES.map((s) => (
                                  <option key={s} value={s} className="bg-ink-900">{statusLabel[s]}</option>
                                ))}
                              </select>
                              {statusUpdating === p.id && <Loader2 size={12} className="animate-spin text-accent-400" />}
                              {appCounts[p.id] > 0 && (
                                <Link to="#" onClick={(e) => { e.preventDefault(); setTab('applications'); handleExpandApps(p.id); }} className="inline-flex items-center gap-1 text-[10px] text-signal-amber hover:text-signal-amber/80">
                                  <Users size={11} /> {appCounts[p.id]}
                                </Link>
                              )}
                            </div>
                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-signal-rose/20 bg-signal-rose/5 px-2 py-1 text-xs text-signal-rose hover:bg-signal-rose/10 transition-colors"
                            >
                              <Trash2 size={11} /> Delete project
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Contributions */}
              {(contributions.total > 0 || contributions.approved > 0) && (
                <SectionCard title="Contributions" icon={<Award size={14} />}>
                  <div className="grid grid-cols-2 gap-3">
                    <ContributionStat label="Total submissions" value={contributions.total} />
                    <ContributionStat label="Approved contributions" value={contributions.approved} />
                  </div>
                </SectionCard>
              )}

              {/* Portfolio / Experience */}
              {portfolio.length > 0 && (
                <SectionCard title="Experience & Portfolio" icon={<ImageIcon size={14} />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {portfolio.map((item) => (
                      <div key={item.id} className="group rounded-xl border border-white/8 overflow-hidden bg-white/[0.02]">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {item.cover_image_url ? (
                            <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                          <span className="absolute left-2.5 top-2.5"><Badge tone="violet">{item.category}</Badge></span>
                        </div>
                        <div className="p-3.5">
                          <p className="font-display text-sm font-semibold text-white">{item.title}</p>
                          {item.role && <p className="mt-0.5 text-[11px] text-accent-300">{item.role}</p>}
                          {item.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                          {item.repo_url && (
                            <a href={item.repo_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-accent-300">
                              <GitBranch size={11} /> Repository
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start min-w-0">
          {/* Reviews */}
          <SectionCard title="Reviews" icon={<Star size={14} />}>
            {stats.count > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Star size={16} className="fill-signal-amber text-signal-amber" />
                <span className="text-sm font-semibold text-white">{stats.avg.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({stats.count} review{stats.count !== 1 ? 's' : ''})</span>
              </div>
            )}
            {reviews.length === 0 ? (
              <NoRating label="No reviews yet" />
            ) : (
              <ul className="space-y-4">
                {reviews.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar src={r.reviewer?.avatar_url} name={r.reviewer?.display_name ?? ''} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{r.reviewer?.display_name}</p>
                        <p className="text-[10px] text-slate-500">{relativeDate(r.created_at)}</p>
                      </div>
                      <Rating value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-2 text-xs text-slate-400 leading-relaxed">{r.comment}</p>}
                    {r.project && (
                      <Link to={`/projects/${r.project.slug}`} className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent-300 hover:text-accent-200">
                        {r.project.title} <ArrowRight size={10} />
                      </Link>
                    )}
                    {r.is_verified_participation && <div className="mt-2"><Badge tone="green">Verified participation</Badge></div>}
                  </li>
                ))}
                {reviews.length > 5 && (
                  <li className="pt-1">
                    <p className="text-center text-xs text-slate-500">+ {reviews.length - 5} more review{reviews.length - 5 !== 1 ? 's' : ''}</p>
                  </li>
                )}
              </ul>
            )}
          </SectionCard>

          {/* Quick stats card */}
          <SectionCard title="Activity" icon={<Briefcase size={14} />}>
            <div className="space-y-3 text-sm">
              <ActivityRow label="Projects" value={publishedProjects.length} />
              <ActivityRow label="Portfolio items" value={portfolio.length} />
              <ActivityRow label="Total submissions" value={contributions.total} />
              <ActivityRow label="Approved" value={contributions.approved} />
              <ActivityRow label="Reviews received" value={stats.count} />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="surface-raised w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-rose/15 text-signal-rose">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-display text-lg font-bold text-white">Delete this project?</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5">
              This permanently removes the project, its skills, roles, and all applications. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => handleDeleteProject(confirmDelete)} disabled={statusUpdating === confirmDelete}>
                {statusUpdating === confirmDelete ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Yes, delete
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact modal */}
      {contactOpen && myProfile && profile && (
        <ContactModal
          from={myProfile}
          to={profile}
          onClose={() => setContactOpen(false)}
          onSent={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent-300">{icon}</span>
        <h2 className="label-overline">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      {icon}
      {label}
    </span>
  );
}

function ContributionStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5">
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function ActivityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeTone,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeTone?: 'amber' | 'accent';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active ? 'border-accent-400 text-white' : 'border-transparent text-slate-400 hover:text-white',
      )}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
          badgeTone === 'amber' ? 'bg-signal-amber/20 text-signal-amber' : 'bg-accent-500/20 text-accent-300',
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="surface p-8 text-center">
      <MessageSquare size={24} className="mx-auto text-slate-600" />
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </div>
  );
}

function ContactModal({
  from,
  to,
  onClose,
  onSent,
}: {
  from: Profile;
  to: Profile;
  onClose: () => void;
  onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
      setError('Please write a message.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendMessage(from.id, to.id, body.trim());
      setSent(true);
      setTimeout(onSent, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar src={to.avatar_url} name={to.display_name} size="md" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Message {to.display_name}</h2>
              <p className="text-xs text-slate-500">@{to.handle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-green/15 text-signal-green">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">Message sent!</h3>
            <p className="mt-2 text-sm text-slate-400">{to.display_name} will see your message in their inbox.</p>
          </div>
        ) : (
          <>
            <label className="block mb-4">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Your message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={`Hi ${to.display_name}, I'd like to connect about...`}
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
              <Button onClick={handleSend} disabled={sending} className="flex-1">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button variant="ghost" onClick={onClose} className="px-5">Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
