import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useContributionData } from '@/components/contributions/useContributionData';
import type { ContributionTask, DayCell } from '@/components/contributions/types';

/**
 * The demo's 26-week contribution heatmap fed by the existing contribution
 * hook (same data the profile grid reads). Points map to the demo's 4 blues.
 * Hover/focus a square → tooltip (GlobalTip reads data-tip).
 * Click / Enter on a day with work → small popover with that day's approved tasks
 * (bottom sheet on phones). Data: daily_contribution_tasks RPC via the hook.
 */
const level = (p: number) => (p <= 0 ? 0 : p < 3 ? 1 : p < 6 ? 2 : p < 10 ? 3 : 4);
const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export function WContribHeat({ studentId, weeks = 26 }: { studentId: string; weeks?: number }) {
  const { cells, error, detail, loadDay, closeDay } = useContributionData(studentId, weeks * 7);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const shown = useMemo(() => {
    const n = weeks * 7;
    const list = cells ? cells.slice(-n) : [];
    return Array.from({ length: n }, (_, i) => list[i] ?? null);
  }, [cells, weeks]);

  const close = useCallback((refocus = false) => {
    if (refocus) anchor?.focus({ preventScroll: true });
    closeDay();
    setAnchor(null);
  }, [closeDay, anchor]);

  const open = (c: DayCell, el: HTMLElement) => {
    if (detail.day === c.date) { close(); return; }
    setAnchor(el);
    loadDay(c.date);
  };

  if (error) return <p className="w-muted">Couldn't load contribution history.</p>;
  const openCell = detail.day ? shown.find((c) => c?.date === detail.day) ?? null : null;

  return (
    <>
      <div className="w-heat" role="grid" aria-label="Contribution graph" style={{ gridTemplateColumns: `repeat(${weeks},1fr)` }}>
        {shown.map((c, i) => {
          if (!c || c.isPadding) return <i key={i} aria-hidden="true" />;
          const n = c.taskCount;
          const tip = `${n} contribution${n === 1 ? '' : 's'} · ${shortDay(c.date)}`;
          const clickable = n > 0;
          return (
            <i
              key={c.date}
              className={cn(level(c.points) > 0 && `l${level(c.points)}`, clickable && 'go', detail.day === c.date && 'sel')}
              data-tip={tip}
              tabIndex={0}
              role="gridcell"
              aria-label={tip}
              aria-haspopup={clickable ? 'dialog' : undefined}
              aria-expanded={clickable ? detail.day === c.date : undefined}
              onClick={(e) => clickable && open(c, e.currentTarget)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && clickable) { e.preventDefault(); open(c, e.currentTarget); }
              }}
            />
          );
        })}
      </div>
      {openCell && anchor && (
        <DayPopover day={openCell} tasks={detail.tasks} loading={detail.loading} anchor={anchor} onClose={close} />
      )}
    </>
  );
}

function DayPopover({ day, tasks, loading, anchor, onClose }: {
  day: DayCell; tasks: ContributionTask[] | null; loading: boolean; anchor: HTMLElement; onClose: (refocus?: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sheet] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (sheet || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight, m = 10;
    let left = r.right + 8;
    if (left + w > window.innerWidth - m) left = r.left - 8 - w; // flip to the left side
    left = Math.max(m, Math.min(left, window.innerWidth - w - m));
    let top = r.top + r.height / 2 - 24;
    top = Math.max(m, Math.min(top, window.innerHeight - h - m));
    setPos({ top, left });
  }, [anchor, sheet, tasks, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(true); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return; // same square toggles via its own click
      onClose();
    };
    const onScroll = () => { if (!sheet) onClose(); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [anchor, onClose, sheet]);

  const approved = (tasks ?? []).filter((t) => t.status === 'approved');

  return createPortal(
    <>
      {sheet && <div className="w-cpop-scrim" aria-hidden="true" />}
      <div
        ref={ref}
        role="dialog"
        aria-label={`Contributions on ${longDay(day.date)}`}
        className={cn('w-cpop', sheet && 'sheet')}
        style={sheet ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
      >
        <div className="w-cpop-h">
          <div>
            <b>{longDay(day.date)}</b>
            <small>{day.taskCount} contribution{day.taskCount === 1 ? '' : 's'}{day.points > 0 ? ` · ${day.points} pt${day.points === 1 ? '' : 's'}` : ''}</small>
          </div>
          <button type="button" className="w-icon-btn" aria-label="Close" onClick={() => onClose(true)}><X size={16} /></button>
        </div>
        <div className="w-cpop-b">
          {loading ? (
            <><span className="w-cpop-sk" /><span className="w-cpop-sk" /></>
          ) : approved.length === 0 ? (
            <p className="w-cpop-empty">No approved tasks this day.</p>
          ) : (
            <ul>
              {approved.map((t) => (
                <li key={t.task_id}>
                  <Link to={`/projects/${t.project_slug}?tab=tk`} className="w-cpop-t">{t.title}</Link>
                  <small>
                    <Link to={`/projects/${t.project_slug}`}>{t.project_title}</Link>
                    {t.owner_name && <> · approved by {t.owner_name}</>}
                  </small>
                  {t.rating != null && (
                    <span className="w-cpop-stars" aria-label={`Rated ${t.rating} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className={n <= Math.round(t.rating ?? 0) ? 'on' : ''} />)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
