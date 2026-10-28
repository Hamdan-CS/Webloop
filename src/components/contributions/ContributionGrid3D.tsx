import { useEffect, useRef, useState } from 'react';
import { createContributionScene, type EngineHandle } from './contributionEngine';
import { formatDayLabel } from './grid-layout';
import type { DayCell } from './types';

interface Props {
  cells: DayCell[];
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onDeselect: () => void;
}

export default function ContributionGrid3D({ cells, selectedDate, onSelectDay, onDeselect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [hover, setHover] = useState<{ cell: DayCell; x: number; y: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = createContributionScene(container, {
      onHover: (cell, x, y) => setHover(cell ? { cell, x, y } : null),
      onSelect: (cell) => onSelectDay(cell.date),
      onDeselectGround: () => onDeselect(),
      onFocusChange: (cell) => setAnnouncement(cell ? `${formatDayLabel(cell.date)}, ${cell.points} points` : ''),
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setCells(cells);
  }, [cells]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedDate);
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="3D contribution grid. Use arrow keys to move between days, Enter to open details."
      tabIndex={0}
      className="relative h-full w-full outline-none"
      onKeyDown={(e) => {
        const engine = engineRef.current;
        if (!engine) return;
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            engine.moveFocus(-1, 0);
            break;
          case 'ArrowRight':
            e.preventDefault();
            engine.moveFocus(1, 0);
            break;
          case 'ArrowUp':
            e.preventDefault();
            engine.moveFocus(0, -1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            engine.moveFocus(0, 1);
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            engine.activateFocus();
            break;
          case 'Escape':
            onDeselect();
            break;
        }
      }}
    >
      {hover && (
        <div
          className="surface-raised pointer-events-none fixed z-50 px-3 py-2 text-xs"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-medium text-white">{formatDayLabel(hover.cell.date)}</p>
          <p className="mt-0.5 text-slate-400">
            {hover.cell.points} point{hover.cell.points === 1 ? '' : 's'}
            {hover.cell.avgRating != null && ` · ${hover.cell.avgRating.toFixed(1)} avg rating`}
          </p>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}
