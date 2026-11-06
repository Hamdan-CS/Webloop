import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProfileProjects, updateProjectStatus, deleteProject } from '@/services/api';
import type { Project, ProjectStatus } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Button } from '@/components/shared/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectOverviewModal } from '@/components/projects/ProjectOverviewModal';
import { statusLabel } from '@/utils/labels';

const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'published', 'recruiting', 'in_progress', 'completed', 'archived'];
const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({ value: s, label: statusLabel[s] }));

export function MyProjectsPage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [overviewProject, setOverviewProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchProfileProjects(profile.id)
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  const handleStatusChange = async (projectId: string, status: string) => {
    setStatusUpdating(projectId);
    try {
      await updateProjectStatus(projectId, status);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: status as ProjectStatus } : p)));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setStatusUpdating(projectId);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

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
                <ProjectCard
                  project={p}
                  manage={{
                    status: p.status,
                    statusOptions: STATUS_OPTIONS,
                    statusUpdating: statusUpdating === p.id,
                    onStatusChange: (status) => handleStatusChange(p.id, status),
                    onDelete: () => setConfirmDelete(p.id),
                    onOverview: () => setOverviewProject(p),
                  }}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}

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

      {overviewProject && (
        <ProjectOverviewModal project={overviewProject} onClose={() => setOverviewProject(null)} />
      )}
    </div>
  );
}
