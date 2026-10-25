import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Save, CheckCircle2, X, Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { updateProfile } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Senior', 'Lead'];
const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends only', 'Currently unavailable'];

export function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [interestInput, setInterestInput] = useState('');

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    bio: profile?.bio ?? '',
    avatar_url: profile?.avatar_url ?? '',
    banner_url: profile?.banner_url ?? '',
    location: profile?.location ?? '',
    website_url: profile?.website_url ?? '',
    github_url: profile?.github_url ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    experience_level: profile?.experience_level ?? '',
    availability: profile?.availability ?? '',
  });
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to edit your profile</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const addInterest = () => {
    const s = interestInput.trim();
    if (s && !interests.includes(s)) setInterests([...interests, s]);
    setInterestInput('');
    setSaved(false);
  };

  const removeInterest = (s: string) => {
    setInterests(interests.filter((x) => x !== s));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!form.display_name.trim()) {
      setError('Display name is required.');
      return;
    }
    const linkedin = form.linkedin_url.trim();
    if (
      linkedin &&
        !/^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(linkedin)
    ){
      setError(
          'Invalid LinkedIn URL. Use this format: https://www.linkedin.com/in/your-profile/' 
      );
      return;
    }

    setLoading(true);
    try {
      await updateProfile(profile.id, {
        display_name: form.display_name.trim(),
        bio: form.bio.trim() || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
        banner_url: form.banner_url.trim() || undefined,
        location: form.location.trim() || undefined,
        website_url: form.website_url.trim() || undefined,
        github_url: form.github_url.trim() || undefined,
        linkedin_url: form.linkedin_url.trim() || undefined,
        experience_level: form.experience_level || undefined,
        availability: form.availability || undefined,
        interests,
      });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-8 max-w-2xl">
      <Link to={`/creators/${profile.handle}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft size={15} /> Back to profile
      </Link>

      <div className="mb-8">
        <span className="label-overline">Settings</span>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Edit your profile</h1>
        <p className="mt-2 text-slate-400">Update how you appear to other members and companies on WebLoop.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner + avatar preview */}
        <div className="surface overflow-hidden">
          <div className="relative h-32">
            {form.banner_url ? (
              <img src={form.banner_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-ink-700 via-ink-800 to-ink-850" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
          </div>
          <div className="px-6 pb-6 -mt-10 flex items-end gap-4">
            <Avatar src={form.avatar_url || undefined} name={form.display_name || 'User'} size="xl" className="ring-4 ring-ink-850" />
            <div className="flex-1 pb-1">
              <h3 className="font-display text-base font-semibold text-white">{form.display_name || 'Your name'}</h3>
              <p className="text-sm text-slate-500">@{profile.handle}</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <Section title="Basic information">
          <Field label="Display name" value={form.display_name} onChange={(v) => set('display_name', v)} placeholder="Your name" required />
          <Field label="Avatar image URL" value={form.avatar_url} onChange={(v) => set('avatar_url', v)} placeholder="https://..." />
          <Field label="Banner image URL" value={form.banner_url} onChange={(v) => set('banner_url', v)} placeholder="https://... (wide image for your profile header)" />
          <Field label="Bio" value={form.bio} onChange={(v) => set('bio', v)} placeholder="Tell others about yourself" textarea />
          <Field label="Location" value={form.location} onChange={(v) => set('location', v)} placeholder="City, Country" />
        </Section>

        {/* Links */}
        <Section title="Links">
          <Field label="Website URL" value={form.website_url} onChange={(v) => set('website_url', v)} placeholder="https://..." />
          <Field label="GitHub URL" value={form.github_url} onChange={(v) => set('github_url', v)} placeholder="https://github.com/..." />
          <Field label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => set('linkedin_url', v)} placeholder="https://www.linkedin.com/in/..." />
        </Section>

        {/* Experience */}
        <Section title="Experience & availability">
          <SelectField label="Experience level" value={form.experience_level} onChange={(v) => set('experience_level', v)} options={[{ value: '', label: 'Not specified' }, ...EXPERIENCE_LEVELS.map((e) => ({ value: e, label: e }))]} />
          <SelectField label="Availability" value={form.availability} onChange={(v) => set('availability', v)} options={[{ value: '', label: 'Not specified' }, ...AVAILABILITY_OPTIONS.map((a) => ({ value: a, label: a }))]} />
        </Section>

        {/* Interests */}
        <Section title="Interests">
          <div className="flex flex-wrap gap-2 mb-3">
            {interests.map((s) => (
              <span key={s} className="chip">
                {s}
                <button type="button" onClick={() => removeInterest(s)} className="ml-1 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
            {interests.length === 0 && <span className="text-xs text-slate-500">No interests added yet.</span>}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
              placeholder="Type an interest and press Enter"
              className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
            />
            <Button type="button" variant="secondary" onClick={addInterest}><Plus size={14} /> Add</Button>
          </div>
        </Section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-signal-green/30 bg-signal-green/10 px-3 py-2.5 text-sm text-signal-green">
            <CheckCircle2 size={16} />
            <span>Profile updated successfully.</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="px-6 py-3">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Link to={`/creators/${profile.handle}`}>
            <Button type="button" variant="ghost" className="px-6 py-3">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
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
          type="text"
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
