import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfileProjects, fetchJoinedProjects } from '@/services/api';
import type { Project } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Button } from '@/components/shared/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ManagedProjectGrid } from '@/components/projects/ManagedProjectGrid';

export function MyProjectsPage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchProfileProjects(profile.id, { includeDrafts: true }).then(setProjects).catch(() => {}),
      fetchJoinedProjects(profile.id).then(setJoined).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [profile]);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to view your projects</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  const recruiting = projects.filter((p) => p.status === 'recruiting').length;
  const inProgress = projects.filter((p) => p.status === 'in_progress').length;
  const completed = projects.filter((p) => p.status === 'completed').length;

  return (
    <div className="container-page pf py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-overline">Project overview</span>
          <h1 className="mt-2 font-display text-3xl font-bold pf-name">Your projects</h1>
          <p className="mt-2 text-slate-400">Projects you own and projects you've joined, in one place.</p>
        </div>
        <Link to="/publish"><Button><Plus size={15} /> Publish a project</Button></Link>
      </div>

      <div className={loading ? undefined : 'reveal'}>
{loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoopLoader size={28} />
        </div>
      ) : projects.length === 0 && joined.length === 0 ? (
        <div className="surface pf-card app-empty">
          <span className="pf-ic"><Sparkles size={22} /></span>
          <h3 className="pf-h4">No projects yet</h3>
          <p>Publish your first project, or accept an invitation to join one. Both will show up here.</p>
          <Link to="/publish" className="btn btn-primary">Publish a project <Plus size={14} /></Link>
        </div>
      ) : (
        <>
          {joined.length > 0 && (
            <section className="mb-10">
              <h2 className="pf-h4 mb-1 flex items-center gap-2"><Users size={16} /> Projects I joined</h2>
              <p className="mb-4 text-sm text-slate-400">You're a team member here. Your assigned tasks are on your dashboard.</p>
              <div className="pc-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {joined.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </section>
          )}

          <h2 className="pf-h4 mb-4">Projects I own</h2>
          {projects.length === 0 ? (
            <div className="surface pf-card app-empty mb-6">
              <p>You haven't published a project yet.</p>
              <Link to="/publish" className="btn btn-primary">Publish a project <Plus size={14} /></Link>
            </div>
          ) : (
          <>
          <div className="pf-kpis mb-6">
            <div className="pf-kpi"><b>{projects.length}</b><span>Total projects</span></div>
            <div className="pf-kpi"><b className="c1">{recruiting}</b><span>Recruiting</span></div>
            <div className="pf-kpi"><b>{inProgress}</b><span>In progress</span></div>
            <div className="pf-kpi"><b>{completed}</b><span>Completed</span></div>
          </div>

          <ManagedProjectGrid projects={projects} onProjectsChange={setProjects} />
          </>
          )}
        </>
      )}
</div>
    </div>
  );
}
