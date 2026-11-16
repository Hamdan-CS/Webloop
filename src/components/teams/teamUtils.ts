import { useEffect, useState } from 'react';
import type { Project, Team } from '@/types';
import { fetchTeamsForProfile } from '@/services/api';

/** Teams a student is an active member of. */
export function useProfileTeams(profileId: string | undefined): Team[] {
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    fetchTeamsForProfile(profileId).then((t) => { if (!cancelled) setTeams(t); }).catch(() => {});
    return () => { cancelled = true; };
  }, [profileId]);
  return teams;
}

/** True when a team project's team has nobody but the owner (no other members, no pending invites). */
export function teamOnlyHasOwner(project: Project): boolean {
  if (!project.team_id || !project.team?.members) return false;
  return project.team.members.filter((m) => m.profile_id !== project.owner_id).length === 0;
}

