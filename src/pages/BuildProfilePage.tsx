import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Github,
  GraduationCap,
  Image as ImageIcon,
  Linkedin,
  Loader2,
  MapPin,
  Globe,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { updateProfile, fetchProfileProjects, fetchProfileContributions, fetchProfileStats } from '@/lib/api';
import { uploadProfileImage } from '@/lib/storage';
import { getDashboardPath } from '@/lib/roles';
import './BuildProfilePage.css';

const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Senior', 'Lead'];
const AVAILABILITY_OPTIONS = ['Full-time', 'Part-time', 'Weekends only', 'Currently unavailable'];
const SKILL_SUGGESTIONS = ['React', 'TypeScript', 'Python', 'SQL', 'Figma', 'Git', 'Machine learning', 'Open source'];
const ROLE_SUGGESTIONS = ['Frontend', 'Backend', 'Full-stack', 'QA', 'AI/ML', 'DevOps', 'UI/UX', 'Data'];
const LANG_SUGGESTIONS = ['English', 'Arabic', 'Polish', 'Urdu', 'Hindi', 'Bengali'];
const AVATAR_LIMIT_MB = 2;
const BANNER_LIMIT_MB = 5;

const STEPS = ['Basics', 'Photos', 'About you', 'Links', 'Skills'] as const;
const STEP_NOTES = [
  'These are the only required fields.',
  'Skip these if you like. Initials show until you add a photo.',
  "All optional. Add what's useful.",
  'Paste a link, or just the address.',
  'Type and press Enter, or tap a suggestion.',
];

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function normalizeUrl(raw: string, host?: string): { empty?: boolean; value: string; error: string | null } {
  const v = raw.trim();
  if (!v) return { empty: true, value: '', error: null };
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Only the newly-typed tail of the name animates in, like the reference preview. */
function AnimatedName({ text, placeholder }: { text: string; placeholder: string }) {
  const prevRef = useRef('');
  const prev = prevRef.current;
  const appended = text.indexOf(prev) === 0 && text.length >= prev.length;
  prevRef.current = text;

  if (!text) return <span className="bp-ph">{placeholder}</span>;
  return (
    <>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className={i >= prev.length && appended ? 'bp-c' : undefined}
          style={i >= prev.length && appended ? { animationDelay: `${Math.min(i - prev.length, 10) * 22}ms` } : undefined}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  );
}

/** Segmented pill radio-group, ported from the reference's .seg control — real radios, click-again-to-clear. */
function SegGroup({
  legend,
  options,
  value,
  onChange,
  clearable,
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
}) {
  const wasChecked = useRef<Record<string, boolean>>({});
  return (
    <div className="bp-seg" role="radiogroup" aria-label={legend}>
      {options.map((opt) => {
        const checked = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={checked}
            className={cn(checked && 'bp-checked')}
            onPointerDown={() => { wasChecked.current[opt] = checked; }}
            onClick={() => {
              if (clearable && wasChecked.current[opt]) onChange('');
              else onChange(opt);
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Tag input with chips + suggestion pills, ported from the reference's tag fields. */
function TagField({
  id,
  label,
  items,
  onChange,
  suggestions,
  placeholder,
  max,
}: {
  id: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions: string[];
  placeholder: string;
  max: number;
}) {
  const [input, setInput] = useState('');
  const [err, setErr] = useState('');
  const has = (t: string) => items.some((x) => x.toLowerCase() === t.toLowerCase());
  const add = (raw: string) => {
    const v = raw.trim().replace(/\s+/g, ' ');
    if (!v) return;
    if (has(v)) { setErr(`“${v}” is already added.`); return; }
    if (items.length >= max) { setErr(`You can add up to ${max}.`); return; }
    setErr('');
    onChange([...items, v]);
    setInput('');
  };
  const remove = (t: string) => { onChange(items.filter((x) => x.toLowerCase() !== t.toLowerCase())); setErr(''); };

  return (
    <div className="bp-field">
      <label className="bp-lab" htmlFor={id}><span>{label}</span><span className="bp-opt">Optional</span></label>
      <div className="bp-tagbox" onClick={() => document.getElementById(id)?.focus()}>
        {items.map((t) => (
          <span key={t} className="bp-fchip">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={(e) => { e.stopPropagation(); remove(t); }}>×</button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={input}
          maxLength={30}
          placeholder={placeholder}
          onChange={(e) => { setInput(e.target.value); setErr(''); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
            else if (e.key === 'Backspace' && !input && items.length) remove(items[items.length - 1]);
          }}
          onBlur={() => { if (input.trim()) add(input); }}
        />
      </div>
      <div className="bp-sugs">
        {suggestions.map((s) => {
          const active = has(s);
          return (
            <button key={s} type="button" aria-pressed={active} onClick={() => (active ? remove(s) : add(s))}>
              {s}
            </button>
          );
        })}
      </div>
      {err && <p className="bp-err-text">{err}</p>}
    </div>
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
  const [dialog, setDialog] = useState<{ title: string; text: string; tickOn: boolean; onPrimary: () => void; primaryLabel: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [touched, setTouched] = useState<{ name?: boolean; bio?: boolean }>({});

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const avatarBlobRef = useRef<string | null>(null);

  const [bannerUrl, setBannerUrl] = useState(profile?.banner_url ?? '');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [bannerUrlInput, setBannerUrlInput] = useState('');
  const bannerBlobRef = useRef<string | null>(null);

  const [location, setLocation] = useState(profile?.location ?? '');
  const [experience, setExperience] = useState(profile?.experience_level ?? '');
  const [availability, setAvailability] = useState(profile?.availability ?? '');

  const [website, setWebsite] = useState(profile?.website_url ?? '');
  const [github, setGithub] = useState(profile?.github_url ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '');
  const [linkErrors, setLinkErrors] = useState<{ website?: string; github?: string; linkedin?: string }>({});
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(profile?.portfolio_links ?? []);
  const [portfolioInput, setPortfolioInput] = useState('');
  const [portfolioError, setPortfolioError] = useState('');

  const [skills, setSkills] = useState<string[]>(profile?.interests ?? []);
  const [roles, setRoles] = useState<string[]>(profile?.preferred_roles ?? []);
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);

  const [stats, setStats] = useState<{ projects: number; approved: number; rating: number; reviews: number } | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const [projects, contrib, rev] = await Promise.all([
        fetchProfileProjects(profile.id).catch(() => []),
        fetchProfileContributions(profile.id).catch(() => ({ total: 0, approved: 0 })),
        fetchProfileStats(profile.id).catch(() => ({ review_count: 0, avg_rating: 0 })),
      ]);
      if (!cancelled) setStats({ projects: projects.length, approved: contrib.approved, rating: rev.avg_rating, reviews: rev.review_count });
    })();
    return () => { cancelled = true; };
  }, [profile]);

  // Subtle pointer tilt on the preview stage, matching the reference's 3D card.
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduceMotion || typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--bp-ry', `${(x * 3.2).toFixed(2)}deg`);
      card.style.setProperty('--bp-rx', `${(-y * 2.4).toFixed(2)}deg`);
    };
    const onLeave = () => { card.style.setProperty('--bp-ry', '0deg'); card.style.setProperty('--bp-rx', '0deg'); };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); };
  }, [reduceMotion]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (dialog && !d.open) d.showModal();
    if (!dialog && d.open) d.close();
  }, [dialog]);

  useEffect(() => () => {
    if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current);
    if (bannerBlobRef.current) URL.revokeObjectURL(bannerBlobRef.current);
  }, []);

  // Reset scroll on step/view changes, matching the reference's goStep()/tab-click behavior.
  useEffect(() => {
    document.querySelector('.bp-stepbody')?.scrollTo(0, 0);
  }, [step]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mobileView]);

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
      !!avatarUrl.trim(), !!bannerUrl.trim(), !!location.trim(), !!experience, !!availability,
      skills.length > 0, roles.length > 0, languages.length > 0,
      !!(website || github || linkedin), portfolioLinks.length > 0,
    ];
    const optDone = optionalFlags.filter(Boolean).length;
    return Math.round((requiredDone / 2) * 60 + (optDone / optionalFlags.length) * 40);
  }, [avatarUrl, bannerUrl, location, experience, availability, skills, roles, languages, website, github, linkedin, portfolioLinks, requiredDone]);

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
      setMobileView('edit');
      showToast(!nameOk && !bioOk ? '2 required fields left.' : '1 required field left.');
      const el = document.getElementById(!nameOk ? 'bp-f-name' : 'bp-f-bio');
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      return false;
    }
    return true;
  }

  async function persist(): Promise<boolean> {
    setError(null);
    if (avatarUploading || bannerUploading) {
      setError('Still uploading an image — give it a moment and try again.');
      return false;
    }
    const w = normalizeUrl(website);
    const g = normalizeUrl(github, 'github.com');
    const l = normalizeUrl(linkedin, 'linkedin.com');
    const errs = { website: w.error ?? undefined, github: g.error ?? undefined, linkedin: l.error ?? undefined };
    setLinkErrors(errs);
    if (w.error || g.error || l.error) {
      setStep(4);
      setMobileView('edit');
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
        preferred_roles: roles,
        languages,
        portfolio_links: portfolioLinks,
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
    if (ok) {
      setDialog({
        title: 'Profile complete',
        text: 'Nice work — your public profile now shows this information. You can keep refining it any time from Settings.',
        tickOn: true,
        primaryLabel: 'Go to your dashboard',
        onPrimary: () => navigate(getDashboardPath(profile.creator_type), { replace: true }),
      });
    }
  };

  const skip = async () => {
    setBusy('skip');
    await persist();
    setBusy(null);
    setDialog({
      title: 'Skipped for now',
      text: 'Your public profile will show only what you’ve added so far. You can finish it any time from your profile settings.',
      tickOn: false,
      primaryLabel: 'Go to your dashboard',
      onPrimary: () => navigate(getDashboardPath(profile.creator_type), { replace: true }),
    });
  };

  const saveAndContinueLater = async () => {
    setBusy('save');
    const ok = await persist();
    setBusy(null);
    showToast(ok ? 'Progress saved. You can pick this up later.' : 'Couldn’t save — check the highlighted fields.');
  };

  const goStep = (n: number) => {
    if (n > 1 && (!nameOk || !bioOk)) { gateBasics(); return; }
    setStep(n);
  };

  async function handleImageFile(kind: 'avatar' | 'banner', file: File) {
    const limit = kind === 'avatar' ? AVATAR_LIMIT_MB : BANNER_LIMIT_MB;
    const setErr = kind === 'avatar' ? setAvatarError : setBannerError;
    const setUrl = kind === 'avatar' ? setAvatarUrl : setBannerUrl;
    const setUploading = kind === 'avatar' ? setAvatarUploading : setBannerUploading;
    const blobRef = kind === 'avatar' ? avatarBlobRef : bannerBlobRef;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setErr('Use a JPG, PNG or WebP image.'); return; }
    if (file.size > limit * 1048576) { setErr(`That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${limit} MB.`); return; }
    setErr('');

    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const blobUrl = URL.createObjectURL(file);
    blobRef.current = blobUrl;
    setUrl(blobUrl);
    setUploading(true);
    try {
      const publicUrl = await uploadProfileImage(user!.id, kind, file);
      setUrl(publicUrl);
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Upload failed. Try again.');
      setUrl(kind === 'avatar' ? (profile!.avatar_url ?? '') : (profile!.banner_url ?? ''));
    } finally {
      setUploading(false);
    }
  }

  function handleImageUrlCommit(kind: 'avatar' | 'banner') {
    const raw = kind === 'avatar' ? avatarUrlInput : bannerUrlInput;
    const setErr = kind === 'avatar' ? setAvatarError : setBannerError;
    const setUrl = kind === 'avatar' ? setAvatarUrl : setBannerUrl;
    const setInput = kind === 'avatar' ? setAvatarUrlInput : setBannerUrlInput;
    const r = normalizeUrl(raw);
    if (r.empty) { setErr(''); return; }
    if (r.error) { setErr(r.error); return; }
    const img = new Image();
    img.onload = () => { setErr(''); setUrl(r.value); setInput(''); };
    img.onerror = () => setErr('That link didn’t load as an image. Check that it points to a JPG, PNG or WebP.');
    img.src = r.value;
  }

  function removeImage(kind: 'avatar' | 'banner') {
    const setErr = kind === 'avatar' ? setAvatarError : setBannerError;
    const setUrl = kind === 'avatar' ? setAvatarUrl : setBannerUrl;
    const blobRef = kind === 'avatar' ? avatarBlobRef : bannerBlobRef;
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
    setErr('');
    setUrl('');
  }

  function addPortfolioLink() {
    const r = normalizeUrl(portfolioInput);
    if (r.empty) return;
    if (r.error) { setPortfolioError(r.error); return; }
    if (portfolioLinks.includes(r.value)) { setPortfolioError('You’ve already added that link.'); return; }
    if (portfolioLinks.length >= 6) { setPortfolioError('You can add up to 6 links.'); return; }
    setPortfolioError('');
    setPortfolioLinks((l) => [...l, r.value]);
    setPortfolioInput('');
  }

  const name_ = name.trim();
  const initials = initialsOf(name);
  const uploading = avatarUploading || bannerUploading;

  return (
    <div className="container-page py-6">
      <div className="bp-root" data-view={mobileView}>
        <div className="bp-shell">
          {/* LEFT — form */}
          <main className="bp-formpane">
            <div className="bp-formin">
              <header className="bp-mhead">
                <div className="bp-mrow">
                  <h1>Build your profile</h1>
                  <button type="button" className="bp-btn bp-sm bp-ghost" onClick={skip} disabled={busy !== null}>
                    {busy === 'skip' ? <Loader2 size={13} className="animate-spin" /> : 'Skip for now'}
                  </button>
                </div>
                <p className="bp-lede">Step {step} of {STEPS.length}. {STEP_NOTES[step - 1]}</p>
              </header>

              <ol className="bp-steps" aria-label="Profile steps">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const done = n < step;
                  const cur = n === step;
                  return (
                    <li key={label} className={cn(done && 'bp-done', cur && 'bp-cur')}>
                      <button type="button" aria-current={cur ? 'step' : undefined} onClick={() => goStep(n)}>
                        <span className="bp-bar" /><span className="bp-lbl">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="bp-stepbody">
                <section className={cn('bp-sec', step === 1 && 'bp-on')}>
                  <h2>The basics</h2>
                  <p className="bp-sub">What people see first.</p>

                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-name"><span>Display name</span><span className="bp-req">Required</span></label>
                    <input
                      id="bp-f-name" type="text" className={cn('bp-in', touched.name && !nameOk && 'bp-invalid')}
                      maxLength={60} value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      placeholder="e.g. Amina Rahman"
                    />
                    {touched.name && !nameOk && <p className="bp-err-text">Add the name you want shown on your profile.</p>}
                  </div>

                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-bio"><span>Short introduction <span className="bp-count">{bio.length}/280</span></span><span className="bp-req">Required</span></label>
                    <textarea
                      id="bp-f-bio" className={cn('bp-in', touched.bio && !bioOk && 'bp-invalid')}
                      maxLength={280} value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, bio: true }))}
                      placeholder="What you study, what you enjoy building, and what you’re looking for."
                    />
                    {touched.bio && !bioOk && <p className="bp-err-text">Write at least 20 characters so people know who you are.</p>}
                  </div>
                </section>

                <section className={cn('bp-sec', step === 2 && 'bp-on')}>
                  <h2>Photos</h2>
                  <p className="bp-sub">Skip these if you like. Initials show until you add a photo.</p>

                  <div className="bp-field">
                    <div className="bp-lab"><span>Profile picture</span><span className="bp-opt">Optional</span></div>
                    <div className="bp-media">
                      <div className={cn('bp-thumb bp-sq', avatarUrl && 'bp-filled')} aria-hidden="true">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <User size={24} />}
                      </div>
                      <div className="bp-mbody">
                        <div className="bp-macts">
                          <label className="bp-btn bp-sm" style={{ cursor: 'pointer' }}>
                            {avatarUploading ? <Loader2 size={13} className="animate-spin" /> : 'Upload image'}
                            <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageFile('avatar', f); }} />
                          </label>
                          {avatarUrl && <button type="button" className="bp-btn bp-sm bp-ghost" onClick={() => removeImage('avatar')}>Remove</button>}
                        </div>
                        <input
                          type="text" className="bp-in" value={avatarUrlInput}
                          onChange={(e) => { setAvatarUrlInput(e.target.value); setAvatarError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImageUrlCommit('avatar'); } }}
                          onBlur={() => handleImageUrlCommit('avatar')}
                          placeholder="or paste an image link and press Enter"
                          aria-label="Profile picture link"
                        />
                        <p className="bp-hint">JPG, PNG or WebP, up to {AVATAR_LIMIT_MB} MB.</p>
                        {avatarError && <p className="bp-err-text">{avatarError}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="bp-field">
                    <div className="bp-lab"><span>Profile banner</span><span className="bp-opt">Optional</span></div>
                    <div className="bp-media">
                      <div className={cn('bp-thumb bp-wide', bannerUrl && 'bp-filled')} aria-hidden="true">
                        {bannerUrl ? <img src={bannerUrl} alt="" /> : <ImageIcon size={20} />}
                      </div>
                      <div className="bp-mbody">
                        <div className="bp-macts">
                          <label className="bp-btn bp-sm" style={{ cursor: 'pointer' }}>
                            {bannerUploading ? <Loader2 size={13} className="animate-spin" /> : 'Upload image'}
                            <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleImageFile('banner', f); }} />
                          </label>
                          {bannerUrl && <button type="button" className="bp-btn bp-sm bp-ghost" onClick={() => removeImage('banner')}>Remove</button>}
                        </div>
                        <input
                          type="text" className="bp-in" value={bannerUrlInput}
                          onChange={(e) => { setBannerUrlInput(e.target.value); setBannerError(''); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImageUrlCommit('banner'); } }}
                          onBlur={() => handleImageUrlCommit('banner')}
                          placeholder="or paste an image link and press Enter"
                          aria-label="Banner link"
                        />
                        <p className="bp-hint">Wide image works best. JPG, PNG or WebP, up to {BANNER_LIMIT_MB} MB.</p>
                        {bannerError && <p className="bp-err-text">{bannerError}</p>}
                      </div>
                    </div>
                  </div>
                </section>

                <section className={cn('bp-sec', step === 3 && 'bp-on')}>
                  <h2>About you</h2>
                  <p className="bp-sub">All optional. Add what's useful.</p>

                  <div className="bp-field">
                    <div className="bp-lab"><span>Location</span><span className="bp-opt">Optional</span></div>
                    <input type="text" className="bp-in" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
                  </div>

                  <div className="bp-field">
                    <div className="bp-lab"><span>Experience level</span><span className="bp-opt">Optional</span></div>
                    <SegGroup legend="Experience level" options={EXPERIENCE_LEVELS} value={experience} onChange={setExperience} clearable />
                  </div>

                  <div className="bp-field">
                    <div className="bp-lab"><span>Availability</span><span className="bp-opt">Optional</span></div>
                    <SegGroup legend="Availability" options={AVAILABILITY_OPTIONS} value={availability} onChange={setAvailability} clearable />
                    <p className="bp-hint">Select again to clear.</p>
                  </div>
                </section>

                <section className={cn('bp-sec', step === 4 && 'bp-on')}>
                  <h2>Links</h2>
                  <p className="bp-sub">Paste a link, or just the address.</p>

                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-web"><span>Website</span><span className="bp-opt">Optional</span></label>
                    <div className="bp-iwrap"><Globe size={16} /><input id="bp-f-web" type="text" className={cn('bp-in', linkErrors.website && 'bp-invalid')} value={website} onChange={(e) => { setWebsite(e.target.value); setLinkErrors((x) => ({ ...x, website: undefined })); }} placeholder="yoursite.com" /></div>
                    {linkErrors.website && <p className="bp-err-text">{linkErrors.website}</p>}
                  </div>
                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-gh"><span>GitHub</span><span className="bp-opt">Optional</span></label>
                    <div className="bp-iwrap"><Github size={16} /><input id="bp-f-gh" type="text" className={cn('bp-in', linkErrors.github && 'bp-invalid')} value={github} onChange={(e) => { setGithub(e.target.value); setLinkErrors((x) => ({ ...x, github: undefined })); }} placeholder="github.com/username" /></div>
                    {linkErrors.github && <p className="bp-err-text">{linkErrors.github}</p>}
                  </div>
                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-li"><span>LinkedIn</span><span className="bp-opt">Optional</span></label>
                    <div className="bp-iwrap"><Linkedin size={16} /><input id="bp-f-li" type="text" className={cn('bp-in', linkErrors.linkedin && 'bp-invalid')} value={linkedin} onChange={(e) => { setLinkedin(e.target.value); setLinkErrors((x) => ({ ...x, linkedin: undefined })); }} placeholder="linkedin.com/in/username" /></div>
                    {linkErrors.linkedin && <p className="bp-err-text">{linkErrors.linkedin}</p>}
                  </div>
                  <div className="bp-field">
                    <label className="bp-lab" htmlFor="bp-f-proj"><span>Portfolio or project links</span><span className="bp-opt">Optional</span></label>
                    <div className="bp-addrow">
                      <input
                        id="bp-f-proj" type="text" className="bp-in" value={portfolioInput}
                        onChange={(e) => { setPortfolioInput(e.target.value); setPortfolioError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPortfolioLink(); } }}
                        placeholder="Paste a link and press Enter"
                      />
                      <button type="button" className="bp-btn" onClick={addPortfolioLink}>Add</button>
                    </div>
                    {portfolioError && <p className="bp-err-text">{portfolioError}</p>}
                    {portfolioLinks.length > 0 && (
                      <ul className="bp-plist">
                        {portfolioLinks.map((href) => (
                          <li key={href}>
                            <span>{displayUrl(href)}</span>
                            <button type="button" onClick={() => setPortfolioLinks((l) => l.filter((x) => x !== href))} aria-label={`Remove ${displayUrl(href)}`}>Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className={cn('bp-sec', step === 5 && 'bp-on')}>
                  <h2>Skills and interests</h2>
                  <p className="bp-sub">Type and press Enter, or tap a suggestion.</p>
                  <TagField id="bp-in-skills" label="Skills and interests" items={skills} onChange={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Add a skill" max={15} />
                  <TagField id="bp-in-roles" label="Preferred roles" items={roles} onChange={setRoles} suggestions={ROLE_SUGGESTIONS} placeholder="Add a role" max={8} />
                  <TagField id="bp-in-langs" label="Languages" items={languages} onChange={setLanguages} suggestions={LANG_SUGGESTIONS} placeholder="Add a language" max={8} />
                </section>
              </div>

              {error && <p className="bp-err-text" style={{ padding: '0 28px' }}>{error}</p>}

              <div className="bp-actions">
                <button type="button" className="bp-btn bp-sm bp-ghost" onClick={saveAndContinueLater} disabled={busy !== null}>
                  {busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : 'Save and continue later'}
                </button>
                <div className="bp-nav">
                  {step > 1 && <button type="button" className="bp-btn" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={14} /> Back</button>}
                  {step > 1 && step < STEPS.length && <button type="button" className="bp-btn bp-ghost" onClick={() => setStep((s) => s + 1)}>Skip this step</button>}
                  <button type="button" className="bp-btn bp-primary" onClick={goNext} disabled={busy !== null || uploading}>
                    {busy === 'next' || busy === 'finish' ? <Loader2 size={15} className="animate-spin" /> : step === STEPS.length ? <Check size={15} /> : null}
                    {step === STEPS.length ? 'Complete profile' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* RIGHT — live preview */}
          <aside className="bp-preview">
            <div className="bp-pvhead">
              <div>
                <h2>Live preview</h2>
                <span className="bp-sub-label">{requiredDone === 2 ? 'All required fields done' : `${requiredDone} of 2 required done`}</span>
              </div>
              <div className="bp-pcomp">
                <span><strong>{completion}%</strong> complete</span>
                <div className="bp-pbar" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${completion}%` }} />
                </div>
              </div>
            </div>

            <div className="bp-stage" ref={stageRef}>
              <div className="bp-card3d" ref={cardRef}>
                <div className="bp-layer bp-l2" /><div className="bp-layer bp-l1" />
                <article className="bp-profile">
                  <div className="bp-banner">{bannerUrl && <img src={bannerUrl} alt="" key={bannerUrl} />}</div>
                  <div className="bp-pbody">
                    <div className={cn('bp-avatar', (avatarUrl || initials) && 'bp-enter')} key={avatarUrl || initials}>
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : initials ? <span>{initials}</span> : <User size={36} />}
                    </div>

                    <h2 className="bp-pname"><AnimatedName text={name_} placeholder="Your name" /></h2>

                    <div className="bp-badges">
                      <span className="bp-pill bp-student"><GraduationCap size={13} /> Student</span>
                      {experience && <span className="bp-pill">{experience}</span>}
                      {availability && (
                        <span className="bp-pill">
                          <span className="bp-dot" style={{ background: availability === 'Full-time' ? 'var(--bp-ok)' : availability === 'Currently unavailable' ? 'var(--bp-muted)' : 'var(--bp-accent)' }} />
                          {availability}
                        </span>
                      )}
                    </div>

                    {location && (
                      <div className="bp-meta">
                        <p className="bp-line"><MapPin size={14} /><span>{location}</span></p>
                      </div>
                    )}

                    <section className="bp-sect">
                      <h3>About</h3>
                      {bio.trim() ? (
                        <p className="bp-bio" key={bio}>{bio.trim()}</p>
                      ) : (
                        <div className="bp-skel" aria-hidden="true"><i /><i /><i /></div>
                      )}
                    </section>

                    <section className="bp-sect">
                      <h3>Skills and interests</h3>
                      {skills.length > 0 ? (
                        <div className="bp-pchips">{skills.map((s) => <span key={s} className="bp-chip">{s}</span>)}</div>
                      ) : <p className="bp-none">Skills you add will appear here.</p>}

                      <div className="bp-twocol" style={{ marginTop: 18 }}>
                        <div>
                          <h3>Preferred roles</h3>
                          {roles.length > 0 ? (
                            <div className="bp-pchips">{roles.map((r) => <span key={r} className="bp-chip bp-role">{r}</span>)}</div>
                          ) : <p className="bp-none">No roles added.</p>}
                        </div>
                        <div>
                          <h3>Languages</h3>
                          {languages.length > 0 ? (
                            <div className="bp-pchips">{languages.map((l) => <span key={l} className="bp-chip bp-lang">{l}</span>)}</div>
                          ) : <p className="bp-none">No languages added.</p>}
                        </div>
                      </div>
                    </section>

                    <section className="bp-sect">
                      <h3>Links</h3>
                      {(website || github || linkedin) ? (
                        <div className="bp-links">
                          {website && <a className="bp-link" href={normalizeUrl(website).value || undefined} target="_blank" rel="noopener noreferrer"><Globe size={14} /><span>{displayUrl(normalizeUrl(website).value || website)}</span></a>}
                          {github && <a className="bp-link" href={normalizeUrl(github, 'github.com').value || undefined} target="_blank" rel="noopener noreferrer"><Github size={14} /><span>{displayUrl(normalizeUrl(github, 'github.com').value || github)}</span></a>}
                          {linkedin && <a className="bp-link" href={normalizeUrl(linkedin, 'linkedin.com').value || undefined} target="_blank" rel="noopener noreferrer"><Linkedin size={14} /><span>{displayUrl(normalizeUrl(linkedin, 'linkedin.com').value || linkedin)}</span></a>}
                        </div>
                      ) : <p className="bp-none">No links added.</p>}
                    </section>

                    <section className="bp-sect">
                      <h3>Work on WebLoop</h3>
                      <div className="bp-trio">
                        <div className="bp-mini"><h4>Projects</h4><p>{stats ? (stats.projects || 'No projects yet') : '—'}</p></div>
                        <div className="bp-mini"><h4>Approved contributions</h4><p>{stats ? (stats.approved || 'None yet') : '—'}</p></div>
                        <div className="bp-mini"><h4>Rating</h4><p>{stats && stats.reviews > 0 ? `${stats.rating.toFixed(1)} ★ (${stats.reviews})` : 'Not rated yet'}</p></div>
                      </div>
                      {portfolioLinks.length > 0 && (
                        <div className="bp-plinks">
                          <h4>Portfolio links</h4>
                          <ul>
                            {portfolioLinks.map((href) => (
                              <li key={href}><a href={href} target="_blank" rel="noopener noreferrer"><span>{displayUrl(href)}</span></a></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              </div>
            </div>
          </aside>
        </div>

        <nav className="bp-tabs" aria-label="Edit or preview">
          <button type="button" aria-selected={mobileView === 'edit'} onClick={() => setMobileView('edit')}>Edit</button>
          <button type="button" aria-selected={mobileView === 'preview'} onClick={() => setMobileView('preview')}>Preview</button>
        </nav>

        <div className={cn('bp-toast', toast && 'bp-on')} role="status" aria-live="polite">{toast}</div>

        <dialog ref={dialogRef} className="bp-dialog" onClose={() => setDialog(null)}>
          {dialog && (
            <>
              {dialog.tickOn && <div className="bp-tick"><Check size={20} /></div>}
              <h2>{dialog.title}</h2>
              <p>{dialog.text}</p>
              <button type="button" className="bp-btn bp-primary" onClick={() => { setDialog(null); dialog.onPrimary(); }}>{dialog.primaryLabel}</button>
            </>
          )}
        </dialog>
      </div>
    </div>
  );
}
