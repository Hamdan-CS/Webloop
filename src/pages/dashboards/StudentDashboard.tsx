import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GitBranch,
  Inbox,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  ArrowRight,
  Briefcase,
  FolderGit2,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import {
  fetchProfileProjects,
  fetchProfilePortfolio,
  fetchProfileStats,
  fetchProjectApplicationCount,
} from '@/lib/api';
import type { PortfolioItem, Project } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating, NoRating } from '@/components/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/Button';
import { statusLabel, statusTone, relativeDate } from '@/lib/labels';
import { MyTasksPanel } from '@/components/projects/MyTasksPanel';
import { ClipboardList } from 'lucide-react';

export function StudentDashboard() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, pfs, st] = await Promise.all([
        fetchProfileProjects(profile.id),
        fetchProfilePortfolio(profile.id),
        fetchProfileStats(profile.id),
      ]);
      setProjects(prs);
      setPortfolio(pfs);
      setStats({ avg: st.avg_rating, count: st.review_count });
      const counts: Record<string, number> = {};
      await Promise.all(prs.map(async (p) => { counts[p.id] = await fetchProjectApplicationCount(p.id); }));
      setAppCounts(counts);
      setLoading(false);
    })();
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="container-page py-8">
      {/* Greeting */}
      <div className="surface-raised p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">Welcome back, {profile.display_name.split(' ')[0]}</h1>
            <Badge tone="accent">Student</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            @{profile.handle} · {projects.length} projects · {portfolio.length} portfolio items
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/publish"><Button><Plus size={15} /> New Project</Button></Link>
          <Link to="/explore"><Button variant="secondary"><Sparkles size={15} /> Explore</Button></Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FolderGit2 size={18} />} label="Active Projects" value={projects.filter((p) => p.status === 'recruiting' || p.status === 'in_progress').length} />
        <StatCard icon={<Inbox size={18} />} label="Join Requests" value={Object.values(appCounts).reduce((a, b) => a + b, 0)} tone="amber" />
        <StatCard icon={<Star size={18} />} label="Avg Rating" value={stats.count > 0 ? stats.avg.toFixed(1) : '—'} />
        <StatCard icon={<TrendingUp size={18} />} label="Portfolio Items" value={portfolio.length} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* My projects */}
        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="label-overline">My Projects</h2>
              <Link to="/publish" className="text-xs text-accent-300 hover:text-accent-200 inline-flex items-center gap-1">
                <Plus size={12} /> Publish new
              </Link>
            </div>
            {loading ? (
              <div className="surface p-8 text-center text-sm text-slate-500">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="surface p-8 text-center">
                <GitBranch size={24} className="mx-auto text-slate-600" />
                <p className="mt-3 text-sm text-slate-400">You haven't published a project yet.</p>
                <Link to="/publish" className="mt-4 inline-block"><Button variant="secondary"><Plus size={14} /> Publish your first project</Button></Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2">
                      <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      {appCounts[p.id] > 0 && (
                        <Link to={`/creators/${profile.handle}`} className="text-[11px] text-signal-amber hover:text-signal-amber/80 inline-flex items-center gap-1">
                          <Inbox size={11} /> {appCounts[p.id]} requests
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My assigned tasks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="label-overline">My Assigned Tasks</h2>
            </div>
            {loading ? (
              <div className="surface p-8 text-center text-sm text-slate-500">Loading…</div>
            ) : (
              <MyTasksPanel profileId={profile.id} />
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="label-overline mb-4">Quick actions</h2>
            <nav className="space-y-1.5">
              <QuickLink to="/publish" icon={<Plus size={15} />} label="Publish a project" />
              <QuickLink to="/explore" icon={<Sparkles size={15} />} label="Explore projects" />
              <QuickLink to="/my-applications" icon={<Briefcase size={15} />} label="My applications" />
              <QuickLink to={`/creators/${profile.handle}`} icon={<Users size={15} />} label="View my profile" />
              <QuickLink to="/settings" icon={<GitBranch size={15} />} label="Edit profile" />
            </nav>
          </section>

          <section className="surface p-5">
            <h2 className="label-overline mb-4">Reputation</h2>
            {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}
            <p className="mt-3 text-xs text-slate-500">Ratings come from collaborators after you contribute to a project.</p>
          </section>

          <section className="surface p-5">
            <h2 className="label-overline mb-4">Recent portfolio</h2>
            {portfolio.length === 0 ? (
              <p className="text-xs text-slate-500">No portfolio items yet.</p>
            ) : (
              <ul className="space-y-2">
                {portfolio.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="truncate text-slate-300">{item.title}</span>
                    <span className="text-slate-600 shrink-0">{relativeDate(item.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: 'amber' }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone === 'amber' ? 'bg-signal-amber/15 text-signal-amber' : 'bg-accent-500/15 text-accent-300'}`}>{icon}</div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight size={13} className="text-slate-600" />
    </Link>
  );
}
