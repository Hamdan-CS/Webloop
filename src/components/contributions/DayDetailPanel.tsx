import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Clock, ExternalLink, Building2 } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';
import { Rating } from '@/components/shared/ui/Rating';
import { relativeDate } from '@/utils/labels';
import { ratingSteps, tileGrey } from './palette';
import { formatDayLabel } from './grid-layout';
import type { ContributionTask, DayCell } from './types';

const SIZE_LABEL: Record<string, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
const COLOR_NAME = ['pale blue', 'light blue', 'blue', 'deep blue', 'dark blue'];
const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In progress',
  submitted: 'In review',
  changes_requested: 'Changes requested',
};
const STATUS_TONE: Record<string, 'default' | 'accent' | 'amber'> = {
  in_progress: 'default',
  submitted: 'accent',
  changes_requested: 'amber',
};

const POPOVER_WIDTH = 340;
const MARGIN = 10;

interface Props {
  day: DayCell;
  tasks: ContributionTask[] | null;
  loading: boolean;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function DayDetailPanel({ day, tasks, loading, anchorRect, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const width = panelRef.current?.offsetWidth ?? POPOVER_WIDTH;
    const height = panelRef.current?.offsetHeight ?? 0;

    let left = anchorRect.left;
    if (left + width > window.innerWidth - MARGIN) left = window.innerWidth - width - MARGIN;
    if (left < MARGIN) left = MARGIN;

    let top = anchorRect.bottom + 8;
    const fitsBelow = top + height <= window.innerHeight - MARGIN;
    if (!fitsBelow) {
      const above = anchorRect.top - 8 - height;
      top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - height - MARGIN);
    }

    setPos({ top, left });
  }, [anchorRect, tasks, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [onClose]);

  const accepted = (tasks ?? []).filter((t) => t.status === 'approved');
  const live = (tasks ?? []).filter((t) => t.status !== 'approved');
  const rawSum = accepted.reduce((s, t) => s + t.points, 0);
  const capped = rawSum > 6 && day.points >= 6;

  const steps = ratingSteps();
  const grey = tileGrey();
  const ratingColorIdx = day.avgRating ? Math.min(4, Math.max(0, Math.round(day.avgRating) - 1)) : -1;

  const mathLine =
    accepted.length > 0
      ? `${accepted.map((t) => `${t.title} (${SIZE_LABEL[t.size]}, ${t.points})`).join(' + ')} = ${Math.min(rawSum, 6)} point${Math.min(rawSum, 6) === 1 ? '' : 's'}.`
      : null;

  return createPortal(
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Contributions for ${formatDayLabel(day.date)}`}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: pos?.top ?? anchorRect.bottom + 8,
        left: pos?.left ?? anchorRect.left,
        width: POPOVER_WIDTH,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="surface-raised shadow-card z-50 max-h-[70vh] overflow-y-auto rounded-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/8 bg-ink-850/95 px-4 py-3 backdrop-blur-sm rounded-t-2xl">
        <div>
          <p className="font-display text-sm font-semibold text-white">{formatDayLabel(day.date)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {day.points > 0 ? `${day.points} point${day.points === 1 ? '' : 's'}` : 'No accepted tasks this day'}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 p-5">
          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {accepted.length > 0 && (
                <div className="space-y-3">
                  {accepted.map((t) => (
                    <div key={t.task_id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/projects/${t.project_slug}`} className="text-sm font-medium text-white hover:text-accent-300 transition-colors">
                          {t.title}
                        </Link>
                        <Badge tone="green">{t.points} pt{t.points === 1 ? '' : 's'}</Badge>
                      </div>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 size={11} /> {t.project_title} · {t.owner_name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone="default">{SIZE_LABEL[t.size]}</Badge>
                        {t.stack.map((s) => (
                          <span key={s} className="chip py-0.5">{s}</span>
                        ))}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        {t.rating != null ? <Rating value={t.rating} /> : <span className="text-xs text-slate-500">Not rated</span>}
                        {t.accepted_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock size={11} /> {relativeDate(t.accepted_at)}
                          </span>
                        )}
                      </div>
                      {t.owner_name && (
                        <p className="mt-1.5 text-[11px] text-slate-500">Reviewed by {t.owner_name}</p>
                      )}
                      <Link to={`/projects/${t.project_slug}`} className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent-300 hover:text-accent-200">
                        View project <ExternalLink size={10} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {mathLine && (
                <div className="rounded-xl border border-accent-400/20 bg-accent-500/5 px-3.5 py-3 text-xs text-slate-300 leading-relaxed">
                  <p>{mathLine}</p>
                  {day.avgRating != null && ratingColorIdx >= 0 && (
                    <p className="mt-1 flex items-center gap-1.5">
                      Average rating {day.avgRating.toFixed(1)} →
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: steps[ratingColorIdx] }} />
                        {COLOR_NAME[ratingColorIdx]}.
                      </span>
                    </p>
                  )}
                  {capped && <p className="mt-1 text-signal-amber">Capped at 6 per day.</p>}
                </div>
              )}

              {live.length > 0 && (
                <div className="space-y-2">
                  <p className="label-overline">Still moving</p>
                  {live.map((t) => (
                    <div key={t.task_id} className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-300">{t.title}</p>
                        <p className="text-[11px] text-slate-500">{t.project_title}</p>
                      </div>
                      <Badge tone={STATUS_TONE[t.status] ?? 'default'}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {accepted.length === 0 && live.length === 0 && (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-8 text-center">
                  <span className="inline-block h-6 w-6 rounded-sm" style={{ background: grey }} />
                  <p className="mt-3 text-sm text-slate-400">No accepted tasks this day.</p>
                </div>
              )}
            </>
          )}
        </div>
    </motion.div>,
    document.body,
  );
}
