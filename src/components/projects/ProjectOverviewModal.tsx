import { useEffect } from 'react';
import type { Project } from '@/types';
import { ProjectProgressDashboard } from '@/components/projects/ProjectProgressDashboard';

interface Props {
  project: Project;
  onClose: () => void;
}

export function ProjectOverviewModal({ project, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-8 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} overview`}
    >
      <div className="mx-auto w-full max-w-6xl">
        <ProjectProgressDashboard project={project} isOwner onClose={onClose} />
      </div>
    </div>
  );
}
