import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, User } from 'lucide-react';
import type { ProjectMember } from '@/types';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';

export type NewTaskInput = { title: string; description: string; acceptance_criteria: string; assignee_id: string; due_date: string };

/** New-task form with the General task / Assign to a member choice (moved unchanged from TaskManagementPanel). */
export function CreateTaskForm({
  members,
  onClose,
  onCreate,
  busy,
}: {
  members: ProjectMember[];
  onClose: () => void;
  onCreate: (input: NewTaskInput) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [mode, setMode] = useState<'open' | 'assign'>('open');
  const [dueDate, setDueDate] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleSubmit = () => {
    if (!title.trim() || (mode === 'assign' && !assigneeId)) return;
    onCreate({ title: title.trim(), description, acceptance_criteria: criteria, assignee_id: mode === 'assign' ? assigneeId : '', due_date: dueDate });
  };

  return (
    <div ref={formRef} className="surface-raised p-5 mb-3">
      <h3 className="font-display text-base font-semibold text-white mb-4">New Task</h3>

        <div className="space-y-4">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build landing page hero section"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What needs to be done?"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Acceptance Criteria</span>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={2}
              placeholder="What constitutes done?"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
          </label>

          {/* two ways to hand out a task: leave it open for the team, or give it to one member */}
          <div role="radiogroup" aria-label="Who works on this task" className="grid gap-2 sm:grid-cols-2">
            {([
              ['open', 'General task', 'Open to the team. Assign it later when someone takes it on.'],
              ['assign', 'Assign to a member', 'Pick who works on it now.'],
            ] as const).map(([k, t, d]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={mode === k}
                onClick={() => setMode(k)}
                className={`w-task-mode${mode === k ? ' on' : ''}`}
              >
                <b>{t}</b>
                <small>{d}</small>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {mode === 'assign' ? (
              <Select
                label="Assign to"
                value={assigneeId}
                onChange={setAssigneeId}
                options={[
                  { value: '', label: members.length ? 'Choose a member' : 'No members yet' },
                  ...members.map((m) => ({
                    value: m.profile_id,
                    label: `${m.profile?.display_name} (${m.role ?? 'member'})`,
                  })),
                ]}
              />
            ) : (
              <div className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Assign to</span>
                <p className="text-sm text-slate-400 py-2.5">Anyone on the team (unassigned)</p>
              </div>
            )}

            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-slate-200 focus:border-accent-400/40"
              />
            </label>
          </div>

          {members.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-signal-amber">
              <User size={14} /> No accepted team members yet. Accept join requests first to assign tasks.
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={handleSubmit} disabled={busy || !title.trim() || (mode === 'assign' && !assigneeId)} className="flex-1">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Task
          </Button>
          <Button variant="ghost" onClick={onClose} className="px-5">Cancel</Button>
        </div>
    </div>
  );
}
