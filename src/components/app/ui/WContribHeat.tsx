import { useMemo } from 'react';
import { useContributionData } from '@/components/contributions/useContributionData';
import { WHeatmap } from './index';

/**
 * The demo's 26-week contribution heatmap fed by the existing contribution
 * hook (same data the profile grid reads). Points map to the demo's 4 blues.
 */
const level = (p: number) => (p <= 0 ? 0 : p < 3 ? 1 : p < 6 ? 2 : p < 10 ? 3 : 4);

export function WContribHeat({ studentId, weeks = 26 }: { studentId: string; weeks?: number }) {
  const { cells, error } = useContributionData(studentId, weeks * 7);
  const levels = useMemo(() => (cells ? cells.slice(-weeks * 7).map((c) => (c.isPadding ? 0 : level(c.points))) : undefined), [cells, weeks]);
  if (error) return <p className="w-muted">Couldn't load contribution history.</p>;
  return <WHeatmap levels={levels} weeks={weeks} />;
}
