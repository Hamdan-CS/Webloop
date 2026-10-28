import { useNavigate } from 'react-router-dom';
import { buildColumns, formatDayLabel } from './grid-layout';
import { ratingSteps, tileGrey, colorForRating } from './palette';
import { cn } from '@/lib/utils';
import type { DayCell } from './types';

interface Props {
  cells: DayCell[];
  mini?: boolean;
  onSelectDay?: (date: string) => void;
  selectedDate?: string | null;
  profileHandle?: string;
}

const MAX_POINTS = 6;

export function ContributionGrid2D({ cells, mini = false, onSelectDay, selectedDate, profileHandle }: Props) {
  const navigate = useNavigate();
  const columns = buildColumns(cells);
  const steps = ratingSteps();
  const grey = tileGrey();
  const tileSize = mini ? 7 : 11;
  const gap = mini ? 2 : 3;

  const content = (
    <div
      className="inline-flex"
      style={{ gap }}
      role={mini ? undefined : 'grid'}
      aria-label={mini ? undefined : 'Contribution grid, last 365 days'}
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col" style={{ gap }}>
          {col.map((cell, ri) => {
            if (cell.isPadding) {
              return <span key={ri} style={{ width: tileSize, height: tileSize }} />;
            }
            const color = colorForRating(cell.avgRating, steps, grey);
            const scale = cell.points > 0 ? 0.55 + 0.45 * Math.min(cell.points, MAX_POINTS) / MAX_POINTS : 0.3;
            const title = `${formatDayLabel(cell.date)} — ${cell.points} point${cell.points === 1 ? '' : 's'}${
              cell.avgRating != null ? `, ${cell.avgRating.toFixed(1)} avg rating` : ''
            }`;
            const common = {
              key: ri,
              title,
              style: {
                width: tileSize,
                height: tileSize,
                background: color,
                opacity: cell.points > 0 ? 0.35 + 0.65 * scale : 1,
                transform: cell.isToday ? 'scale(1.15)' : undefined,
              },
            };
            if (mini) {
              return <span {...common} className="rounded-[2px]" aria-hidden="true" />;
            }
            return (
              <button
                {...common}
                type="button"
                role="gridcell"
                aria-label={title}
                onClick={() => onSelectDay?.(cell.date)}
                className={cn(
                  'rounded-[2px] transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-accent-400',
                  selectedDate === cell.date && 'ring-2 ring-accent-400',
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  if (mini) {
    return (
      <button
        type="button"
        onClick={() => profileHandle && navigate(`/creators/${profileHandle}`)}
        className="rounded-lg p-1 transition-opacity hover:opacity-80"
        aria-label="View full contribution history"
      >
        {content}
      </button>
    );
  }

  return content;
}
