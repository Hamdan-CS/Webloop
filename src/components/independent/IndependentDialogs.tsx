import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Award, Flag, Loader2, Search, ThumbsUp, X } from 'lucide-react';
import type { Profile } from '@/types';
import {
  endorseSkill, recommendProjectToStudent, recommendStudentToCompany, reportContent, searchCompanies,
} from '@/services/api';
import { StudentPicker } from '@/components/teams/StudentPicker';
import { Avatar } from '@/components/shared/ui/Avatar';
import { notify } from '@/utils/notify';

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="surface-raised w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const noteField = (note: string, setNote: (v: string) => void, placeholder: string) => (
  <textarea className="pub-in mt-3" rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} aria-label="Note" />
);

/** Independent on a project page: recommend this project to a student. */
export function RecommendProjectDialog({ fromId, projectId, projectTitle, onClose }: { fromId: string; projectId: string; projectTitle: string; onClose: () => void }) {
  const [picked, setPicked] = useState<Profile[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      for (const s of picked) await recommendProjectToStudent(fromId, s.id, projectId, note);
      notify.success(picked.length === 1 ? `Recommended to ${picked[0].display_name}` : 'Recommendations sent');
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not send');
    }
    setBusy(false);
  };
  return (
    <Dialog title="Recommend to a student" onClose={onClose}>
      <p className="mb-3 text-xs text-slate-500">They get a notification with a link to {projectTitle}.</p>
      <StudentPicker picked={picked} onChange={setPicked} />
      {noteField(note, setNote, 'Why this project fits them (optional)')}
      <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy || picked.length === 0} onClick={send}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />} Send recommendation
      </button>
    </Dialog>
  );
}

/** Independent on a student profile: recommend this student to a company. */
export function RecommendStudentDialog({ fromId, student, onClose }: { fromId: string; student: Profile; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [company, setCompany] = useState<Profile | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => { searchCompanies(q).then((r) => { if (!cancelled) setResults(r); }).catch(() => {}); }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const send = async () => {
    if (!company) return;
    setBusy(true);
    try {
      await recommendStudentToCompany(fromId, company.id, student.id, note);
      notify.success(`Recommended ${student.display_name} to ${company.display_name}`);
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not send');
    }
    setBusy(false);
  };

  return (
    <Dialog title={`Recommend ${student.display_name} to a company`} onClose={onClose}>
      {company ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
          <Avatar src={company.avatar_url} name={company.display_name} size="xs" />
          <span className="flex-1 text-sm text-white">{company.display_name}</span>
          <button type="button" className="text-xs text-slate-400 hover:text-white" onClick={() => setCompany(null)}>Change</button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="pub-in" style={{ paddingLeft: 32 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" aria-label="Search companies" />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-ink-900/95 p-1 shadow-card">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-white/5" onClick={() => { setCompany(c); setQ(''); setResults([]); }}>
                    <Avatar src={c.avatar_url} name={c.display_name} size="xs" /> {c.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {noteField(note, setNote, `What makes ${student.display_name} a good fit? (optional)`)}
      <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy || !company} onClick={send}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />} Send referral
      </button>
    </Dialog>
  );
}

/** Independent on a student profile: endorse one skill (once per skill). */
export function EndorseSkillDialog({ fromId, student, already, onClose, onDone }: {
  fromId: string; student: Profile; already: string[]; onClose: () => void; onDone: () => void;
}) {
  const skills = Array.from(new Set([...(student.preferred_roles ?? []), ...(student.interests ?? [])]));
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const taken = already.map((s) => s.toLowerCase()).includes(skill.trim().toLowerCase());
  const send = async () => {
    setBusy(true);
    try {
      await endorseSkill(fromId, student.id, skill);
      notify.success(`Endorsed ${skill.trim()}`);
      onDone();
      onClose();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not endorse');
    }
    setBusy(false);
  };
  return (
    <Dialog title={`Endorse a skill for ${student.display_name}`} onClose={onClose}>
      {skills.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {skills.slice(0, 12).map((s) => (
            <button key={s} type="button" disabled={already.includes(s)} onClick={() => setSkill(s)} className="pill disabled:opacity-40">{s}</button>
          ))}
        </div>
      )}
      <input className="pub-in" maxLength={40} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill, e.g. React" aria-label="Skill" />
      {taken && <p className="mt-1 text-xs text-signal-amber">You already endorsed this skill.</p>}
      <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy || !skill.trim() || taken} onClick={send}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />} Endorse
      </button>
    </Dialog>
  );
}

/** "Report" on Independent projects and profiles → admin Moderation queue. */
export function ReportButton({ reporterId, target, label = 'Report' }: { reporterId: string; target: { projectId?: string; profileId?: string }; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await reportContent(reporterId, target, reason);
      notify.success('Thanks. A moderator will review it.');
      setOpen(false);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not send the report');
    }
    setBusy(false);
  };
  return (
    <>
      <button type="button" className="w-btn-l" onClick={() => setOpen(true)}><Flag size={15} /> {label}</button>
      {open && (
        <Dialog title="Report" onClose={() => setOpen(false)}>
          <textarea className="pub-in" rows={3} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong? (optional)" aria-label="Reason" />
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy} onClick={send}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />} Send report
          </button>
        </Dialog>
      )}
    </>
  );
}
