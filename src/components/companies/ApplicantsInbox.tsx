import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Inbox, Loader2, Mail, Star, X } from 'lucide-react';
import { fetchProfileContributions, fetchProfilePortfolio, fetchProfileStats, acceptApplicationAndAddMember, updateApplicationStatus } from '@/services/api';
import type { Application, Profile, Project } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';
import { ContactModal } from '@/components/messaging/ContactModal';
import { relativeDate } from '@/utils/labels';

type StatusFilter = Application['status'] | 'all';
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
];
const STATUS_TONE = { pending: 'amber', accepted: 'green', declined: 'rose' } as const;

interface Props {
  me: Profile;
  projects: Project[];
  applications: Application[];
  initialProjectId?: string;
  onDecided: (id: string, status: 'accepted' | 'declined') => void;
}

export function ApplicantsInbox({ me, projects, applications, initialProjectId, onDecided }: Props) {
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [projectId, setProjectId] = useState(initialProjectId ?? 'all');
  const [messaging, setMessaging] = useState<Application | null>(null);

  useEffect(() => { if (initialProjectId) setProjectId(initialProjectId); }, [initialProjectId]);

  const inProject = applications.filter((a) => projectId === 'all' || a.project_id === projectId);
  const visible = inProject.filter((a) => status === 'all' || a.status === status);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="ft-row" style={{ margin: 0 }}>
          {STATUS_FILTERS.map((f) => {
            const n = f.key === 'all' ? inProject.length : inProject.filter((a) => a.status === f.key).length;
            return (
              <button key={f.key} type="button" className={`pill${status === f.key ? ' on' : ''}`} onClick={() => setStatus(f.key)}>
                {f.label} ({n})
              </button>
            );
          })}
        </div>
        {projects.length > 1 && (
          <Select
            className="w-full sm:w-60"
            value={projectId}
            onChange={setProjectId}
            options={[{ value: 'all', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.title }))]}
          />
        )}
      </div>

      {visible.length === 0 ? (
        <div className="surface pf-card app-empty">
          <span className="pf-ic"><Inbox size={22} /></span>
          <p>
            {applications.length === 0
              ? 'No applicants yet. When students apply to your projects, they will appear here.'
              : `No ${status === 'all' ? '' : status + ' '}applicants here.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((a) => (
            <ApplicantCard key={a.id} application={a} onDecided={onDecided} onMessage={() => setMessaging(a)} />
          ))}
        </div>
      )}

      {messaging?.applicant && (
        <ContactModal
          from={me}
          to={messaging.applicant}
          projectId={messaging.project_id}
          onClose={() => setMessaging(null)}
          onSent={() => setMessaging(null)}
        />
      )}
    </div>
  );
}

interface Evidence { approved: number; rating: number; reviews: number; verifiedWork: string[] }

function ApplicantCard({ application: a, onDecided, onMessage }: {
  application: Application;
  onDecided: Props['onDecided'];
  onMessage: () => void;
}) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [busy, setBusy] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const applicant = a.applicant;

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchProfileContributions(a.applicant_id),
      fetchProfileStats(a.applicant_id).catch(() => ({ avg_rating: 0, review_count: 0 })),
      fetchProfilePortfolio(a.applicant_id).catch(() => []),
    ]).then(([contributions, stats, portfolio]) => {
      if (!live) return;
      setEvidence({
        approved: contributions.approved,
        rating: stats.avg_rating,
        reviews: stats.review_count,
        verifiedWork: portfolio.filter((p) => p.is_verified).slice(0, 3).map((p) => p.title),
      });
    });
    return () => { live = false; };
  }, [a.applicant_id]);

  const decide = async (status: 'accepted' | 'declined') => {
    setBusy(status);
    setError(null);
    try {
      if (status === 'accepted') await acceptApplicationAndAddMember(a.id, a.project_id, a.applicant_id, a.role_title);
      else await updateApplicationStatus(a.id, status);
      onDecided(a.id, status);
      toast.success(status === 'accepted' ? `Accepted ${applicant?.display_name ?? 'applicant'}` : `Declined ${applicant?.display_name ?? 'applicant'}`);
    } catch {
      const message = `Couldn't ${status === 'accepted' ? 'accept' : 'decline'} this applicant. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const subtitle = [applicant?.major, applicant?.university].filter(Boolean).join(' · ');

  return (
    <article className="surface pf-card p-5">
      <div className="flex items-start gap-3">
        <Avatar src={applicant?.avatar_url} name={applicant?.display_name ?? ''} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/creators/${applicant?.handle}`} className="text-sm font-semibold text-white hover:text-accent-300 transition-colors">
              {applicant?.display_name ?? 'Applicant'}
            </Link>
            <Badge tone={STATUS_TONE[a.status]}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Badge>
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          <p className="mt-1 text-xs text-slate-400">
            {a.role_title ? `Applied for ${a.role_title}` : 'General application'}
            {a.project && <> on <Link to={`/projects/${a.project.slug}`} className="link-accent">{a.project.title}</Link></>}
            {' · '}{relativeDate(a.created_at)}
          </p>
        </div>
      </div>

      {a.message && <p className="mt-3 text-sm leading-relaxed text-slate-300">{a.message}</p>}

      <div className="sd-mini mt-3">
        {evidence ? (
          <>
            <span><CheckCircle2 size={14} /><b>{evidence.approved}</b> verified contribution{evidence.approved === 1 ? '' : 's'}</span>
            <span><Star size={14} />{evidence.reviews > 0 ? <><b>{evidence.rating.toFixed(1)}</b> from {evidence.reviews} review{evidence.reviews === 1 ? '' : 's'}</> : 'No reviews yet'}</span>
            {evidence.verifiedWork.map((title) => <span key={title} className="truncate">{title}</span>)}
          </>
        ) : (
          <span>Loading verified work…</span>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {a.status === 'pending' && (
          <>
            <Button className="btn-sm" disabled={!!busy} onClick={() => decide('accepted')}>
              {busy === 'accepted' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Accept
            </Button>
            <Button variant="ghost" className="btn-sm" disabled={!!busy} onClick={() => decide('declined')}>
              {busy === 'declined' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Decline
            </Button>
          </>
        )}
        {applicant && <Button variant="ghost" className="btn-sm" onClick={onMessage}><Mail size={14} /> Message</Button>}
        {applicant && <Link to={`/creators/${applicant.handle}`} className="btn btn-ghost btn-sm">View profile</Link>}
      </div>
    </article>
  );
}
