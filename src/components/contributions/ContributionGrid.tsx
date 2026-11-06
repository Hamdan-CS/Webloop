import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useContributionData } from './useContributionData';
import { ContributionGrid2D } from './ContributionGrid2D';
import { DayDetailPanel } from './DayDetailPanel';
import { Legend } from './Legend';
import { cn } from '@/utils/cn';
import type { GridSize, GridView } from './types';

interface ContributionGridProps {
  studentId: string;
  size?: GridSize;
  /** @deprecated 3D view removed; kept so existing callers still compile. */
  view?: GridView;
  /** Profile handle, used only by the mini variant to navigate to the full profile on click. */
  profileHandle?: string;
  className?: string;
}

export function ContributionGrid({ studentId, size = 'full', profileHandle, className }: ContributionGridProps) {
  const days = size === 'mini' ? 84 : 365;
  const { cells, error, detail, loadDay, closeDay } = useContributionData(studentId, days);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleSelectDay = (date: string, rect: DOMRect) => {
    setAnchorRect(rect);
    loadDay(date);
  };

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
    <div className={cn('surface pf-card p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="pf-h4">Contribution activity <small>last 12 months</small></h2>
        <Legend />
      </div>

      <div className="mt-4">
        <div className="overflow-x-auto pb-1">
          <ContributionGrid2D cells={cells} onSelectDay={handleSelectDay} selectedDate={detail.day} />
        </div>
      </div>

      <AnimatePresence>
        {selectedCell && anchorRect && (
          <DayDetailPanel
            key={selectedCell.date}
            day={selectedCell}
            tasks={detail.tasks}
            loading={detail.loading}
            anchorRect={anchorRect}
            onClose={closeDay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ContributionGrid;
