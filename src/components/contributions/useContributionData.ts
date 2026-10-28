import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDailyContributions, fetchDailyContributionTasks } from '@/lib/contributions';
import type { ContributionTask, DayCell } from './types';

interface DetailState {
  day: string | null;
  tasks: ContributionTask[] | null;
  loading: boolean;
}

export function useContributionData(studentId: string, days: number) {
  const [cells, setCells] = useState<DayCell[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ day: null, tasks: null, loading: false });
  const cache = useRef(new Map<string, ContributionTask[]>());

  useEffect(() => {
    let cancelled = false;
    setCells(null);
    setError(null);
    cache.current.clear();

    fetchDailyContributions(studentId, days)
      .then((rows) => {
        if (cancelled) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        setCells(
          rows.map((r) => ({
            date: r.day,
            points: r.points,
            avgRating: r.avg_rating,
            taskCount: r.task_count,
            isToday: r.day === todayStr,
            isPadding: false,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contributions');
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, days]);

  const loadDay = useCallback(
    (day: string) => {
      const cached = cache.current.get(day);
      setDetail({ day, tasks: cached ?? null, loading: !cached });
      if (cached) return;

      fetchDailyContributionTasks(studentId, day)
        .then((tasks) => {
          cache.current.set(day, tasks);
          setDetail((d) => (d.day === day ? { day, tasks, loading: false } : d));
        })
        .catch(() => {
          setDetail((d) => (d.day === day ? { day, tasks: [], loading: false } : d));
        });
    },
    [studentId],
  );

  const closeDay = useCallback(() => setDetail({ day: null, tasks: null, loading: false }), []);

  return { cells, error, detail, loadDay, closeDay };
}
