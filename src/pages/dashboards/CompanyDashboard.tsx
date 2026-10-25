import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Users,
  Inbox,
  Plus,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  Star,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import {
  fetchProfileProjects,
  fetchProfileStats,
  fetchProjectApplicationCount,
} from '@/lib/api';
import type { Project } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating, NoRating } from '@/components/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/ui/Button';
import { statusLabel, statusTone } from '@/lib/labels';

export function CompanyDashboard() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, st] = await Promise.all([
        fetchProfileProjects(profile.id),
        fetchProfileStats(profile.id),
      ]);
      setProjects(prs);
      setStats({ avg: st.avg_rating, count: st.review_count });
      const counts: Record<string, number> = {};
      await Promise.all(prs.map(async (p) => { counts[p.id] = await fetchProjectApplicationCount(p.id); }));
      setAppCounts(counts);
      setLoading(false);
    })();
  }, [profile]);

  if (!profile) return null;
  const totalPending = Object.values(appCounts).reduce((a, b) => a + b, 0);
  const activeProjects = projects.filter((p) => p.status === 'recruiting' || p.status === 'in_progress').length;

  return (
    <div className="container-page py-8">
      {/* Greeting */}
      <div className="surface-raised p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{profile.display_name}</h1>
            <Badge tone="violet">Company</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            @{profile.handle} · {activeProjects} active projects · {totalPending} open requests
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/publish"><Button><Plus size={15} /> Post a Project</Button></Link>
          <Link to={`/creators/${profile.handle}`}><Button variant="secondary"><Building2 size={15} /> View Profile</Button></Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<FolderGit2 size={18} />} label="Active Projects" value={activeProjects} />
        <StatCard icon={<Inbox size={18} />} label="Pending Requests" value={totalPending} tone="amber" />
        <StatCard icon={<Users size={18} />} label="Total Projects" value={projects.length} />
        <StatCard icon={<Star size={18} />} label="Avg Rating" value={stats.count > 0 ? stats.avg.toFixed(1) : '—'} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Company projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="label-overline">Published Projects</h2>
            <Link to="/publish" className="text-xs text-accent-300 hover:text-accent-200 inline-flex items-center gap-1">
              <Plus size={12} /> Post new
            </Link>
          </div>
          {loading ? (
            <div className="surface p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="surface p-8 text-center">
              <Briefcase size={24} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">Your company hasn't posted a project yet.</p>
              <Link to="/publish" className="mt-4 inline-block"><Button variant="secondary"><Plus size={14} /> Post your first project</Button></Link>
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
                        <Inbox size={11} /> {appCounts[p.id]} applicants
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="label-overline mb-4">Company actions</h2>
            <nav className="space-y-1.5">
              <QuickLink to="/publish" icon={<Plus size={15} />} label="Post a scoped project" />
              <QuickLink to={`/creators/${profile.handle}`} icon={<Inbox size={15} />} label="Review applicants" />
              <QuickLink to="/explore" icon={<TrendingUp size={15} />} label="Browse student work" />
              <QuickLink to="/gallery" icon={<Users size={15} />} label="Discover talent" />
              <QuickLink to="/settings" icon={<Building2 size={15} />} label="Edit company profile" />
            </nav>
          </section>

          <section className="surface p-5">
            <h2 className="label-overline mb-4">Reputation</h2>
            {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}
            <p className="mt-3 text-xs text-slate-500">Ratings come from contributors who worked on your projects.</p>
          </section>

          <section className="rounded-xl border border-accent-400/20 bg-accent-500/5 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-accent-400" />
              <h3 className="font-display text-sm font-semibold text-white">Hiring tip</h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Review verified contributions on student profiles before reaching out — the green badge means their work on a project was confirmed by the project owner.
            </p>
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
