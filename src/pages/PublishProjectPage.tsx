import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Plus, X, Sparkles,
  GraduationCap, Building2, Landmark, GitFork,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createProject, inviteUserToProject } from '@/services/api';
import { Button } from '@/components/shared/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { art, type ArtKind } from '@/data/homeArt';
import { compensationLabel, projectTypeLabel } from '@/utils/labels';
import { ALLOWED_PROJECT_TYPES, ALLOWED_COMPENSATIONS } from '@/utils/roles';
import type { Compensation, Difficulty, Project, ProjectType } from '@/types';
import { cn } from '@/utils/cn';

const CATEGORIES = ['Web App', 'Mobile App', 'Backend / Infra', 'Developer Tool', 'Game / Engine', 'ML', 'CLI'];
const CATEGORY_ART: Record<string, ArtKind> = {
  'Web App': 'dash', 'Mobile App': 'phones', 'Backend / Infra': 'cubes', 'Developer Tool': 'code',
  'Game / Engine': 'pixel', ML: 'neural', CLI: 'rays',
};
const PROJECT_TYPES = [
  { value: 'student', label: 'Student project', hint: 'Personal or with a team', icon: GraduationCap },
  { value: 'company', label: 'Company project', hint: 'Real product work', icon: Building2 },
  { value: 'university', label: 'University project', hint: 'Research or coursework', icon: Landmark },
  { value: 'open_source', label: 'Open source', hint: 'Public, community-led', icon: GitFork },
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
const SUGGEST = ['React', 'TypeScript', 'Node.js', 'Python', 'Supabase', 'Tailwind', 'PostgreSQL', 'Figma', 'Swift', 'Go'];
const STEPS = ['Basics', 'Type & level', 'Team & links', 'Review'];

const hashStr = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return (h % 6) + 1;
};

type Form = {
  title: string; summary: string; overview: string; problem: string; target_users: string;
  category: string; difficulty: string; project_type: string; compensation: string; status: string;
  is_beginner_friendly: boolean; is_remote: boolean; scope: string;
  cover_image_url: string; demo_url: string; repo_url: string;
  duration_weeks: string; time_commitment_hours: string; location: string;
};

export function PublishProjectPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [roles, setRoles] = useState<{ title: string; description: string }[]>([{ title: '', description: '' }]);
  const [invites, setInvites] = useState<string[]>(['']);
  const [inviteResults, setInviteResults] = useState<{ email: string; ok: boolean; error?: string }[]>([]);
  const [publishedProject, setPublishedProject] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>({
    title: '', summary: '', overview: '', problem: '', target_users: '',
    category: 'Web App', difficulty: 'intermediate', project_type: 'student',
    compensation: 'open_source', status: 'recruiting',
    is_beginner_friendly: false, is_remote: true, scope: 'team',
    cover_image_url: '', demo_url: '', repo_url: '',
    duration_weeks: '', time_commitment_hours: '', location: '',
  });

  const personal = form.project_type === 'student' && form.scope === 'personal';
  const checks = useMemo(() => {
    const validRoles = roles.filter((r) => r.title.trim());
    return [
      { k: 'title', label: 'Project title', ok: !!form.title.trim(), req: true, step: 0 },
      { k: 'summary', label: 'One-line summary', ok: !!form.summary.trim(), req: true, step: 0 },
      { k: 'overview', label: 'Detailed overview', ok: !!form.overview.trim(), req: false, step: 0 },
      { k: 'problem', label: 'Problem & target users', ok: !!(form.problem.trim() || form.target_users.trim()), req: false, step: 0 },
      { k: 'skills', label: 'Technologies', ok: skills.length > 0, req: false, step: 2 },
      ...(personal ? [] : [{ k: 'roles', label: 'Open roles', ok: validRoles.length > 0, req: false, step: 2 }]),
      { k: 'cover', label: 'Cover image', ok: !!form.cover_image_url.trim(), req: false, step: 2 },
    ];
  }, [form, skills, roles, personal]);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  const draft: Project = useMemo(() => ({
    id: 'draft', owner_id: profile?.id ?? '',
    title: form.title.trim() || 'Your project title',
    slug: 'draft',
    summary: form.summary.trim() || 'Your one-line summary will appear here as you type.',
    overview: form.overview || null, problem: form.problem || null, target_users: form.target_users || null,
    category: form.category, difficulty: form.difficulty as Difficulty,
    status: form.status === 'draft' ? 'draft' : (form.status as Project['status']),
    project_type: form.project_type as ProjectType,
    compensation: form.compensation as Compensation,
    is_beginner_friendly: form.is_beginner_friendly, is_remote: form.is_remote,
    cover_image_url: form.cover_image_url.trim() || art(CATEGORY_ART[form.category] ?? 'dash', hashStr(form.title)),
    demo_url: null, repo_url: null, team_size: personal ? 1 : 0,
    duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null,
    time_commitment_hours: form.time_commitment_hours || null, location: form.location || null,
    stars_count: 0, published_at: null, is_demo: false, created_at: '',
    owner: profile ?? undefined,
    skills: skills.map((s, i) => ({ id: `s${i}`, project_id: 'draft', name: s, category: null })),
  }) as Project, [form, skills, profile, personal]);

  const allowedTypes = profile ? ALLOWED_PROJECT_TYPES[profile.creator_type] : ALLOWED_PROJECT_TYPES.student;
  const allowedComps = profile ? ALLOWED_COMPENSATIONS[profile.creator_type] : ALLOWED_COMPENSATIONS.student;

  // Keep the selected project type / compensation valid for this account's creator_type
  // (e.g. a student account can't publish a Company/University project or offer "Paid").
  useEffect(() => {
    if (!profile) return;
    setForm((f) => {
      const typeOk = allowedTypes.includes(f.project_type as ProjectType);
      const compOk = allowedComps.includes(f.compensation as Compensation);
      if (typeOk && compOk) return f;
      return {
        ...f,
        project_type: typeOk ? f.project_type : allowedTypes[0],
        compensation: compOk ? f.compensation : allowedComps[0],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.creator_type]);

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

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const addSkill = (v?: string) => {
    const s = (v ?? skillInput).trim();
    if (s && !skills.some((x) => x.toLowerCase() === s.toLowerCase())) setSkills([...skills, s]);
    setSkillInput('');
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));
  const addRole = () => setRoles([...roles, { title: '', description: '' }]);
  const removeRole = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));
  const setRole = (i: number, key: 'title' | 'description', value: string) =>
    setRoles(roles.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const addInvite = () => setInvites([...invites, '']);
  const removeInvite = (i: number) => setInvites(invites.filter((_, idx) => idx !== i));
  const setInvite = (i: number, value: string) => setInvites(invites.map((e, idx) => (idx === i ? value : e)));

  const basicsOk = !!form.title.trim() && !!form.summary.trim();
  const goNext = () => {
    if (step === 0 && !basicsOk) { setTouched(true); return; }
    setStep((s) => Math.min(3, s + 1));
  };
  const goTo = (i: number) => {
    if (i > 0 && !basicsOk) { setTouched(true); setStep(0); return; }
    setStep(i);
  };

  const publish = async () => {
    setError(null);
    if (!basicsOk) { setTouched(true); setStep(0); setError('Title and summary are required.'); return; }
    setLoading(true);
    try {
      const validRoles = personal ? [] : roles.filter((r) => r.title.trim());
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
          team_size: personal ? 1 : undefined,
          duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : undefined,
          time_commitment_hours: form.time_commitment_hours.trim() || undefined,
          location: form.location.trim() || undefined,
        },
        skills,
        validRoles.map((r) => ({ title: r.title.trim(), description: r.description.trim() || undefined })),
      );

      const validInvites = Array.from(new Set(invites.map((e) => e.trim()).filter(Boolean)));
      if (validInvites.length > 0) {
        const results = await Promise.all(validInvites.map(async (email) => {
          try {
            await inviteUserToProject(project.id, email, null, null);
            return { email, ok: true };
          } catch (err) {
            return { email, ok: false, error: err instanceof Error ? err.message : 'Failed to invite' };
          }
        }));
        setInviteResults(results);
        if (results.some((r) => !r.ok)) {
          setPublishedProject(project);
          return;
        }
      }
      navigate(`/projects/${project.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish project');
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step < 3 && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      goNext();
    }
  };

  const validRoles = personal ? [] : roles.filter((r) => r.title.trim());
  const hot = (k: string) => (focus === k ? 'hot' : '');
  const fp = (k: string) => ({ onFocus: () => setFocus(k), onBlur: () => setFocus('') });

  return (
    <div className="container-page pf pub py-8">
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-5">
        <ArrowLeft size={15} /> Back to Explore
      </Link>
      <div className="mb-6">
        <span className="label-overline">Publish</span>
        <h1 className="mt-2 font-display text-3xl font-bold text-white pf-name">Publish a project</h1>
        <p className="mt-2 text-slate-400">Fill in a few steps — your project card builds itself on the right as you type.</p>
      </div>

      <ol className="pub-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" className={cn('pub-step', i === step && 'on', i < step && 'done')} onClick={() => goTo(i)} aria-current={i === step ? 'step' : undefined}>
              <span className="pub-step-n">{i < step ? <Check size={13} /> : i + 1}</span>
              <span className="pub-step-t">{s}</span>
            </button>
          </li>
        ))}
        <span className="pub-steps-bar" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </ol>

      <div className="pub-grid">
        <div className="surface pf-card pub-card" onKeyDown={onKey}>
          <div className="pub-pane dpane" key={step}>
            {step === 0 && (
              <>
                <StepHead n="Step 1" title="What are you building?" sub="Start with the essentials — people decide to join from these." />
                <PField label="Project title" req count={form.title.length} max={70} err={touched && !form.title.trim() ? 'Give your project a title' : ''}>
                  <input className={cn('pub-in', touched && !form.title.trim() && 'bad')} maxLength={70} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. CampusConnect — study groups, matched" autoFocus {...fp('title')} />
                </PField>
                <PField label="One-line summary" req count={form.summary.length} max={140} err={touched && !form.summary.trim() ? 'Add a short summary' : ''}>
                  <input className={cn('pub-in', touched && !form.summary.trim() && 'bad')} maxLength={140} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="What it does, in one sentence" {...fp('summary')} />
                </PField>
                <PField label="Overview" hint="Optional">
                  <textarea className="pub-in" rows={4} value={form.overview} onChange={(e) => set('overview', e.target.value)} placeholder="Describe what you're building and where it's going" {...fp('overview')} />
                </PField>
                <div className="pub-two">
                  <PField label="Problem" hint="Optional">
                    <textarea className="pub-in" rows={3} value={form.problem} onChange={(e) => set('problem', e.target.value)} placeholder="What problem does it solve?" {...fp('problem')} />
                  </PField>
                  <PField label="Target users" hint="Optional">
                    <textarea className="pub-in" rows={3} value={form.target_users} onChange={(e) => set('target_users', e.target.value)} placeholder="Who is it for?" {...fp('users')} />
                  </PField>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <StepHead n="Step 2" title="Type & level" sub="Help the right contributors find you." />
                <div className="pub-lbl">Project type</div>
                <div className="pub-types">
                  {PROJECT_TYPES.filter((t) => allowedTypes.includes(t.value as ProjectType)).map((t) => (
                    <button type="button" key={t.value} className={cn('pub-type', form.project_type === t.value && 'on')} onClick={() => set('project_type', t.value)}>
                      <t.icon size={18} />
                      <b>{t.label}</b>
                      <small>{t.hint}</small>
                    </button>
                  ))}
                </div>
                {form.project_type === 'student' && (
                  <>
                    <div className="pub-lbl">Is it personal or a team project?</div>
                    <Seg value={form.scope} options={[{ value: 'personal', label: 'Personal project' }, { value: 'team', label: 'Team project' }]} onChange={(v) => set('scope', v)} />
                  </>
                )}
                <div className="pub-lbl">Category</div>
                <div className="pills">
                  {CATEGORIES.map((c) => (
                    <button type="button" key={c} className={cn('pill', form.category === c && 'on')} onClick={() => set('category', c)}>{c}</button>
                  ))}
                </div>
                <div className="pub-lbl">Difficulty</div>
                <Seg value={form.difficulty} options={DIFFICULTIES} onChange={(v) => set('difficulty', v)} />
                <div className="pub-lbl">Compensation</div>
                <Seg value={form.compensation} options={COMPENSATIONS.filter((c) => allowedComps.includes(c.value as Compensation))} onChange={(v) => set('compensation', v)} />
                <div className="pub-lbl">Visibility</div>
                <Seg value={form.status} options={STATUSES} onChange={(v) => set('status', v)} />
                <div className="pub-toggles">
                  <Toggle label="Beginner-friendly" sub="Show a badge for newcomers" on={form.is_beginner_friendly} onChange={(v) => set('is_beginner_friendly', v)} />
                  <Toggle label="Remote" sub="Contributors can join from anywhere" on={form.is_remote} onChange={(v) => set('is_remote', v)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <StepHead n="Step 3" title="Team & links" sub="Tell people what stack you use and who you need." />
                <PField label="Technologies" hint="Press Enter to add">
                  <div className="pub-add">
                    <input className="pub-in" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addSkill(); } }} placeholder="Type a technology…" {...fp('skills')} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addSkill()}><Plus size={14} /> Add</button>
                  </div>
                  {skills.length > 0 && (
                    <div className="pub-chips">
                      {skills.map((s) => (
                        <span key={s} className="pub-skill">{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => removeSkill(s)}><X size={12} /></button></span>
                      ))}
                    </div>
                  )}
                  <div className="pub-sugg">
                    {SUGGEST.filter((s) => !skills.includes(s)).slice(0, 8).map((s) => (
                      <button type="button" key={s} onClick={() => addSkill(s)}>+ {s}</button>
                    ))}
                  </div>
                </PField>
                {!personal && <PField label="Open roles" hint="Who are you looking for?">
                  <div className="pub-roles">
                    {roles.map((r, i) => (
                      <div key={i} className="pub-role">
                        <input className="pub-in" value={r.title} onChange={(e) => setRole(i, 'title', e.target.value)} placeholder="Role, e.g. Frontend Engineer" {...fp('roles')} />
                        <input className="pub-in" value={r.description} onChange={(e) => setRole(i, 'description', e.target.value)} placeholder="Short description (optional)" {...fp('roles')} />
                        {roles.length > 1 && <button type="button" className="pub-x" aria-label="Remove role" onClick={() => removeRole(i)}><X size={15} /></button>}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sd-link" onClick={addRole}><Plus size={13} /> Add another role</button>
                </PField>}
                {!personal && <PField label="Invite teammates" hint="Add their email — sent once you publish">
                  <div className="pub-roles">
                    {invites.map((email, i) => (
                      <div key={i} className="pub-role">
                        <input type="email" className="pub-in" value={email} onChange={(e) => setInvite(i, e.target.value)} placeholder="teammate@example.com" {...fp('invites')} />
                        {invites.length > 1 && <button type="button" className="pub-x" aria-label="Remove invite" onClick={() => removeInvite(i)}><X size={15} /></button>}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sd-link" onClick={addInvite}><Plus size={13} /> Add another invite</button>
                </PField>}
                <PField label="Cover image URL" hint="Optional — we generate one if empty">
                  <input className="pub-in" value={form.cover_image_url} onChange={(e) => set('cover_image_url', e.target.value)} placeholder="https://…" {...fp('cover')} />
                </PField>
                <div className="pub-two">
                  <PField label="Demo URL" hint="Optional"><input className="pub-in" value={form.demo_url} onChange={(e) => set('demo_url', e.target.value)} placeholder="https://…" /></PField>
                  <PField label="Repository URL" hint="Optional"><input className="pub-in" value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} placeholder="https://github.com/…" /></PField>
                  <PField label="Duration (weeks)"><input className="pub-in" type="number" min={1} value={form.duration_weeks} onChange={(e) => set('duration_weeks', e.target.value)} placeholder="12" {...fp('meta')} /></PField>
                  <PField label="Time commitment"><input className="pub-in" value={form.time_commitment_hours} onChange={(e) => set('time_commitment_hours', e.target.value)} placeholder="4–6 hrs/week" {...fp('meta')} /></PField>
                </div>
                {!form.is_remote && (
                  <PField label="Location"><input className="pub-in" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="San Francisco, CA" {...fp('meta')} /></PField>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <StepHead n="Step 4" title="Review & publish" sub="One last look. You can edit everything later." />
                <ul className="pub-checks">
                  {checks.map((c) => (
                    <li key={c.k} className={c.ok ? 'ok' : ''}>
                      <span className="pub-ck">{c.ok ? <Check size={12} /> : null}</span>
                      <span>{c.label}{c.req && <em> required</em>}</span>
                      {!c.ok && <button type="button" onClick={() => setStep(c.step)}>Add</button>}
                    </li>
                  ))}
                </ul>
                {form.status === 'draft' && <div className="pub-note">This will be saved as a draft — only you can see it until you change its visibility.</div>}
                {publishedProject && inviteResults.length > 0 && (
                  <div className="pub-note">
                    <p>Your project was published. Here's how the invites went:</p>
                    <ul className="pub-checks" style={{ marginTop: 8 }}>
                      {inviteResults.map((r) => (
                        <li key={r.email} className={r.ok ? 'ok' : ''}>
                          <span className="pub-ck">{r.ok ? <Check size={12} /> : null}</span>
                          <span>{r.email}{!r.ok && ` — ${r.error}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {error && (
                  <div className="pub-err"><AlertCircle size={16} /><span>{error}</span></div>
                )}
              </>
            )}
          </div>

          <div className="pub-nav">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button>
            ) : (
              <Link to="/explore" className="btn btn-ghost">Cancel</Link>
            )}
            {publishedProject ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/projects/${publishedProject.slug}`)}>
                Go to project <ArrowRight size={15} />
              </button>
            ) : step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>Continue <ArrowRight size={15} /></button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={loading} onClick={publish}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={15} />}
                {loading ? 'Publishing…' : 'Publish project'}
              </button>
            )}
          </div>
        </div>

        <aside className="pub-prev" aria-label="Live preview">
          <div className="pub-prev-hd">
            <span><i className="live-dot" /> Live preview</span>
            <b>{score}% complete</b>
          </div>
          <div className="pub-score"><i style={{ width: `${score}%` }} /></div>

          <div className={cn('pub-blk', hot('title'), hot('summary'))}>
            <ProjectCard project={draft} onClick={() => undefined} />
          </div>

          <div className="surface pf-card pub-page">
            <div className="pub-page-lbl">On the project page</div>
            <h3 className={cn('pub-p-title', !form.title.trim() && 'pv-skel w70')} key={`t${!!form.title.trim()}`}>{form.title.trim() || ' '}</h3>
            <div className="pub-meta">
              <span className="pill on">{personal ? 'Personal project' : projectTypeLabel[form.project_type as ProjectType]}</span>
              <span className="pill">{form.category}</span>
              <span className="pill">{DIFFICULTIES.find((d) => d.value === form.difficulty)?.label}</span>
              <span className="pill">{compensationLabel[form.compensation as Compensation]}</span>
              <span className="pill">{form.is_remote ? 'Remote' : form.location || 'On-site'}</span>
              {form.duration_weeks && <span className="pill">{form.duration_weeks} wks</span>}
              {form.time_commitment_hours && <span className="pill">{form.time_commitment_hours}</span>}
            </div>

            <PreBlock cls={hot('overview')} title="About" text={form.overview} />
            <PreBlock cls={hot('problem')} title="Problem" text={form.problem} />
            <PreBlock cls={hot('users')} title="Target users" text={form.target_users} />

            <div className={cn('pub-pv', hot('skills'))}>
              <h5>Technologies</h5>
              {skills.length ? <div className="ref-tags">{skills.map((s) => <span key={s} className="ref-tag pv-in">{s}</span>)}</div> : <span className="pv-skel w50" />}
            </div>
            {!personal && <div className={cn('pub-pv', hot('roles'))}>
              <h5>Open roles</h5>
              {validRoles.length ? validRoles.map((r, i) => (
                <div key={i} className="pub-prole pv-in"><b>{r.title}</b>{r.description && <small>{r.description}</small>}</div>
              )) : <span className="pv-skel w60" />}
            </div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreBlock({ title, text, cls }: { title: string; text: string; cls: string }) {
  const has = !!text.trim();
  return (
    <div className={cn('pub-pv', cls)}>
      <h5>{title}</h5>
      {has ? <p className="pv-in" key="y">{text.length > 220 ? `${text.slice(0, 217)}…` : text}</p> : <><span className="pv-skel w80" /><span className="pv-skel w60" /></>}
    </div>
  );
}

function StepHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="pub-head">
      <span className="label-overline">{n}</span>
      <h2 className="pf-h4">{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

function PField({ label, req, hint, count, max, err, children }: {
  label: string; req?: boolean; hint?: string; count?: number; max?: number; err?: string; children: React.ReactNode;
}) {
  return (
    <div className="pub-fld">
      <div className="pub-lbl">
        <span>{label}{req && <em> *</em>}</span>
        {hint && <small>{hint}</small>}
        {max != null && <small>{count}/{max}</small>}
      </div>
      {children}
      {err && <div className="pub-bad">{err}</div>}
    </div>
  );
}

function Seg({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="pub-seg" role="radiogroup">
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.value} key={o.value} className={cn(value === o.value && 'on')} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={cn('pub-toggle', on && 'on')} onClick={() => onChange(!on)}>
      <span className="pub-sw"><i /></span>
      <span><b>{label}</b><small>{sub}</small></span>
    </button>
  );
}
