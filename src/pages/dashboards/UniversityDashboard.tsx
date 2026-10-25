import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  Inbox,
  ListChecks,
  Plus,
  Star,
  ArrowRight,
  FolderGit2,
  BookOpen,
  Building2,
  Sparkles,
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

export function UniversityDashboard() {
  const { profile, unreadMessages, pendingReviews } = useAuth();
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
  const programCount = projects.filter((p) => p.project_type === 'university').length;

  return (
    <div className="container-page py-8">
      {/* Greeting */}
      <div className="surface-raised p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.display_name} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{profile.display_name}</h1>
            <Badge tone="accent">University</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            @{profile.handle} · {programCount} programs · {totalPending} student requests
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/publish"><Button><Plus size={15} /> Create Program</Button></Link>
          <Link to={`/creators/${profile.handle}`}><Button variant="secondary"><GraduationCap size={15} /> View Profile</Button></Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BookOpen size={18} />} label="Programs" value={programCount} />
        <StatCard icon={<Inbox size={18} />} label="Student Requests" value={totalPending} tone="amber" />
        <StatCard icon={<FolderGit2 size={18} />} label="Total Projects" value={projects.length} />
        <StatCard icon={<Star size={18} />} label="Avg Rating" value={stats.count > 0 ? stats.avg.toFixed(1) : '—'} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Programs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="label-overline">Capstone Programs & Projects</h2>
            <Link to="/publish" className="text-xs text-accent-300 hover:text-accent-200 inline-flex items-center gap-1">
              <Plus size={12} /> Create new
            </Link>
          </div>
          {loading ? (
            <div className="surface p-8 text-center text-sm text-slate-500">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="surface p-8 text-center">
              <BookOpen size={24} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">No programs published yet.</p>
              <Link to="/publish" className="mt-4 inline-block"><Button variant="secondary"><Plus size={14} /> Create your first program</Button></Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {projects.map((p) => (
                <div key={p.id}>
                  <ProjectCard project={p} />
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-white/8 bg-ink-900/60 px-3 py-2">
                    <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                    {appCounts[p.id] > 0 && (
                      <Link to={`/creators/${profile.handle}?tab=applications`} className="text-[11px] text-signal-amber hover:text-signal-amber/80 inline-flex items-center gap-1">
                        <Inbox size={11} /> {appCounts[p.id]} students
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
            <h2 className="label-overline mb-4">University actions</h2>
            <nav className="space-y-1.5">
              <QuickLink to={`/creators/${profile.handle}?tab=messages`} icon={<Inbox size={15} />} label="Messages" count={unreadMessages} />
              <QuickLink to={`/creators/${profile.handle}?tab=tasks`} icon={<ListChecks size={15} />} label="Tasks" count={pendingReviews} />
              <QuickLink to="/publish" icon={<Plus size={15} />} label="Create a capstone program" />
              <QuickLink to={`/creators/${profile.handle}?tab=applications`} icon={<Users size={15} />} label="Review student requests" count={Object.values(appCounts).reduce((a, b) => a + b, 0)} />
              <QuickLink to="/explore" icon={<Sparkles size={15} />} label="Browse industry projects" />
              <QuickLink to="/companies" icon={<Building2 size={15} />} label="Connect with companies" />
              <QuickLink to="/settings" icon={<GraduationCap size={15} />} label="Edit university profile" />
            </nav>
          </section>

          <section className="surface p-5">
            <h2 className="label-overline mb-4">Reputation</h2>
            {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}
            <p className="mt-3 text-xs text-slate-500">Ratings come from students and sponsors who participated in your programs.</p>
          </section>

          <section className="rounded-xl border border-signal-violet/20 bg-signal-violet/5 p-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-signal-violet" />
              <h3 className="font-display text-sm font-semibold text-white">Program tip</h3>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Form student teams by having students apply to your program — then track their contributions through verified participation badges on their profiles.
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

function QuickLink({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1">{label}</span>
      {!!count && (
        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">{count}</span>
      )}
      <ArrowRight size={13} className="text-slate-600" />
    </Link>
  );
}
