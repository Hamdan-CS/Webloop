import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Team } from '@/types';
import { activeTeamMembers } from '@/services/api';
import { Avatar } from '@/components/shared/ui/Avatar';

export function TeamList({ teams, ownerId }: { teams: Team[]; ownerId?: string }) {
  return (
    <ul className="space-y-2">
      {teams.map((t) => {
        const n = activeTeamMembers(t).length;
        const owner = (t.members ?? []).find((m) => m.role === 'owner')?.profile_id === ownerId;
        return (
          <li key={t.id}>
            <Link to={`/teams/${t.slug}`} className="flex items-center gap-3 rounded-xl border border-white/8 p-3 transition-colors hover:border-accent-400/30">
              <Avatar src={t.logo_url} name={t.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{t.name}</span>
                <span className="block text-xs text-slate-500">{n} member{n === 1 ? '' : 's'}{owner ? ' · Owner' : ''}</span>
              </span>
              <Users size={14} className="text-slate-500" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
