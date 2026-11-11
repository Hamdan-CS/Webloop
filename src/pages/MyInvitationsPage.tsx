import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Clock, CheckCircle2, XCircle, Briefcase, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { fetchMyInvitations, acceptInvite, respondToInvite } from '@/services/api';
import type { Invitation, ProjectStatus } from '@/types';
import { statusLabel } from '@/utils/labels';
import { cn } from '@/utils/cn';

const inviteBadge: Record<Invitation['status'], string> = { pending: 'rb-prog', accepted: 'rb-rec', declined: 'rb-bad' };
const FILTERS = ['all', 'pending', 'accepted', 'declined'] as const;
const ago = (d: string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};

export function MyInvitationsPage() {
  const { user, profile, refreshCounts } = useAuth();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [justJoined, setJustJoined] = useState<Invitation | null>(null);

  useEffect(() => {
    if (!profile) return;
    fetchMyInvitations(profile.id)
      .then(setInvites)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to view invitations</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  const count = (st: Invitation['status']) => invites.filter((i) => i.status === st).length;
  const shown = filter === 'all' ? invites : invites.filter((i) => i.status === filter);

  const respond = async (invite: Invitation, status: 'accepted' | 'declined') => {
    setRespondingId(invite.id);
    setRespondError(null);
    setJustJoined(null);
    try {
      if (status === 'accepted') {
        await acceptInvite(invite.id);
        setJustJoined(invite);
      } else {
        await respondToInvite(invite.id, 'declined');
      }
      setInvites(invites.map((i) => (i.id === invite.id ? { ...i, status } : i)));
      refreshCounts();
    } catch (err) {
      setRespondError(err instanceof Error ? err.message : 'Failed to respond to invitation');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="container-page pf py-8 max-w-4xl">
      <div className="mb-6">
        <span className="label-overline">Invitations</span>
        <h1 className="mt-2 font-display text-3xl font-bold pf-name">Your project invitations</h1>
        <p className="mt-2 text-slate-400">Teams that have invited you to join their project.</p>
      </div>

      <div className={loading ? undefined : 'reveal'}>
{loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoopLoader size={28} />
        </div>
      ) : invites.length === 0 ? (
        <div className="surface pf-card app-empty">
          <span className="pf-ic"><Mail size={22} /></span>
          <h3 className="pf-h4">No invitations yet</h3>
          <p>When a project owner invites you by email, it'll show up here for you to accept or decline.</p>
          <Link to="/explore" className="btn btn-primary">Explore projects <ArrowRight size={14} /></Link>
        </div>
      ) : (
        <>
          {respondError && (
            <div className="pub-err mb-4"><span>{respondError}</span></div>
          )}
          {justJoined && (
            <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-signal-green/30 bg-signal-green/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-signal-green">
                <CheckCircle2 size={16} />
                <span>You joined <b>{justJoined.project?.title ?? 'the project'}</b>. It's now in My Projects, and tasks assigned to you will show on your dashboard.</span>
              </p>
              {justJoined.project && (
                <Link to={`/projects/${justJoined.project.slug}`} className="btn btn-primary btn-sm">Go to project <ArrowRight size={13} /></Link>
              )}
            </div>
          )}
          <div className="pf-kpis mb-5">
            <div className="pf-kpi"><b>{invites.length}</b><span>Total</span></div>
            <div className="pf-kpi"><b>{count('pending')}</b><span>Pending</span></div>
            <div className="pf-kpi"><b className="c1">{count('accepted')}</b><span>Accepted</span></div>
            <div className="pf-kpi"><b>{count('declined')}</b><span>Declined</span></div>
          </div>
          <div className="pills mb-4">
            {FILTERS.map((f) => (
              <button key={f} type="button" className={cn('pill', filter === f && 'on')} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="app-n">{f === 'all' ? invites.length : count(f)}</span>
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="surface pf-card app-empty"><p>No {filter} invitations.</p></div>
          ) : (
            <ul className="app-list">
              {shown.map((inv) => {
                const Icon = inv.status === 'accepted' ? CheckCircle2 : inv.status === 'declined' ? XCircle : Clock;
                const responding = respondingId === inv.id;
                return (
                  <li key={inv.id} className="surface pf-card app-row">
                    <span className={cn('app-ic', inv.status)}><Icon size={18} /></span>
                    <div className="app-main">
                      {inv.project ? (
                        <Link to={`/projects/${inv.project.slug}`} className="app-title">{inv.project.title}</Link>
                      ) : <span className="app-title">Project</span>}
                      <div className="app-sub">
                        {inv.role_title && <span><Briefcase size={12} /> {inv.role_title}</span>}
                        {inv.project && <span>{statusLabel[inv.project.status as ProjectStatus]}</span>}
                        {inv.inviter && <span>Invited by {inv.inviter.display_name}</span>}
                        {inv.created_at && <span>{ago(inv.created_at)}</span>}
                      </div>
                      {inv.message && <p className="app-msg">{inv.message}</p>}
                    </div>
                    <div className="app-side">
                      {inv.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn btn-primary btn-sm" disabled={responding} onClick={() => respond(inv, 'accepted')}>
                            {responding ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" disabled={responding} onClick={() => respond(inv, 'declined')}>
                            <X size={13} /> Decline
                          </button>
                        </div>
                      ) : (
                        <span className={cn('ref-badge', inviteBadge[inv.status])}>
                          {inv.status === 'accepted' ? "Joined: you're a member" : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                      )}
                      {inv.project && <Link to={`/projects/${inv.project.slug}`} className="sd-link">View project <ArrowRight size={12} /></Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
</div>
    </div>
  );
}
