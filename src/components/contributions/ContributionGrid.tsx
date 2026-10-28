import { lazy, Suspense, useMemo, useState } from 'react';
import { Boxes, LayoutGrid, AlertCircle } from 'lucide-react';
import { useContributionData } from './useContributionData';
import { ContributionGrid2D } from './ContributionGrid2D';
import { DayDetailPanel } from './DayDetailPanel';
import { Legend } from './Legend';
import { ratingSteps, tileGrey } from './palette';
import { supportsWebGL, prefersReducedMotion } from './webgl';
import { cn } from '@/lib/utils';
import type { GridSize, GridView } from './types';

const ContributionGrid3D = lazy(() => import('./ContributionGrid3D'));

interface ContributionGridProps {
  studentId: string;
  size?: GridSize;
  view?: GridView;
  /** Profile handle, used only by the mini variant to navigate to the full profile on click. */
  profileHandle?: string;
  className?: string;
}

export function ContributionGrid({ studentId, size = 'full', view, profileHandle, className }: ContributionGridProps) {
  const days = size === 'mini' ? 84 : 365;
  const { cells, error, detail, loadDay, closeDay } = useContributionData(studentId, days);

  const canUse3D = useMemo(() => size === 'full' && supportsWebGL() && !prefersReducedMotion(), [size]);
  const [mode, setMode] = useState<GridView>(view ?? (canUse3D ? '3d' : '2d'));
  const effectiveMode = canUse3D ? mode : '2d';

  const steps = ratingSteps();
  const grey = tileGrey();

  if (error) {
    return (
      <div className={cn('surface flex items-center gap-2 p-4 text-sm text-slate-500', className)}>
        <AlertCircle size={16} /> Couldn't load contribution history.
      </div>
    );
  }

  if (!cells) {
    return (
      <div className={cn(size === 'mini' ? 'h-16 w-40' : 'h-[340px]', 'skeleton rounded-xl', className)} />
    );
  }

  if (size === 'mini') {
    return (
      <div className={className}>
        <ContributionGrid2D cells={cells} mini profileHandle={profileHandle} />
      </div>
    );
  }

  const selectedCell = detail.day ? cells.find((c) => c.date === detail.day) ?? null : null;

  return (
    <div className={cn('surface p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend steps={steps} grey={grey} />
        {canUse3D && (
          <div className="flex items-center gap-1 rounded-lg border border-white/8 p-1">
            <button
              type="button"
              onClick={() => setMode('3d')}
              aria-pressed={effectiveMode === '3d'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                effectiveMode === '3d' ? 'bg-accent-500 text-ink-950' : 'text-slate-400 hover:text-white',
              )}
            >
              <Boxes size={13} /> 3D
            </button>
            <button
              type="button"
              onClick={() => setMode('2d')}
              aria-pressed={effectiveMode === '2d'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                effectiveMode === '2d' ? 'bg-accent-500 text-ink-950' : 'text-slate-400 hover:text-white',
              )}
            >
              <LayoutGrid size={13} /> 2D
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        {effectiveMode === '3d' ? (
          <Suspense fallback={<div className="skeleton h-[320px] rounded-xl" />}>
            <div className="h-[320px] rounded-xl border border-white/8 bg-ink-950/40 sm:h-[380px]">
              <ContributionGrid3D
                cells={cells}
                selectedDate={detail.day}
                onSelectDay={loadDay}
                onDeselect={closeDay}
              />
            </div>
          </Suspense>
        ) : (
          <div className="overflow-x-auto pb-1">
            <ContributionGrid2D cells={cells} onSelectDay={loadDay} selectedDate={detail.day} />
          </div>
        )}
      </div>

      {selectedCell && (
        <DayDetailPanel day={selectedCell} tasks={detail.tasks} loading={detail.loading} onClose={closeDay} />
      )}
    </div>
  );
}

export default ContributionGrid;
