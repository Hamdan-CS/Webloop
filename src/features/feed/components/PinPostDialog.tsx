import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pin, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminPinPost, adminUnpinPost, fetchActivePins, isActivePin } from '../services/feedApi';
import type { PinnedPost, Post } from '../types';

const DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
] as const;

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
/** yyyy-mm-dd for <input type="date">, local time */
const toDateInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Admin "Pin to top…": position 1–5 and how long. A 6th pin asks which one to replace. */
export function PinPostDialog({
  post,
  onClose,
  onPinned,
}: {
  post: Post;
  onClose: () => void;
  onPinned: (patch: Pick<Post, 'pinned_rank' | 'pinned_until'>) => void;
}) {
  const pinned = isActivePin(post);
  const [rank, setRank] = useState<number>(pinned ? post.pinned_rank! : 1);
  const [days, setDays] = useState<number | 'custom'>(pinned ? 'custom' : 3);
  const [custom, setCustom] = useState(pinned ? toDateInput(new Date(post.pinned_until!)) : toDateInput(new Date(Date.now() + 86400000 * 30)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceFrom, setReplaceFrom] = useState<PinnedPost[] | null>(null);

  const until = (): Date => {
    if (days !== 'custom') return new Date(Date.now() + days * 86400000);
    const d = new Date(`${custom}T23:59:00`);
    return d;
  };

  const pin = async (replaceId?: string) => {
    const end = until();
    if (end.getTime() <= Date.now()) { setError('Pick an end date in the future.'); return; }
    setBusy(true);
    setError(null);
    try {
      if (replaceId) await adminUnpinPost(replaceId);
      await adminPinPost(post.id, rank, end);
      onPinned({ pinned_rank: rank, pinned_until: end.toISOString() });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'PIN_LIMIT') {
        setReplaceFrom(await fetchActivePins());
      } else {
        setError(err instanceof Error ? err.message : 'Could not pin this post.');
      }
    }
    setBusy(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Pin to top" onClick={onClose}>
      <div className="surface-raised w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-white">{pinned ? 'Change pin' : 'Pin to top'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><X size={16} /></button>
        </div>
        <p className="mb-4 truncate text-xs text-slate-500">{post.title}</p>

        {replaceFrom ? (
          <>
            <p className="mb-3 text-sm text-slate-300">5 posts are already pinned. Which one should this replace?</p>
            <div className="flex flex-col gap-1.5">
              {replaceFrom.map((p) => (
                <button key={p.id} type="button" disabled={busy} onClick={() => pin(p.id)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 hover:border-accent-400/40 disabled:opacity-50">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[11px]">{p.pinned_rank}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="shrink-0 text-xs text-slate-500">until {fmt(p.pinned_until)}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setReplaceFrom(null)} className="btn btn-ghost mt-4 w-full">Back</button>
          </>
        ) : (
          <>
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Position</span>
            <div className="mb-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Position">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rank === n} onClick={() => setRank(n)}
                  className={cn('rounded-lg border py-2 text-sm', rank === n ? 'border-accent-400 bg-accent-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
                  {n}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-500">Pinned for</span>
            <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pinned for">
              {DURATIONS.map((d) => (
                <button key={d.days} type="button" role="radio" aria-checked={days === d.days} onClick={() => setDays(d.days)}
                  className={cn('rounded-full border px-3 py-1.5 text-xs', days === d.days ? 'border-accent-400 bg-accent-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
                  {d.label}
                </button>
              ))}
              <button type="button" role="radio" aria-checked={days === 'custom'} onClick={() => setDays('custom')}
                className={cn('rounded-full border px-3 py-1.5 text-xs', days === 'custom' ? 'border-accent-400 bg-accent-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white')}>
                Until a date
              </button>
            </div>
            {days === 'custom' && (
              <input type="date" value={custom} min={toDateInput(new Date())} onChange={(e) => setCustom(e.target.value)} aria-label="Pinned until"
                className="mb-2 w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-slate-200" />
            )}

            {error && <p className="mt-1 text-xs text-signal-rose">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={() => pin()}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Pin size={14} />} {pinned ? 'Save' : 'Pin'}
              </button>
              <button type="button" className="btn btn-ghost px-4" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
