import { useState } from 'react';
import { X, Loader2, AlertCircle, Save } from 'lucide-react';
import { updateProject } from '@/lib/api';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';

const CATEGORIES = ['Web App', 'Mobile App', 'Backend / Infra', 'Developer Tool', 'Game / Engine', 'ML', 'CLI'];
const PROJECT_TYPES = [
  { value: 'student', label: 'Student project' },
  { value: 'company', label: 'Company project' },
  { value: 'university', label: 'University project' },
  { value: 'open_source', label: 'Open source' },
];
const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const COMPENSATIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid_educational', label: 'Unpaid · Educational' },
  { value: 'open_source', label: 'Open source' },
];
const STATUSES = [
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'published', label: 'Published' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'draft', label: 'Draft (hidden)' },
];

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: (updated: Project) => void;
}

export function EditProjectModal({ project, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: project.title,
    summary: project.summary,
    overview: project.overview ?? '',
    problem: project.problem ?? '',
    target_users: project.target_users ?? '',
    category: project.category ?? 'Web App',
    difficulty: project.difficulty ?? 'intermediate',
    project_type: project.project_type,
    compensation: project.compensation ?? 'open_source',
    status: project.status,
    is_beginner_friendly: project.is_beginner_friendly,
    is_remote: project.is_remote,
    cover_image_url: project.cover_image_url ?? '',
    demo_url: project.demo_url ?? '',
    repo_url: project.repo_url ?? '',
    team_size: String(project.team_size),
    duration_weeks: project.duration_weeks ? String(project.duration_weeks) : '',
    time_commitment_hours: project.time_commitment_hours ?? '',
    location: project.location ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      setError('Title and summary are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        overview: form.overview.trim() || null,
        problem: form.problem.trim() || null,
        target_users: form.target_users.trim() || null,
        category: form.category,
        difficulty: form.difficulty,
        project_type: form.project_type,
        compensation: form.compensation,
        status: form.status,
        is_beginner_friendly: form.is_beginner_friendly,
        is_remote: form.is_remote,
        cover_image_url: form.cover_image_url.trim() || null,
        demo_url: form.demo_url.trim() || null,
        repo_url: form.repo_url.trim() || null,
        team_size: parseInt(form.team_size) || 0,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
        time_commitment_hours: form.time_commitment_hours.trim() || null,
        location: form.location.trim() || null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up overflow-y-auto">
      <div className="surface-raised w-full max-w-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-inherit z-10">
          <h2 className="font-display text-xl font-bold text-white">Edit Project</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <Field label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="Project title" required />
            <Field label="Summary" value={form.summary} onChange={(v) => set('summary', v)} placeholder="One-line description" required textarea />
            <Field label="Overview" value={form.overview} onChange={(v) => set('overview', v)} placeholder="Detailed description" textarea />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Problem" value={form.problem} onChange={(v) => set('problem', v)} placeholder="What problem does this solve?" textarea />
              <Field label="Target users" value={form.target_users} onChange={(v) => set('target_users', v)} placeholder="Who is this for?" textarea />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Category" value={form.category} onChange={(v) => set('category', v)} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <SelectField label="Project type" value={form.project_type} onChange={(v) => set('project_type', v)} options={PROJECT_TYPES} />
            <SelectField label="Difficulty" value={form.difficulty} onChange={(v) => set('difficulty', v)} options={DIFFICULTIES} />
            <SelectField label="Compensation" value={form.compensation} onChange={(v) => set('compensation', v)} options={COMPENSATIONS} />
            <SelectField label="Status" value={form.status} onChange={(v) => set('status', v)} options={STATUSES} />
          </div>

          <div className="flex flex-wrap gap-4">
            <Checkbox label="Beginner-friendly" checked={form.is_beginner_friendly} onChange={(v) => set('is_beginner_friendly', v)} />
            <Checkbox label="Remote" checked={form.is_remote} onChange={(v) => set('is_remote', v)} />
          </div>

          <Field label="Cover image URL" value={form.cover_image_url} onChange={(v) => set('cover_image_url', v)} placeholder="https://..." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Demo URL" value={form.demo_url} onChange={(v) => set('demo_url', v)} placeholder="https://..." />
            <Field label="Repository URL" value={form.repo_url} onChange={(v) => set('repo_url', v)} placeholder="https://github.com/..." />
            <Field label="Team size" value={form.team_size} onChange={(v) => set('team_size', v)} placeholder="0" type="number" />
            <Field label="Duration (weeks)" value={form.duration_weeks} onChange={(v) => set('duration_weeks', v)} placeholder="12" type="number" />
            <Field label="Time commitment" value={form.time_commitment_hours} onChange={(v) => set('time_commitment_hours', v)} placeholder="4-6 hrs/week" />
            <Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="San Francisco, CA" />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="px-5">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  textarea,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        {label}{required && <span className="text-accent-400"> *</span>}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors resize-y"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-slate-200 focus:border-accent-400/40 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-900">{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-ink-900 text-accent-500 focus:ring-accent-400/40"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}
