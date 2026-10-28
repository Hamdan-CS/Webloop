import type { DayCell } from './types';

const emptyPad = (): DayCell => ({ date: '', points: 0, avgRating: null, taskCount: 0, isToday: false, isPadding: true });

/** Lays days out GitHub-style: columns = weeks, rows = Sun..Sat, left-padded so the first real day lands on its weekday. */
export function buildColumns(cells: DayCell[]): DayCell[][] {
  if (cells.length === 0) return [];
  const first = new Date(`${cells[0].date}T00:00:00`);
  const leadingPad = first.getDay();
  const padded: DayCell[] = [...Array.from({ length: leadingPad }, emptyPad), ...cells];
  const trailingPad = (7 - (padded.length % 7)) % 7;
  for (let i = 0; i < trailingPad; i++) padded.push(emptyPad());

  const columns: DayCell[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }
  return columns;
}

export function formatDayLabel(date: string): string {
  if (!date) return '';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
