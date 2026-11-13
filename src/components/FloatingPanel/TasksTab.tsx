import { AlertCircle, ListChecks } from 'lucide-react';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { useTasks } from '@/hooks/useTasks';
import { ReviewInbox } from '@/components/projects/tasks/ReviewInbox';

interface Props {
  profileId: string;
}

export function TasksTab({ profileId }: Props) {
  const { projects, loading, error } = useTasks(profileId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoopLoader size={22} />
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
        <p className="text-sm text-slate-400">Publish a project to review your team’s work here.</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <ReviewInbox projects={projects} profileId={profileId} compact />
    </div>
  );
}
