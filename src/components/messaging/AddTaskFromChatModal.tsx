import { useEffect, useState } from 'react';
import type { ProjectMember } from '@/types';
import { fetchProjectMembers } from '@/services/api';
import { CreateTaskForm, type NewTaskInput } from '@/components/projects/tasks/CreateTaskForm';

interface Props {
  /** Projects you own that the other person is a member of. */
  projects: { id: string; title: string }[];
  /** Pre-selected project (the chat's project, or the only shared one). */
  initialProjectId?: string;
  /** Pre-filled "Assign to" (the person you're chatting with). */
  assigneeId: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (projectId: string, input: NewTaskInput) => void;
}

/** The project board's New Task form, opened from a chat: adds a Project dropdown on top. */
export function AddTaskFromChatModal({ projects, initialProjectId, assigneeId, busy, error, onClose, onCreate }: Props) {
  const [projectId, setProjectId] = useState(initialProjectId ?? (projects.length === 1 ? projects[0].id : ''));
  const [members, setMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    if (!projectId) { setMembers([]); return; }
    let cancelled = false;
    fetchProjectMembers(projectId).then((m) => { if (!cancelled) setMembers(m); }).catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label="New task"
      onClick={onClose}
    >
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CreateTaskForm
          members={members}
          busy={busy}
          error={error}
          projects={projects}
          projectId={projectId}
          onProjectChange={setProjectId}
          defaultAssigneeId={assigneeId}
          onClose={onClose}
          onCreate={(input) => { if (projectId) onCreate(projectId, input); }}
        />
      </div>
    </div>
  );
}
