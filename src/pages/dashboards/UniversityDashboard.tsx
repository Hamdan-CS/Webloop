import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  Inbox,
  ListChecks,
  Plus,
  ArrowRight,
  BookOpen,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WKpis, WPageHeader } from '@/components/app/ui';
import { useWorkspaceMaybe } from '@/components/app/workspaceContext';
import { useFloatingPanel } from '@/components/FloatingPanel';
import {
  fetchProfileProjects,
  fetchProfileStats,
  fetchProjectApplicationCount,
} from '@/services/api';
import type { Project } from '@/types';
import { Badge } from '@/components/shared/ui/Badge';
import { Rating, NoRating } from '@/components/shared/ui/Rating';
import { ProjectCard } from '@/components/projects/ProjectCard';

import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { statusLabel, statusTone } from '@/utils/labels';

export function UniversityDashboard() {
  const { profile, unreadMessages, pendingReviews } = useAuth();
  const { openPanel } = useFloatingPanel();
  const ws = useWorkspaceMaybe();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ avg: 0, count: 0 });
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [prs, st] = await Promise.all([
        fetchProfileProjects(profile.id, { includeDrafts: true }),
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

  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="container-page py-8">
      {/* Greeting (demo Home header) */}
      <WPageHeader
        title={`${hi}, ${profile.display_name}`}
        subtitle={`${programCount} program${programCount !== 1 ? 's' : ''} · ${totalPending} student request${totalPending !== 1 ? 's' : ''} · ${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        actions={<>
          {ws && <button type="button" className="w-btn-l" onClick={ws.openPalette}>Search <kbd>⌘K</kbd></button>}
          <Link to={`/creators/${profile.handle}`} className="w-btn-l"><GraduationCap size={15} /> View profile</Link>
          <Link to="/publish" className="w-btn-d"><Plus size={16} /> Create program</Link>
        </>}
      />

      <div className="w-grid2">
        <div className="w-col">
          {/* Programs */}
          <section className="w-box">
            <div className="w-box-h">
              <b>Capstone programs & projects</b>
              <Link to="/publish" className="sd-link"><Plus size={12} /> Create new</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-6"><LoopLoader size={24} /></div>
            ) : projects.length === 0 ? (
              <div className="w-inner w-empty">
                <BookOpen size={22} />
                <span>No programs published yet.</span>
                <Link to="/publish" className="w-btn-l w-btn-sm"><Plus size={14} /> Create your first program</Link>
              </div>
            ) : (
              <div className="pc-grid grid gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      {appCounts[p.id] > 0 && (
                        <Link to={`/creators/${profile.handle}?tab=applications`} className="sd-link amber">
                          <Inbox size={11} /> {appCounts[p.id]} students
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="w-col">
          <WKpis items={[
            { label: 'Programs', value: programCount },
            { label: 'Student requests', value: totalPending },
            { label: 'Projects', value: projects.length },
            { label: 'Rating', value: stats.count > 0 ? stats.avg.toFixed(1) : '—' },
          ]} />

          <section className="w-box">
            <div className="w-box-h"><b>University actions</b></div>
            <nav className="w-list">
              <QuickLink onClick={() => openPanel('messages')} icon={<Inbox size={15} />} label="Messages" count={unreadMessages} />
              <QuickLink onClick={() => openPanel('tasks')} icon={<ListChecks size={15} />} label="Tasks" count={pendingReviews} />
              <QuickLink to="/publish" icon={<Plus size={15} />} label="Create a capstone program" />
              <QuickLink to={`/creators/${profile.handle}?tab=applications`} icon={<Users size={15} />} label="Review student requests" count={totalPending} />
              <QuickLink to="/explore" icon={<Sparkles size={15} />} label="Browse industry projects" />
              <QuickLink to="/companies" icon={<Building2 size={15} />} label="Connect with companies" />
              <QuickLink to="/settings/profile" icon={<GraduationCap size={15} />} label="Edit university profile" />
            </nav>
          </section>

          <section className="w-box">
            <div className="w-box-h"><b>Reputation</b><small>From students and sponsors</small></div>
            {stats.count > 0 ? <Rating value={stats.avg} count={stats.count} /> : <NoRating label="No reviews yet" />}
          </section>

          <section className="w-box">
            <div className="w-box-h"><b>Program tip</b></div>
            <p className="w-muted">
              Form student teams by having students apply to your program, then track their contributions through verified participation badges on their profiles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, onClick, icon, label, count }: { to?: string; onClick?: () => void; icon: React.ReactNode; label: string; count?: number }) {
  const content = (
    <>
      <span className="w-nt-ic" style={{ width: 30, height: 30, borderRadius: 9 }}>{icon}</span>
      <span><b>{label}</b></span>
      {!!count && <span className="w-ct">{count}</span>}
      <ArrowRight size={13} />
    </>
  );
  if (to) {
    return <Link to={to} className="w-lrow">{content}</Link>;
  }
  return <button type="button" onClick={onClick} className="w-lrow">{content}</button>;
}
