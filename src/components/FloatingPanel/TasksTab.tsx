import { Loader2, AlertCircle, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { TaskManagementPanel } from '@/components/projects/TaskManagementPanel';
import { Badge } from '@/components/ui/Badge';
import { statusLabel, statusTone } from '@/lib/labels';

interface Props {
  profileId: string;
}

export function TasksTab({ profileId }: Props) {
  const { projects, loading, error } = useTasks(profileId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={22} className="animate-spin text-accent-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-signal-rose">
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <ListChecks size={28} className="text-slate-600" />
        <p className="text-sm text-slate-400">Publish a project to start managing tasks here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-3 py-3">
      {projects.map((p) => (
        <div key={p.id}>
          <div className="mb-2 flex items-center gap-2">
            <Link
              to={`/projects/${p.slug}`}
              className="font-display text-sm font-semibold text-white hover:text-accent-300 transition-colors"
            >
              {p.title}
            </Link>
            <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
          </div>
          <TaskManagementPanel projectId={p.id} profileId={profileId} />
        </div>
      ))}
    </div>
  );
}
