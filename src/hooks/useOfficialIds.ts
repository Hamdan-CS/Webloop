import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Profile ids of the official WebLoop account(s) — anyone in admin_roles,
 * read through the official_profile_ids() RPC (migration 030). Loaded once
 * per page load and shared by every component.
 */
let cache: Set<string> | null = null;
let pending: Promise<Set<string>> | null = null;
const listeners = new Set<(ids: Set<string>) => void>();

function load(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = Promise.resolve(supabase.rpc('official_profile_ids'))
      .then(({ data, error }) => {
        if (error) throw error;
        const rows = (data ?? []) as unknown[];
        // SETOF uuid comes back as plain strings; tolerate {official_profile_ids: id} too
        return new Set(rows.map((r) => (typeof r === 'string' ? r : String(Object.values(r as object)[0]))));
      })
      .catch(() => new Set<string>())
      .then((ids) => {
        cache = ids;
        listeners.forEach((l) => l(ids));
        return ids;
      });
  }
  return pending;
}

export function useOfficialIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => cache ?? new Set());
  useEffect(() => {
    if (cache) return;
    listeners.add(setIds);
    void load();
    return () => { listeners.delete(setIds); };
  }, []);
  return ids;
}

/** `isOfficial(profileId)` helper bound to the cached id set. */
export function useIsOfficial(): (id: string | null | undefined) => boolean {
  const ids = useOfficialIds();
  return useCallback((id) => !!id && ids.has(id), [ids]);
}
