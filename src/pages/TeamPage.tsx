import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, LogOut, Pencil, UserMinus, UserPlus, Users, X, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types';
import {
  fetchTeamBySlug, inviteToTeam, leaveTeam, removeTeamMember, respondTeamInvite, updateTeam,
  type TeamPageData,
} from '@/services/api';
import { Avatar } from '@/components/shared/ui/Avatar';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { StudentPicker } from '@/components/teams/StudentPicker';
import { notify } from '@/utils/notify';

/** Public team page: name, logo, bio, members, the team's projects, verified tasks.
 * The owner can edit the team, invite students and remove members; members can leave. */
export function TeamPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const [data, setData] = useState<TeamPageData | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', bio: '', logo_url: '' });
  const [inviting, setInviting] = useState(params.get('invite') === '1');
  const [picked, setPicked] = useState<Profile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    fetchTeamBySlug(slug).then(setData).catch(() => setData(null));
  }, [slug]);
  useEffect(load, [load]);

  if (data === undefined) {
    return <div className="flex h-[60vh] items-center justify-center"><LoopLoader size={28} /></div>;
  }
  if (data === null) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Team not found</h1>
        <Link to="/explore" className="mt-4 inline-block link-accent">Back to Explore</Link>
      </div>
    );
  }

  const { team, projects, verifiedTasks } = data;
  const members = team.members ?? [];
  const active = members.filter((m) => m.status === 'active');
  const invited = members.filter((m) => m.status === 'invited');
  const me = profile ? members.find((m) => m.profile_id === profile.id) : undefined;
  const isOwner = me?.role === 'owner' && me.status === 'active';
  const isMember = me?.status === 'active';
  const myInvite = me?.status === 'invited';

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) notify.success(ok); load(); } catch (err) { notify.error(err instanceof Error ? err.message : 'Something went wrong'); }
    setBusy(null);
  };

  const saveEdit = () => run('edit', async () => {
    await updateTeam(team.id, { name: draft.name.trim(), bio: draft.bio.trim() || null, logo_url: draft.logo_url.trim() || null });
    setEditing(false);
  }, 'Team updated');

  const sendInvites = () => run('invite', async () => {
    for (const p of picked) await inviteToTeam(team.id, p.id);
    setPicked([]);
    setInviting(false);
  }, picked.length === 1 ? 'Invite sent' : 'Invites sent');

  return (
    <div className="container-page pf py-8 max-w-5xl">
      <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-5">
        <ArrowLeft size={15} /> Explore
      </Link>

      <div className="surface pf-card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={team.logo_url} name={team.name} size="xl" />
          <div className="min-w-0 flex-1">
            <span className="label-overline">Team</span>
            {editing ? (
              <div className="mt-2 space-y-2">
                <input className="pub-in" value={draft.name} maxLength={40} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Team name" />
                <input className="pub-in" value={draft.logo_url} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} placeholder="Logo image URL (optional)" aria-label="Logo URL" />
                <textarea className="pub-in" rows={2} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="What does the team build?" aria-label="Bio" />
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy === 'edit' || draft.name.trim().length < 2} onClick={saveEdit}>
                    {busy === 'edit' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="mt-1 font-display text-3xl font-bold pf-name">{team.name}</h1>
                {team.bio && <p className="mt-2 text-slate-400">{team.bio}</p>}
                {team.archived_at && <p className="mt-2 text-xs text-slate-500">This team is archived. Its page and projects stay visible.</p>}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && !editing && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft({ name: team.name, bio: team.bio ?? '', logo_url: team.logo_url ?? '' }); setEditing(true); }}>
                <Pencil size={13} /> Edit team
              </button>
            )}
            {isOwner && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setInviting((v) => !v)}>
                <UserPlus size={13} /> Invite students
              </button>
            )}
            {isMember && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'leave'}
                onClick={() => { if (window.confirm(isOwner ? 'Leave the team? Ownership passes to the longest-standing member.' : 'Leave this team?')) void run('leave', () => leaveTeam(team.id), 'You left the team'); }}>
                <LogOut size={13} /> Leave team
              </button>
            )}
            {myInvite && (
              <>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy === 'answer'} onClick={() => run('answer', () => respondTeamInvite(team.id, true), `You joined ${team.name}`)}>
                  <Check size={13} /> Accept invite
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'answer'} onClick={() => run('answer', () => respondTeamInvite(team.id, false), 'Invite declined')}>
                  <X size={13} /> Decline
                </button>
              </>
            )}
          </div>
        </div>

        <div className="pf-kpis mt-5">
          <div className="pf-kpi"><b>{active.length}</b><span>Members</span></div>
          <div className="pf-kpi"><b>{projects.length}</b><span>Projects</span></div>
          <div className="pf-kpi"><b className="c1">{verifiedTasks}</b><span>Verified tasks</span></div>
        </div>

        {inviting && isOwner && (
          <div className="mt-5 space-y-2">
            <StudentPicker picked={picked} onChange={setPicked} excludeIds={members.map((m) => m.profile_id)} />
            <button type="button" className="btn btn-primary btn-sm" disabled={picked.length === 0 || busy === 'invite'} onClick={sendInvites}>
              {busy === 'invite' ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Send {picked.length || ''} invite{picked.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>

      <section className="mt-6" aria-labelledby="tm-members">
        <h2 id="tm-members" className="heading text-lg flex items-center gap-2"><Users size={16} /> Members</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[...active, ...(isOwner ? invited : [])].map((m) => (
            <li key={m.id} className="surface pf-card flex items-center gap-3 p-3">
              <Avatar src={m.profile?.avatar_url} name={m.profile?.display_name ?? '?'} size="md" />
              <div className="min-w-0 flex-1">
                {m.profile ? <Link to={`/creators/${m.profile.handle}`} className="truncate font-medium text-white hover:underline">{m.profile.display_name}</Link> : <span>Member</span>}
                <p className="text-xs text-slate-500">
                  {m.role === 'owner' ? 'Owner' : m.status === 'invited' ? 'Invited · waiting for an answer' : 'Member'}
                </p>
              </div>
              {m.role === 'owner' && <CheckCircle2 size={14} className="text-accent-400" aria-label="Owner" />}
              {isOwner && m.role !== 'owner' && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy === m.id}
                  onClick={() => run(m.id, () => removeTeamMember(team.id, m.profile_id), m.status === 'invited' ? 'Invite cancelled' : 'Member removed')}>
                  <UserMinus size={13} /> {m.status === 'invited' ? 'Cancel invite' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="tm-projects">
        <h2 id="tm-projects" className="heading text-lg">Projects</h2>
        {projects.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No published projects yet.</p>
        ) : (
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
