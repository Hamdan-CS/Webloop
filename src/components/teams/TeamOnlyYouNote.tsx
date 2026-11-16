import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, User, Loader2 } from 'lucide-react';
import type { Project } from '@/types';
import { setProjectTeam } from '@/services/api';
import { notify } from '@/utils/notify';
import { teamOnlyHasOwner } from './teamUtils';

/** Owner-only note on a team project whose team is down to just them. Never switches automatically. */
export function TeamOnlyYouNote({ project, onSwitched }: { project: Project; onSwitched: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!teamOnlyHasOwner(project) || !project.team) return null;

  const switchToPersonal = async () => {
    setBusy(true);
    try {
      await setProjectTeam(project.id, null);
      notify.success('Switched to a personal project');
      onSwitched();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not switch');
    }
    setBusy(false);
  };

  return (
    <div role="status" className="pub-note flex flex-wrap items-center gap-3">
      <span className="min-w-0 flex-1">Your team only has you right now. Invite someone, or switch to a personal project.</span>
      <Link to={`/teams/${project.team.slug}?invite=1`} className="btn btn-primary btn-sm"><UserPlus size={13} /> Invite someone</Link>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={switchToPersonal}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <User size={13} />} Switch to personal
      </button>
    </div>
  );
}
