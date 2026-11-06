import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import type { Profile } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';

interface Props {
  assignee: Profile;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: { title: string; description?: string; acceptance_criteria?: string; due_date?: string | null }, note: string) => void;
}

export function AddTaskFromChatModal({ assignee, busy, error, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate(
      { title: title.trim(), description: description.trim() || undefined, acceptance_criteria: criteria.trim() || undefined, due_date: dueDate || null },
      note,
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised shadow-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-bold text-white">Add task for {assignee.display_name}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Avatar src={assignee.avatar_url} name={assignee.display_name} size="xs" />
          Auto-assigned to {assignee.display_name}
        </p>

        <div className="space-y-3.5">
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
              rows={2}
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

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-slate-200 focus:border-accent-400/40"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Note to send with it</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Created a task: ${title || '…'}`}
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40"
            />
          </label>

          {error && <p className="text-xs text-signal-rose">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button type="button" className="btn btn-primary flex-1" disabled={busy || !title.trim()} onClick={handleSubmit}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {busy ? 'Creating…' : 'Create & assign'}
          </button>
          <button type="button" className="btn btn-ghost px-5" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
