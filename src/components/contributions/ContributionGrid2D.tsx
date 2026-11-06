import { useNavigate } from 'react-router-dom';
import { buildColumns, formatDayLabel } from './grid-layout';
import { cn } from '@/utils/cn';
import type { DayCell } from './types';

interface Props {
  cells: DayCell[];
  mini?: boolean;
  onSelectDay?: (date: string, rect: DOMRect) => void;
  selectedDate?: string | null;
  profileHandle?: string;
}

const MAX_POINTS = 6;

export function ContributionGrid2D({ cells, mini = false, onSelectDay, selectedDate, profileHandle }: Props) {
  const navigate = useNavigate();
  const columns = buildColumns(cells);
  const tileSize = mini ? 7 : 13;
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
            // same heat scale as the home page (--h0..--h4), driven by points per day
            const level = cell.points <= 0 ? 0 : cell.points >= MAX_POINTS ? 4 : cell.points >= 4 ? 3 : cell.points >= 2 ? 2 : 1;
            const color = `var(--h${level})`;
            const title = `${formatDayLabel(cell.date)} — ${cell.points} point${cell.points === 1 ? '' : 's'}${
              cell.avgRating != null ? `, ${cell.avgRating.toFixed(1)} avg rating` : ''
            }`;
            const common = {
              'data-tip': title,
              style: {
                width: tileSize,
                height: tileSize,
                background: color,
                transform: cell.isToday ? 'scale(1.15)' : undefined,
              },
            };
            if (mini) {
              return <span key={ri} {...common} className="rounded-[2px]" aria-hidden="true" />;
            }
            return (
              <button
                key={ri}
                {...common}
                type="button"
                role="gridcell"
                aria-label={title}
                onClick={(e) => onSelectDay?.(cell.date, e.currentTarget.getBoundingClientRect())}
                className={cn(
                  'rounded-[3px] cursor-crosshair transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-accent-400',
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
