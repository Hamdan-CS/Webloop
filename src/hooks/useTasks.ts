import { useCallback, useEffect, useState } from 'react';
import { fetchProfileProjects } from '@/lib/api';
import type { Project } from '@/lib/types';

/** Resolves which of the signed-in profile's projects should show a task management panel. */
export function useTasks(profileId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      setProjects(await fetchProfileProjects(profileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { projects, loading, error, refresh };
}
