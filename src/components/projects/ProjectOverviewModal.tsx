import { X } from 'lucide-react';
import type { Project } from '@/types';
import { ProjectProgressDashboard } from '@/components/projects/ProjectProgressDashboard';

interface Props {
  project: Project;
  onClose: () => void;
}

export function ProjectOverviewModal({ project, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up overflow-y-auto">
      <div className="surface-raised shadow-card w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto p-6">
        <div className="sticky -top-6 -mx-6 -mt-6 mb-5 flex items-center justify-between gap-3 border-b border-white/8 bg-[var(--panel-solid)] px-6 py-4">
          <div>
            <p className="font-display text-lg font-bold text-white">{project.title}</p>
            <p className="text-xs text-slate-500">Project overview</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <ProjectProgressDashboard project={project} isOwner />
      </div>
    </div>
  );
}
