import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { deleteProject, updateProjectStatus } from '@/services/api';
import type { Project, ProjectStatus } from '@/types';
import { Button } from '@/components/shared/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectOverviewModal } from '@/components/projects/ProjectOverviewModal';
import { statusLabel } from '@/utils/labels';

const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'published', 'recruiting', 'in_progress', 'completed', 'archived'];
const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({ value: s, label: statusLabel[s] }));

interface Props {
  projects: Project[];
  /** Receives the updated list after a status change or delete. */
  onProjectsChange: (update: (prev: Project[]) => Project[]) => void;
  className?: string;
  renderFooter?: (project: Project) => React.ReactNode;
}

/** An owner's project cards with status change, delete and the Overview panel. */
export function ManagedProjectGrid({ projects, onProjectsChange, className = 'sm:grid-cols-2 lg:grid-cols-3', renderFooter }: Props) {
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [overviewProject, setOverviewProject] = useState<Project | null>(null);

  const handleStatusChange = async (projectId: string, status: string) => {
    setStatusUpdating(projectId);
    try {
      await updateProjectStatus(projectId, status);
      onProjectsChange((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: status as ProjectStatus } : p)));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setStatusUpdating(projectId);
    setDeleteError(null);
    try {
      await deleteProject(projectId);
      onProjectsChange((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete project.');
    } finally {
      setStatusUpdating(null);
    }
  };

  return (
    <>
      <div className={`pc-grid grid gap-5 ${className}`}>
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
                onDelete: () => { setDeleteError(null); setConfirmDelete(p.id); },
                onOverview: () => setOverviewProject(p),
              }}
            />
            {renderFooter?.(p)}
          </motion.div>
        ))}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm reveal">
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
            {deleteError && (
              <p className="mb-4 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-sm text-signal-rose">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => handleDeleteProject(confirmDelete)} disabled={statusUpdating === confirmDelete}>
                {statusUpdating === confirmDelete ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Yes, delete
              </Button>
              <Button variant="ghost" onClick={() => { setConfirmDelete(null); setDeleteError(null); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {overviewProject && (
        <ProjectOverviewModal project={overviewProject} onClose={() => setOverviewProject(null)} />
      )}
    </>
  );
}
