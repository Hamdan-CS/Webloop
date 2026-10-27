import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Github,
  Globe,
  Linkedin,
  Loader2,
  MapPin,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { updateProfile } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { getDashboardPath } from '@/lib/roles';

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Senior', 'Lead'];
const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends only', 'Currently unavailable'];
const SKILL_SUGGESTIONS = ['React', 'TypeScript', 'Python', 'SQL', 'Figma', 'Git', 'Machine learning', 'Open source'];

const STEPS = ['Basics', 'Photos', 'About you', 'Links', 'Skills'] as const;
const STEP_NOTES = [
  'The one required step — just your name and a short intro.',
  'Optional — initials show until you add a photo.',
  'Optional — add what helps people place you.',
  'Optional — paste a link, or just the address.',
  'Optional — type a skill and press Enter.',
];

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

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

/** Splits text into per-character spans so only the newly-typed tail animates in. */
function AnimatedName({ text, placeholder }: { text: string; placeholder: string }) {
  const prevRef = useRef('');
  const prev = prevRef.current;
  const appended = text.indexOf(prev) === 0 && text.length >= prev.length;
  prevRef.current = text;

  if (!text) return <span className="text-white/20">{placeholder}</span>;

  return (
    <>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className={i >= prev.length && appended ? 'inline-block animate-char-in' : 'inline-block'}
          style={i >= prev.length && appended ? { animationDelay: `${Math.min(i - prev.length, 10) * 25}ms` } : undefined}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  );
}

export function BuildProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const [step, setStep] = useState(1);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState<'next' | 'save' | 'finish' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [touched, setTouched] = useState<{ name?: boolean; bio?: boolean }>({});

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [experience, setExperience] = useState(profile?.experience_level ?? '');
  const [availability, setAvailability] = useState(profile?.availability ?? '');
  const [website, setWebsite] = useState(profile?.website_url ?? '');
  const [github, setGithub] = useState(profile?.github_url ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '');
  const [linkErrors, setLinkErrors] = useState<{ website?: string; github?: string; linkedin?: string }>({});
  const [skills, setSkills] = useState<string[]>(profile?.interests ?? []);
  const [skillInput, setSkillInput] = useState('');

  // Subtle pointer tilt on the preview stage (desktop, fine pointer, motion allowed only).
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(x * 3.2).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * 2.4).toFixed(2)}deg`);
    };
    const onLeave = () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
    };
  }, [reduceMotion]);

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const nameOk = name.trim().length >= 2;
  const bioOk = bio.trim().length >= 20;
  const requiredDone = (nameOk ? 1 : 0) + (bioOk ? 1 : 0);

  const completion = useMemo(() => {
    const optionalFlags = [
      !!avatarUrl.trim(),
      !!bannerUrl.trim(),
      !!location.trim(),
      !!experience,
      !!availability,
      !!website.trim(),
      !!github.trim(),
      !!linkedin.trim(),
      skills.length > 0,
    ];
    const optDone = optionalFlags.filter(Boolean).length;
    return Math.round((requiredDone / 2) * 55 + (optDone / optionalFlags.length) * 45);
  }, [avatarUrl, bannerUrl, location, experience, availability, website, github, linkedin, skills, requiredDone]);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to build your profile</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  function gateBasics(): boolean {
    setTouched({ name: true, bio: true });
    if (!nameOk || !bioOk) {
      setStep(1);
      showToast(!nameOk && !bioOk ? '2 required fields left.' : '1 required field left.');
      return false;
    }
    return true;
  }

  async function persist(): Promise<boolean> {
    setError(null);
    const w = normalizeUrl(website);
    const g = normalizeUrl(github, 'github.com');
    const l = normalizeUrl(linkedin, 'linkedin.com');
    const errs = { website: w.error ?? undefined, github: g.error ?? undefined, linkedin: l.error ?? undefined };
    setLinkErrors(errs);
    if (w.error || g.error || l.error) {
      setStep(4);
      return false;
    }

    try {
      await updateProfile(profile!.id, {
        display_name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
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
    }
  }

  const goNext = async () => {
    if (step === 1 && !gateBasics()) return;
    if (step === STEPS.length) return finish();
    if (step === 4) {
      setBusy('next');
      const ok = await persist();
      setBusy(null);
      if (!ok) return;
    }
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const finish = async () => {
    if (!gateBasics()) return;
    setBusy('finish');
    const ok = await persist();
    setBusy(null);
    if (ok) navigate(getDashboardPath(profile.creator_type), { replace: true });
  };

  const skip = async () => {
    setBusy('skip');
    await persist();
    setBusy(null);
    navigate(getDashboardPath(profile.creator_type), { replace: true });
  };

  const saveAndContinueLater = async () => {
    setBusy('save');
    const ok = await persist();
    setBusy(null);
    showToast(ok ? 'Progress saved. You can pick this up later.' : 'Couldn’t save — check the highlighted fields.');
  };

  const goStep = (n: number) => {
    if (n > 1 && (!nameOk || !bioOk)) {
      gateBasics();
      return;
    }
    setStep(n);
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

  const name_ = name.trim();
  const initials = name_
    ? name_.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '';

  return (
    <div className="container-page py-8 pb-28 lg:pb-8">
      <div className="mb-6">
        <span className="label-overline">Student onboarding</span>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-white">Build your profile</h1>
          <div className="flex items-center gap-4">
            <button type="button" onClick={saveAndContinueLater} disabled={busy !== null} className="text-xs font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50">
              {busy === 'save' ? <Loader2 size={13} className="inline animate-spin" /> : 'Save & continue later'}
            </button>
            <button type="button" onClick={skip} disabled={busy !== null} className="text-xs font-medium text-slate-500 hover:text-white transition-colors disabled:opacity-50">
              Skip for now
            </button>
          </div>
        </div>
        <p className="mt-2 text-slate-400">Show companies and teammates who you are.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 max-w-2xl" role="tablist" aria-label="Profile steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step || (n === 1 && nameOk && bioOk && step > 1);
          const cur = n === step;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={cur}
              onClick={() => goStep(n)}
              className="flex-1 min-w-0 text-left"
            >
              <span className={cn('block h-1 rounded-full mb-2 transition-colors', cur || done ? 'bg-accent-400' : 'bg-white/10')} />
              <span className={cn('block truncate text-[11px] font-semibold uppercase tracking-wide', cur ? 'text-white' : done ? 'text-accent-300' : 'text-slate-500')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Step {step} of {STEPS.length}. {STEP_NOTES[step - 1]}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Form panel */}
        <div className={cn('surface-raised p-6', mobileView !== 'edit' && 'hidden lg:block')}>
          {step === 1 && (
            <Section title="The basics" sub="What people see first.">
              <Field label="Display name" value={name} onChange={setName} placeholder="e.g. Amina Rahman" required error={touched.name && !nameOk ? 'Add the name you want shown on your profile.' : undefined} onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
              <Field
                label="Short introduction"
                value={bio}
                onChange={setBio}
                placeholder="What you study, what you enjoy building, and what you’re looking for."
                textarea
                maxLength={280}
                required
                error={touched.bio && !bioOk ? 'Write at least 20 characters so people know who you are.' : undefined}
                onBlur={() => setTouched((t) => ({ ...t, bio: true }))}
              />
            </Section>
          )}

          {step === 2 && (
            <Section title="Photos" sub="Skip these if you like. Initials show until you add one.">
              <Field label="Profile picture URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." />
              <Field label="Profile banner URL" value={bannerUrl} onChange={setBannerUrl} placeholder="https://... (wide image works best)" />
            </Section>
          )}

          {step === 3 && (
            <Section title="About you" sub="All optional. Add what's useful.">
              <Field label="Location" value={location} onChange={setLocation} placeholder="City, Country" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Experience level" value={experience} onChange={setExperience} options={[{ value: '', label: 'Not specified' }, ...EXPERIENCE_LEVELS.map((e) => ({ value: e, label: e }))]} />
                <Select label="Availability" value={availability} onChange={setAvailability} options={[{ value: '', label: 'Not specified' }, ...AVAILABILITY_OPTIONS.map((a) => ({ value: a, label: a }))]} />
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Links" sub="Paste a link, or just the address.">
              <Field label="Website" value={website} onChange={setWebsite} placeholder="yoursite.com" error={linkErrors.website} />
              <Field label="GitHub" value={github} onChange={setGithub} placeholder="github.com/username" error={linkErrors.github} />
              <Field label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/username" error={linkErrors.linkedin} />
            </Section>
          )}

          {step === 5 && (
            <Section title="Skills and interests" sub="Type and press Enter, or tap a suggestion.">
              <div className="flex flex-wrap items-center gap-2 min-h-[46px] rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 focus-within:border-accent-400/40 transition-colors">
                {skills.map((s) => (
                  <span key={s} className="chip animate-chip-in">
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
                      aria-pressed={active}
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

          <div className="mt-8 flex items-center gap-3 flex-wrap">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-ghost">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {step > 1 && step < STEPS.length && (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-ghost text-slate-500">
                Skip this step
              </button>
            )}
            <div className="ml-auto">
              <button type="button" onClick={goNext} disabled={busy !== null} className="btn-primary">
                {busy === 'next' || busy === 'finish' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : step === STEPS.length ? (
                  <Check size={15} />
                ) : null}
                {step === STEPS.length ? 'Complete profile' : 'Next'}
                {step < STEPS.length && <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className={cn(mobileView !== 'preview' && 'hidden lg:block')}>
          <div className="flex items-center justify-between mb-3 max-w-[640px]">
            <div>
              <h2 className="text-sm font-semibold text-white">Live preview</h2>
              <span className="text-xs text-slate-500">{requiredDone === 2 ? 'All required fields done' : `${requiredDone} of 2 required done`}</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs text-slate-500"><strong className="font-display text-sm text-white">{completion}%</strong> complete</span>
              <div className="h-2 w-28 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-accent-400 transition-[width] duration-500 ease-out" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>

          <div ref={stageRef} className="max-w-[640px] animate-stage-in" style={{ perspective: 1500 }}>
            <div
              ref={cardRef}
              className="relative"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
                transition: 'transform .25s ease-out',
              }}
            >
              {/* Layered depth cards behind the main preview, echoing the reference design */}
              <div className="absolute inset-0 rounded-[20px] border border-white/5 bg-ink-900/60" style={{ transform: 'translate3d(24px,28px,-60px)', opacity: 0.35 }} aria-hidden="true" />
              <div className="absolute inset-0 rounded-[20px] border border-white/5 bg-ink-900/60" style={{ transform: 'translate3d(12px,14px,-30px)', opacity: 0.6 }} aria-hidden="true" />

              <article className="surface relative overflow-hidden rounded-[20px] shadow-card">
                <div className="relative h-36 overflow-hidden">
                  {bannerUrl ? (
                    <img src={bannerUrl} alt="" className="h-full w-full object-cover animate-fade-in-up" key={bannerUrl} />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-accent-500/10 via-ink-800 to-ink-850" />
                  )}
                </div>
                <div className="px-6 pb-6">
                  <div className="relative -mt-12 h-24 w-24 rounded-full border-4 border-ink-900 bg-accent-500/15 overflow-hidden grid place-items-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover animate-avatar-in" key={avatarUrl} />
                    ) : initials ? (
                      <span className="font-display text-2xl font-bold text-accent-300 animate-avatar-in" key={initials}>{initials}</span>
                    ) : (
                      <User size={38} className="text-accent-300/60" />
                    )}
                  </div>

                  <h2 className="mt-3 font-display text-2xl font-bold text-white leading-tight min-h-[32px]">
                    <AnimatedName text={name_} placeholder="Your name" />
                  </h2>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[12px] font-semibold text-ink-950">Student</span>
                    {experience && (
                      <span key={experience} className="animate-pop-in inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-semibold text-slate-200">{experience}</span>
                    )}
                    {availability && (
                      <span key={availability} className="animate-pop-in inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[12px] font-semibold text-slate-200">
                        <span className={cn('h-1.5 w-1.5 rounded-full', availability === 'Full-time' ? 'bg-signal-green' : availability === 'Currently unavailable' ? 'bg-slate-500' : 'bg-accent-400')} />
                        {availability}
                      </span>
                    )}
                  </div>

                  {location && (
                    <p key={location} className="animate-pop-in mt-3 flex items-center gap-1.5 text-sm text-slate-400">
                      <MapPin size={14} /> {location}
                    </p>
                  )}

                  <section className="mt-5 pt-4 border-t border-white/8">
                    <h3 className="text-[13px] font-semibold text-white mb-2">About</h3>
                    {bio.trim() ? (
                      <p key={bio} className="animate-fade-in-up text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{bio.trim()}</p>
                    ) : (
                      <div className="space-y-2" aria-hidden="true">
                        <div className="h-2 w-[94%] rounded-full bg-white/5" />
                        <div className="h-2 w-[80%] rounded-full bg-white/5" />
                        <div className="h-2 w-[58%] rounded-full bg-white/5" />
                      </div>
                    )}
                  </section>

                  <section className="mt-5 pt-4 border-t border-white/8">
                    <h3 className="text-[13px] font-semibold text-white mb-2">Skills and interests</h3>
                    {skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <span key={s} className="chip animate-chip-in">{s}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Skills you add will appear here.</p>
                    )}
                  </section>

                  <section className="mt-5 pt-4 border-t border-white/8">
                    <h3 className="text-[13px] font-semibold text-white mb-2">Links</h3>
                    {website || github || linkedin ? (
                      <div className="flex flex-wrap gap-2">
                        {website && (
                          <a key={website} href={website} target="_blank" rel="noopener noreferrer" className="animate-pop-in flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                            <Globe size={13} /> {displayUrl(website)}
                          </a>
                        )}
                        {github && (
                          <a key={github} href={github} target="_blank" rel="noopener noreferrer" className="animate-pop-in flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                            <Github size={13} /> {displayUrl(github)}
                          </a>
                        )}
                        {linkedin && (
                          <a key={linkedin} href={linkedin} target="_blank" rel="noopener noreferrer" className="animate-pop-in flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:border-accent-400/40 hover:text-accent-200 transition-colors">
                            <Linkedin size={13} /> {displayUrl(linkedin)}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No links added.</p>
                    )}
                  </section>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Edit / Preview switcher */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-1.5 border-t border-white/10 bg-ink-950/95 backdrop-blur px-3 py-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          type="button"
          onClick={() => setMobileView('edit')}
          className={cn('rounded-lg py-2.5 text-sm font-semibold transition-colors', mobileView === 'edit' ? 'bg-accent-500/15 text-accent-200' : 'text-slate-400')}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView('preview')}
          className={cn('rounded-lg py-2.5 text-sm font-semibold transition-colors', mobileView === 'preview' ? 'bg-accent-500/15 text-accent-200' : 'text-slate-400')}
        >
          Preview
        </button>
      </nav>

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-32px)] rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-ink-950 shadow-card transition-all duration-300',
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
        )}
        style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
      >
        {toast}
      </div>
    </div>
  );
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
  onBlur,
  placeholder,
  textarea,
  maxLength,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  textarea?: boolean;
  maxLength?: number;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        <span>
          {label}
          {required && <span className="ml-1.5 text-accent-400 normal-case tracking-normal">Required</span>}
        </span>
        {maxLength && <span className="text-slate-600">{value.length}/{maxLength}</span>}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
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
          onBlur={onBlur}
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
