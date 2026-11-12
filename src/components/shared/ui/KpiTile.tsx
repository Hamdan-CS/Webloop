import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Pastel KPI tile: mono label, big Geist number, optional delta. */
export function KpiTile({ label, value, tone = 'sky', delta, icon, className }: { label: string; value: string | number; tone?: 'sky' | 'lav' | 'mint' | 'solar'; delta?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('g-kpi', `is-${tone}`, className)}>
      <span className="g-kpi-l">{icon}{label}</span>
      <span className="g-kpi-v">{value}</span>
      {delta && <span className="g-kpi-d">{delta}</span>}
    </div>
  );
}
