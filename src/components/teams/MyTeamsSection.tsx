import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Users } from 'lucide-react';
import type { Team } from '@/types';
import { createTeam, fetchMyTeams } from '@/services/api';
import { notify } from '@/utils/notify';
import { TeamList } from './ProfileTeams';

/** Lab: "My teams" with a quick create form. Students only. */
export function MyTeamsSection({ profileId }: { profileId: string }) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMyTeams(profileId).then(setTeams).catch(() => setTeams([]));
  }, [profileId]);

  const create = async () => {
    setBusy(true);
    try {
      const t = await createTeam(name.trim());
      navigate(`/teams/${t.slug}?invite=1`);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not create the team');
      setBusy(false);
    }
  };

  return (
    <section className="mb-10" aria-labelledby="my-teams-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="my-teams-h" className="pf-h4 flex items-center gap-2"><Users size={16} /> My teams</h2>
        {!creating && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> Create a team</button>
        )}
      </div>
      {creating && (
        <div className="surface pf-card mb-3 flex flex-wrap items-center gap-2 p-3">
          <input className="pub-in min-w-0 flex-1" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name, e.g. Byte Squad" aria-label="Team name" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim().length >= 2) void create(); }} />
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || name.trim().length < 2} onClick={create}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCreating(false); setName(''); }}>Cancel</button>
        </div>
      )}
      {teams === null ? null : teams.length === 0 ? (
        <p className="text-sm text-slate-400">No teams yet. Create one here, or pick “Team project” when you publish.</p>
      ) : (
        <TeamList teams={teams} ownerId={profileId} />
      )}
    </section>
  );
}
