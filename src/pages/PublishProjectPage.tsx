import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Plus, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { createProject } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
  { value: 'draft', label: 'Draft (hidden)' },
];

export function PublishProjectPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [roles, setRoles] = useState<{ title: string; description: string }[]>([{ title: '', description: '' }]);

  const [form, setForm] = useState({
    title: '',
    summary: '',
    overview: '',
    problem: '',
    target_users: '',
    category: 'Web App',
    difficulty: 'intermediate',
    project_type: 'student',
    compensation: 'open_source',
    status: 'recruiting',
    is_beginner_friendly: false,
    is_remote: true,
    cover_image_url: '',
    demo_url: '',
    repo_url: '',
    duration_weeks: '',
    time_commitment_hours: '',
    location: '',
  });

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to publish</h1>
        <p className="mt-3 text-slate-400">You need an account to publish a project.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/signin"><Button>Sign In</Button></Link>
          <Link to="/join"><Button variant="secondary">Join the Platform</Button></Link>
        </div>
      </div>
    );
  }

  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const addRole = () => setRoles([...roles, { title: '', description: '' }]);
  const removeRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));
  const setRole = (i: number, key: 'title' | 'description', value: string) =>
    setRoles(roles.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.summary.trim()) {
      setError('Title and summary are required.');
      return;
    }
    setLoading(true);
    try {
      const validRoles = roles.filter((r) => r.title.trim());
      const project = await createProject(
        profile.id,
        {
          title: form.title.trim(),
          slug: '',
          summary: form.summary.trim(),
          overview: form.overview.trim() || undefined,
          problem: form.problem.trim() || undefined,
          target_users: form.target_users.trim() || undefined,
          category: form.category,
          difficulty: form.difficulty,
          status: form.status,
          project_type: form.project_type,
          compensation: form.compensation,
          is_beginner_friendly: form.is_beginner_friendly,
          is_remote: form.is_remote,
          cover_image_url: form.cover_image_url.trim() || undefined,
          demo_url: form.demo_url.trim() || undefined,
          repo_url: form.repo_url.trim() || undefined,
          duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : undefined,
          time_commitment_hours: form.time_commitment_hours.trim() || undefined,
          location: form.location.trim() || undefined,
        },
        skills,
        validRoles.map((r) => ({ title: r.title.trim(), description: r.description.trim() || undefined })),
      );
      navigate(`/projects/${project.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-8 max-w-3xl">
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={15} /> Back to Explore
      </Link>

      <div className="mb-8">
        <span className="label-overline">Publish</span>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Publish a project</h1>
        <p className="mt-2 text-slate-400">Share your project idea or company opportunity. Recruit contributors and build a team.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basics */}
        <FormSection title="Basics">
          <Field label="Title" value={form.title} onChange={(v) => set('title', v)} placeholder="My awesome project" required />
          <Field label="Summary" value={form.summary} onChange={(v) => set('summary', v)} placeholder="A one-line description of your project" required textarea />
          <Field label="Overview" value={form.overview} onChange={(v) => set('overview', v)} placeholder="Detailed description of what you're building" textarea />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Problem (optional)" value={form.problem} onChange={(v) => set('problem', v)} placeholder="What problem does this solve?" textarea />
            <Field label="Target users (optional)" value={form.target_users} onChange={(v) => set('target_users', v)} placeholder="Who is this for?" textarea />
          </div>
        </FormSection>

        {/* Classification */}
        <FormSection title="Classification">
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Category" value={form.category} onChange={(v) => set('category', v)} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            <SelectField label="Project type" value={form.project_type} onChange={(v) => set('project_type', v)} options={PROJECT_TYPES} />
            <SelectField label="Difficulty" value={form.difficulty} onChange={(v) => set('difficulty', v)} options={DIFFICULTIES} />
            <SelectField label="Compensation" value={form.compensation} onChange={(v) => set('compensation', v)} options={COMPENSATIONS} />
            <SelectField label="Status" value={form.status} onChange={(v) => set('status', v)} options={STATUSES} />
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            <Checkbox label="Beginner-friendly" checked={form.is_beginner_friendly} onChange={(v) => set('is_beginner_friendly', v)} />
            <Checkbox label="Remote" checked={form.is_remote} onChange={(v) => set('is_remote', v)} />
          </div>
        </FormSection>

        {/* Links & logistics */}
        <FormSection title="Links & logistics">
          <Field label="Cover image URL (optional)" value={form.cover_image_url} onChange={(v) => set('cover_image_url', v)} placeholder="https://..." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Demo URL (optional)" value={form.demo_url} onChange={(v) => set('demo_url', v)} placeholder="https://..." />
            <Field label="Repository URL (optional)" value={form.repo_url} onChange={(v) => set('repo_url', v)} placeholder="https://github.com/..." />
            <Field label="Duration (weeks)" value={form.duration_weeks} onChange={(v) => set('duration_weeks', v)} placeholder="12" type="number" />
            <Field label="Time commitment" value={form.time_commitment_hours} onChange={(v) => set('time_commitment_hours', v)} placeholder="4-6 hrs/week" />
            <Field label="Location (if not remote)" value={form.location} onChange={(v) => set('location', v)} placeholder="San Francisco, CA" />
          </div>
        </FormSection>

        {/* Skills */}
        <FormSection title="Technologies & skills">
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s) => (
              <span key={s} className="chip">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="ml-1 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Type a technology and press Enter"
              className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
            />
            <Button type="button" variant="secondary" onClick={addSkill}><Plus size={14} /> Add</Button>
          </div>
        </FormSection>

        {/* Roles */}
        <FormSection title="Open roles">
          <p className="text-xs text-slate-500 mb-3">List positions you're recruiting for. Leave blank if not applicable.</p>
          <div className="space-y-3">
            {roles.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={r.title}
                  onChange={(e) => setRole(i, 'title', e.target.value)}
                  placeholder="Role title (e.g. Frontend Engineer)"
                  className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
                />
                <input
                  type="text"
                  value={r.description}
                  onChange={(e) => setRole(i, 'description', e.target.value)}
                  placeholder="Brief description (optional)"
                  className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
                />
                {roles.length > 1 && (
                  <button type="button" onClick={() => removeRole(i)} className="rounded-lg p-2.5 text-slate-500 hover:text-signal-rose hover:bg-signal-rose/10 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addRole} className="mt-2 text-sm text-accent-300 hover:text-accent-200 inline-flex items-center gap-1">
            <Plus size={14} /> Add another role
          </button>
        </FormSection>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="px-6 py-3">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Publishing...' : 'Publish Project'}
          </Button>
          <Link to="/explore">
            <Button type="button" variant="ghost" className="px-6 py-3">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-6">
      <h3 className="label-overline mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
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
    <label className={cn('flex items-center gap-2 cursor-pointer text-sm', checked ? 'text-white' : 'text-slate-400')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-ink-900 text-accent-500 focus:ring-accent-400"
      />
      {label}
    </label>
  );
}
