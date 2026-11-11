import { lazy, Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
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
  MessageSquare,
  Users,
  X,
  AlertCircle,
  Mail,
  Image as ImageIcon,
  Award,
  FolderGit2,
  Languages as LanguagesIcon,
  Link2,
  GraduationCap,
  Rss,
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
  updateApplicationStatus,
  acceptApplicationAndAddMember,
} from '@/services/api';
import type { Application, PortfolioItem, Profile, Project, Review } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/shared/ui/Button';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { useAuthPrompt } from '@/components/auth/AuthPrompt';
import { ContactModal } from '@/components/messaging/ContactModal';
import { useAuth } from '@/contexts/AuthContext';
import { creatorTypeLabel, relativeDate, statusLabel, statusTone } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { MyPostsSection } from '@/features/feed/components/MyPostsSection';
import { checkIsAdmin } from '@/features/feed/services/feedApi';

const ContributionGrid = lazy(() =>
  import('@/components/contributions').then((m) => ({ default: m.ContributionGrid })),
);

type Tab = 'projects' | 'applications';
const VALID_TABS: Tab[] = ['projects', 'applications'];

export function CreatorProfilePage() {
  const { handle } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [contributions, setContributions] = useState({ total: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const initialTabParam = searchParams.get('tab');
  const [tab, setTabInternal] = useState<Tab>(
    VALID_TABS.includes(initialTabParam as Tab) ? (initialTabParam as Tab) : 'projects',
  );
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectApps, setProjectApps] = useState<Application[]>([]);
  const [pendingApps, setPendingApps] = useState(0);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { prompt } = useAuthPrompt();
  const tabSectionRef = useRef<HTMLDivElement>(null);

  const isOwner = !!(user && myProfile && profile && myProfile.id === profile.id);

  const setTab = useCallback(
    (t: Tab) => {
      setTabInternal(t);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', t);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && VALID_TABS.includes(t as Tab) && t !== tab) {
      setTabInternal(t as Tab);
      tabSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams, tab]);

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

  useEffect(() => {
    if (!user) return;
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  const handleExpandApps = async (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    const apps = await fetchProjectApplicationsDetailed(projectId);
    setProjectApps(apps);
  };

  const handleAppDecision = async (a: Application, status: 'accepted' | 'declined') => {
    setDecisionError(null);
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
      setPendingApps((n) => Math.max(0, n - 1));
    } catch (err) {
      console.error('Failed to update application:', err);
      setDecisionError(`Couldn't ${status === 'accepted' ? 'accept' : 'decline'} ${a.applicant?.display_name ?? 'this applicant'}. Please try again.`);
    }
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
        <LoopLoader size={28} />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="pf-name">Profile not found</h1>
        <Link to="/explore" className="mt-4 inline-block link-accent">Back to Explore</Link>
      </div>
    );
  }

  const isCompany = profile.creator_type === 'company' || profile.creator_type === 'university';
  const publishedProjects = projects.filter((p) => p.status !== 'draft' && p.status !== 'archived');

  return (
    <div className="container-page py-8 max-w-5xl pf reveal">
      {/* ===== Profile Card (LinkedIn-style header) ===== */}
      <div className="surface-raised pf-card pf-head overflow-hidden">
        {/* Banner */}
        <div className="relative h-32 sm:h-40">
          {profile.banner_url ? (
            <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, hsl(${profile.accent_hue ?? 210} 70% 42%), hsl(${(profile.accent_hue ?? 210) + 40} 75% 58%))` }} />
          )}
          <div className="pf-banner-fade" />
        </div>

        {/* Profile body */}
        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + name row */}
          <div className="flex flex-col gap-4 -mt-14">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="xl"
              className="shrink-0"
              style={{ width: 104, height: 104, fontSize: 28, boxShadow: '0 0 0 4px var(--panel-solid), 0 0 0 5px var(--glass-line-2)' }}
            />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="pf-name">{profile.display_name}</h1>
                {profile.verified && <CheckCircle2 size={18} className="text-accent-400 shrink-0" />}
              </div>
              {profile.major && <p className="mt-0.5 text-sm font-semibold text-slate-200">{profile.major}</p>}
              <div className="pf-meta mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="ref-tag pf-type">{creatorTypeLabel[profile.creator_type]}</span>
                {isCompany && profile.industry && <span className="ref-tag">{profile.industry}</span>}
                {isCompany && profile.company_size && <span className="ref-tag">{profile.company_size} people</span>}
                {isCompany && profile.website_url && <span className="ref-tag">{profile.website_url.replace(/^https?:\/\//, '')}</span>}
                {profile.education_level && (
                  <span className="inline-flex items-center gap-1">{profile.education_level} student</span>
                )}
                {(profile.university || profile.graduation_year) && (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap size={12} /> {[profile.university, profile.graduation_year && `class of ${profile.graduation_year}`].filter(Boolean).join(', ')}
                  </span>
                )}
                {!isCompany && profile.experience_level && (
                  <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {profile.experience_level}</span>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>
                )}
                {!isCompany && profile.availability && (
                  <span className="inline-flex items-center gap-1"><Calendar size={12} /> {profile.availability}</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="pf-bio mt-4">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="pf-kpis mt-5">
            <div className="pf-kpi">
              {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} size="md" /> : <b className="pf-kpi-na">&mdash;</b>}
              <span>{stats.count > 0 ? 'Rating' : 'Not rated yet'}</span>
            </div>
            <Kpi value={publishedProjects.length} label={`Project${publishedProjects.length !== 1 ? 's' : ''}`} />
            {contributions.total > 0 && <Kpi value={contributions.total} label={`Submission${contributions.total !== 1 ? 's' : ''}`} />}
            {!isCompany && <Kpi value={contributions.approved} label={`Approved contribution${contributions.approved !== 1 ? 's' : ''}`} tone="ok" />}
            {portfolio.length > 0 && <Kpi value={portfolio.length} label={`Portfolio item${portfolio.length !== 1 ? 's' : ''}`} />}
          </div>

          {/* Action buttons + social links */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {isOwner ? (
              <Link to="/settings/profile">
                <Button variant="ghost" className="btn-sm">
                  <Sparkles size={14} /> Edit Profile
                </Button>
              </Link>
            ) : (
              <Button className="btn-sm" onClick={handleContact}>
                <Mail size={14} /> Message
              </Button>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <Globe size={13} /> Website
              </a>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <Github size={13} /> GitHub
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <Linkedin size={13} /> LinkedIn
              </a>
            )}
          </div>

          {/* Demo badge */}
          {profile.is_demo && (
            <div className="demo-note mt-4">
              Demo content — sample profile for platform preview.
            </div>
          )}
        </div>
      </div>

      {/* ===== Contribution grid — students & teams only ===== */}
      {(profile.creator_type === 'student' || profile.creator_type === 'team') && (
        <div className="mt-6">
          <Suspense fallback={<div className="skeleton h-[340px] rounded-xl" />}>
            <ContributionGrid studentId={profile.id} size="full" />
          </Suspense>
        </div>
      )}

      {/* ===== Owner management tabs ===== */}
      {isOwner && (
        <div ref={tabSectionRef} className="d-tabs pf-tabs mt-6" role="tablist">
          <TabButton active={tab === 'projects'} onClick={() => setTab('projects')} icon={<GitBranch size={15} />} label="Profile" />
          <TabButton active={tab === 'applications'} onClick={() => setTab('applications')} icon={<Users size={15} />} label={isCompany ? 'Applicants' : 'Join Requests'} badge={pendingApps} badgeTone="amber" />
        </div>
      )}

      {/* ===== Main content grid ===== */}
      <div key={tab} className="reveal mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT — primary content */}
        <div className="space-y-6 min-w-0">
          {/* Owner management views */}
          {isOwner && tab === 'applications' && (
            <section className="surface pf-card p-5">
              <h2 className="pf-h4 mb-4">{isCompany ? 'Applicants across your projects' : 'Join requests across your projects'}</h2>
              {decisionError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{decisionError}</span>
                </div>
              )}
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
                          {expandedProject === p.id ? 'Hide' : isCompany ? 'View applicants' : 'View requests'}
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
                {!isCompany && (profile.experience_level || profile.availability) && (
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

              {/* Posts */}
              {user && (
                <SectionCard title="Posts" icon={<Rss size={14} />}>
                  <MyPostsSection
                    profileId={profile.id}
                    isOwner={isOwner}
                    viewerProfileId={myProfile?.id ?? null}
                    isAdmin={isAdmin}
                    onRequireAuth={() =>
                      prompt({ title: 'Join to do more', reason: 'Create a free account to like, comment, save, and post.' })
                    }
                  />
                </SectionCard>
              )}

              {/* Skills */}
              {profile.interests && profile.interests.length > 0 && (
                <SectionCard title={isCompany ? 'Focus areas' : 'Skills'} icon={<Award size={14} />}>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((skill) => (
                      <span key={skill} className="ref-tag">{skill}</span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Preferred roles */}
              {profile.preferred_roles && profile.preferred_roles.length > 0 && (
                <SectionCard title="Preferred roles" icon={<Users size={14} />}>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_roles.map((role) => (
                      <span key={role} className="ref-tag">{role}</span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <SectionCard title="Languages" icon={<LanguagesIcon size={14} />}>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang) => (
                      <span key={lang} className="ref-tag">{lang}</span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Portfolio links */}
              {profile.portfolio_links && profile.portfolio_links.length > 0 && (
                <SectionCard title="Portfolio links" icon={<Link2 size={14} />}>
                  <div className="grid gap-2">
                    {profile.portfolio_links.map((href) => (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm text-slate-300 hover:border-accent-400/40 hover:text-accent-200 transition-colors truncate"
                      >
                        <Link2 size={13} className="shrink-0" /> <span className="truncate">{href.replace(/^https?:\/\//, '')}</span>
                      </a>
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
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Portfolio / Experience */}
              {portfolio.length > 0 && (
                <SectionCard title={isCompany ? 'Past work' : 'Experience & Portfolio'} icon={<ImageIcon size={14} />}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {portfolio.map((item) => (
                      <div key={item.id} className="group pf-work">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {item.cover_image_url ? (
                            <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="h-full w-full" style={{ background: 'linear-gradient(135deg, var(--blue), var(--cyan))' }} />
                          )}
                          {item.is_verified && <span className="vbadge">&#10003; Verified contribution</span>}
                          {item.category && <span className="pf-cat">{item.category}</span>}
                        </div>
                        <div className="pf-work-body">
                          <p className="pf-work-title">{item.title}</p>
                          {item.role && <p className="pf-work-role">{item.role}</p>}
                          {item.description && <p className="pf-work-desc line-clamp-2">{item.description}</p>}
                          {item.tech && item.tech.length > 0 && (
                            <div className="ref-tags">{item.tech.slice(0, 4).map((t) => <span key={t} className="ref-tag">{t}</span>)}</div>
                          )}
                          {item.repo_url && (
                            <a href={item.repo_url} target="_blank" rel="noopener noreferrer" className="pf-work-link">
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
        </div>
      </div>

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
    <section className="surface pf-card p-5">
      <div className="pf-sec-hd">
        <span className="pf-ic">{icon}</span>
        <h2 className="pf-h4">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Kpi({ value, label, tone }: { value: number; label: string; tone?: 'ok' }) {
  return (
    <div className="pf-kpi">
      <b className={tone === 'ok' ? 'c1' : undefined}>{value}</b>
      <span>{label}</span>
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
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('pf-tab', active && 'on')}>
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={cn('pf-count', badgeTone === 'amber' && 'amber')}>{badge}</span>
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

