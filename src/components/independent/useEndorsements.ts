import { useCallback, useEffect, useState } from 'react';
import { fetchEndorsementsFor, type SkillEndorsement } from '@/services/api';

/** Skill endorsements a student received (reload after endorsing). */
export function useEndorsements(studentId: string | undefined) {
  const [list, setList] = useState<SkillEndorsement[]>([]);
  const load = useCallback(() => {
    if (!studentId) return;
    fetchEndorsementsFor(studentId).then(setList).catch(() => setList([]));
  }, [studentId]);
  useEffect(load, [load]);
  return { list, reload: load };
}

