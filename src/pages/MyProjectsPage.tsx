import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfileProjects } from '@/services/api';
import type { Project } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Button } from '@/components/shared/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';

export function MyProjectsPage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchProfileProjects(profile.id)
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
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
          <p className="mt-2 text-slate-400">Everything you've published, in one place.</p>
        </div>
        <Link to="/publish"><Button><Plus size={15} /> Publish a project</Button></Link>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoopLoader size={28} />
        </div>
      ) : projects.length === 0 ? (
        <div className="surface pf-card app-empty">
          <span className="pf-ic"><Sparkles size={22} /></span>
          <h3 className="pf-h4">No projects yet</h3>
          <p>Publish your first project and track its tasks, team and activity here.</p>
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05, ease: 'easeOut' }}
              >
                <ProjectCard project={p} />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
