import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Loader2,
  MapPin,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { updateProfile } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { getDashboardPath } from '@/lib/roles';

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Senior', 'Lead'];
const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends only', 'Currently unavailable'];
const SKILL_SUGGESTIONS = ['React', 'TypeScript', 'Python', 'SQL', 'Figma', 'Git', 'Machine learning', 'Open source'];

const STEPS = ['Photos', 'About you', 'Links', 'Skills'] as const;

function normalizeUrl(raw: string, host?: string): { value: string; error: string | null } {
  const v = raw.trim();
  if (!v) return { value: '', error: null };
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.hostname.indexOf('.') < 1) return { value: '', error: 'Enter a full web address, like example.com.' };
    if (host && !(u.hostname === host || u.hostname === `www.${host}` || u.hostname.endsWith(`.${host}`))) {
      return { value: '', error: `This should be a ${host} link.` };
    }
    return { value: u.href, error: null };
  } catch {
    return { value: '', error: 'That doesn’t look like a valid link.' };
  }
}

function displayUrl(href: string): string {
  try {
    const u = new URL(href);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '');
  } catch {
    return href;
  }
}

export function BuildProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [experience, setExperience] = useState(profile?.experience_level ?? '');
  const [availability, setAvailability] = useState(profile?.availability ?? '');
  const [website, setWebsite] = useState(profile?.website_url ?? '');
  const [github, setGithub] = useState(profile?.github_url ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '');
  const [linkErrors, setLinkErrors] = useState<{ website?: string; github?: string; linkedin?: string }>({});
  const [skills, setSkills] = useState<string[]>(profile?.interests ?? []);
  const [skillInput, setSkillInput] = useState('');

  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Your name';

  const completion = useMemo(() => {
    const fields = [avatarUrl, bannerUrl, bio, location, experience, availability, website, github, linkedin];
    const filled = fields.filter((f) => f.trim()).length + (skills.length > 0 ? 1 : 0);
    return Math.round((filled / (fields.length + 1)) * 100);
  }, [avatarUrl, bannerUrl, bio, location, experience, availability, website, github, linkedin, skills]);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to build your profile</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  async function persist(): Promise<boolean> {
    setError(null);
    const w = normalizeUrl(website);
    const g = normalizeUrl(github, 'github.com');
    const l = normalizeUrl(linkedin, 'linkedin.com');
    const errs = { website: w.error ?? undefined, github: g.error ?? undefined, linkedin: l.error ?? undefined };
    setLinkErrors(errs);
    if (w.error || g.error || l.error) return false;

    setSaving(true);
    try {
      await updateProfile(profile!.id, {
        avatar_url: avatarUrl.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        experience_level: experience || undefined,
        availability: availability || undefined,
        website_url: w.value || undefined,
        github_url: g.value || undefined,
        linkedin_url: l.value || undefined,
        interests: skills,
      });
      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your profile');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const goNext = async () => {
    if (step === 2) {
      const ok = await persist();
      if (!ok) return;
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };

  const finish = async () => {
    const ok = await persist();
    if (ok) navigate(getDashboardPath(profile.creator_type), { replace: true });
  };

  const skip = async () => {
    await persist();
    navigate(getDashboardPath(profile.creator_type), { replace: true });
  };

  const addSkill = (raw: string) => {
    const v = raw.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setSkillInput('');
      return;
    }
    if (skills.length >= 15) return;
    setSkills((s) => [...s, v]);
    setSkillInput('');
  };
  const removeSkill = (v: string) => setSkills((s) => s.filter((x) => x.toLowerCase() !== v.toLowerCase()));

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <span className="label-overline">Student onboarding</span>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-white">Build your profile</h1>
          <button type="button" onClick={skip} className="text-xs font-medium text-slate-500 hover:text-white transition-colors">
            Skip for now
          </button>
        </div>
        <p className="mt-2 text-slate-400">Show companies and teammates who you are. You can finish this later from Settings.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8 max-w-2xl">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={cnBar(i, step)} />
            <span className={cnLabel(i, step)}>{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Form */}
        <div className="surface-raised p-6">
          {step === 0 && (
            <Section title="Profile photos" sub="Optional — initials show until you add one.">
              <Field label="Avatar image URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
              <Field label="Banner image URL" value={bannerUrl} onChange={setBannerUrl} placeholder="https://... (wide image works best)" />
            </Section>
          )}

          {step === 1 && (
            <Section title="About you" sub="What people see on your profile.">
              <Field label="Bio" value={bio} onChange={setBio} placeholder="What you study, what you enjoy building, and what you’re looking for." textarea maxLength={280} />
              <Field label="Location" value={location} onChange={setLocation} placeholder="City, Country" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Experience level" value={experience} onChange={setExperience} options={[{ value: '', label: 'Not specified' }, ...EXPERIENCE_LEVELS.map((e) => ({ value: e, label: e }))]} />
                <Select label="Availability" value={availability} onChange={setAvailability} options={[{ value: '', label: 'Not specified' }, ...AVAILABILITY_OPTIONS.map((a) => ({ value: a, label: a }))]} />
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="Links" sub="Paste a link, or just the address.">
              <Field label="Website" value={website} onChange={setWebsite} placeholder="yoursite.com" error={linkErrors.website} />
              <Field label="GitHub" value={github} onChange={setGithub} placeholder="github.com/username" error={linkErrors.github} />
              <Field label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/username" error={linkErrors.linkedin} />
            </Section>
          )}

          {step === 3 && (
            <Section title="Skills and interests" sub="Type and press Enter, or tap a suggestion.">
              <div className="flex flex-wrap items-center gap-2 min-h-[46px] rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 focus-within:border-accent-400/40">
                {skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`} className="ml-0.5 text-slate-500 hover:text-white">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); }
                    else if (e.key === 'Backspace' && !skillInput && skills.length) removeSkill(skills[skills.length - 1]);
                  }}
                  onBlur={() => { if (skillInput.trim()) addSkill(skillInput); }}
                  placeholder="Add a skill"
                  maxLength={30}
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((s) => {
                  const active = skills.some((x) => x.toLowerCase() === s.toLowerCase());
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => (active ? removeSkill(s) : addSkill(s))}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        active ? 'border-transparent bg-accent-500/15 text-accent-200 font-medium' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20',
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {error && <p className="mt-4 text-sm text-signal-rose">{error}</p>}

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={14} /> Back
              </Button>
            )}
            <div className="ml-auto">
              <Button type="button" onClick={goNext} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : step === STEPS.length - 1 ? <Check size={15} /> : null}
                {step === STEPS.length - 1 ? 'Finish' : 'Next'}
                {step < STEPS.length - 1 && <ArrowRight size={14} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="label-overline">Live preview</span>
            <span className="text-xs text-slate-500">{completion}% complete</span>
          </div>
          <div className="surface overflow-hidden">
            <div className="relative h-28">
              {bannerUrl ? (
                <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-r from-ink-700 via-ink-800 to-ink-850" />
              )}
            </div>
            <div className="px-5 pb-5 -mt-8">
              <Avatar src={avatarUrl || undefined} name={name} size="xl" className="ring-4 ring-ink-900" />
              <h3 className="mt-3 font-display text-lg font-bold text-white">{name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="accent">Student</Badge>
                {experience && <Badge>{experience}</Badge>}
                {availability && <Badge tone="green">{availability}</Badge>}
              </div>
              {location && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin size={13} /> {location}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {bio || <span className="text-slate-500">Your bio will appear here.</span>}
              </p>
              {skills.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              )}
              {(website || github || linkedin) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[website, github, linkedin].filter(Boolean).map((href) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                      <Globe size={12} /> {displayUrl(href)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function cnBar(i: number, step: number): string {
  return cn('h-1 rounded-full mb-2 transition-colors', i <= step ? 'bg-accent-400' : 'bg-white/10');
}

function cnLabel(i: number, step: number): string {
  return cn('text-[11px] font-semibold uppercase tracking-wide', i === step ? 'text-white' : i < step ? 'text-accent-300' : 'text-slate-500');
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  maxLength?: number;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        <span>{label}</span>
        {maxLength && <span className="text-slate-600">{value.length}/{maxLength}</span>}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className={cn(
            'w-full rounded-lg border bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:bg-ink-900 transition-colors resize-y',
            error ? 'border-signal-rose/50' : 'border-white/10 focus:border-accent-400/40',
          )}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:bg-ink-900 transition-colors',
            error ? 'border-signal-rose/50' : 'border-white/10 focus:border-accent-400/40',
          )}
        />
      )}
      {error && <span className="mt-1 block text-xs text-signal-rose">{error}</span>}
    </label>
  );
}
