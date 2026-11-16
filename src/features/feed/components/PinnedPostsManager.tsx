import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, PinOff } from 'lucide-react';
import { GlassCard } from '@/design-system';
import { Button } from '@/components/shared/ui/Button';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { cn } from '@/utils/cn';
import { adminPinPost, adminReorderPins, adminUnpinPost, fetchActivePins } from '../services/feedApi';
import type { PinnedPost } from '../types';

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const todayInput = () => toDateInput(new Date().toISOString());

/** Admin area: the 5 pin slots. Drag (or the arrows) to reorder, change the end date, or Unpin. */
export function PinnedPostsManager() {
  const [pins, setPins] = useState<PinnedPost[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { fetchActivePins().then(setPins).catch(() => setPins([])); }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    load();
  };

  const reorder = (ids: string[]) => {
    if (!pins) return;
    // show the new order right away, then save it
    setPins(ids.map((id, i) => ({ ...pins.find((p) => p.id === id)!, pinned_rank: i + 1 })));
    void run(() => adminReorderPins(ids));
  };

  const move = (id: string, by: -1 | 1) => {
    if (!pins) return;
    const ids = pins.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + by;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(ids);
  };

  const dropOn = (targetId: string) => {
    if (!pins || !dragId || dragId === targetId) return;
    const ids = pins.map((p) => p.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId) + (pins.findIndex((p) => p.id === dragId) < pins.findIndex((p) => p.id === targetId) ? 1 : 0), 0, dragId);
    setDragId(null);
    reorder(ids);
  };

  return (
    <section className="mt-6" aria-labelledby="pinned-h">
      <h2 id="pinned-h" className="heading text-lg">Pinned posts</h2>
      <p className="mt-1 text-sm text-slate-400">Up to 5 posts sit at the top of the Feed for everyone. Pin a post from its ⋯ menu.</p>
      {error && <p className="mt-2 text-xs text-signal-rose">{error}</p>}
      <div className="mt-3 flex flex-col gap-2">
        {pins === null ? (
          <LoopLoader size={20} />
        ) : (
          [0, 1, 2, 3, 4].map((slot) => {
            const p = pins[slot];
            if (!p) {
              return (
                <div key={`empty-${slot}`} className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-500">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-xs">{slot + 1}</span> Empty slot
                </div>
              );
            }
            return (
              <GlassCard
                key={p.id}
                raised
                draggable
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={() => dropOn(p.id)}
                className={cn('flex flex-wrap items-center gap-3 p-3', dragId === p.id && 'opacity-50')}
              >
                <GripVertical size={16} className="cursor-grab text-slate-500" aria-hidden="true" />
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-500/15 text-xs text-white">{p.pinned_rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                  {p.author_name && <p className="text-xs text-slate-500">by {p.author_name}</p>}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  Until
                  <input
                    type="date"
                    value={toDateInput(p.pinned_until)}
                    min={todayInput()}
                    onChange={(e) => { if (e.target.value) void run(() => adminPinPost(p.id, p.pinned_rank, new Date(`${e.target.value}T23:59:00`))); }}
                    className="rounded-lg border border-white/10 bg-ink-900/60 px-2 py-1 text-xs text-slate-200"
                  />
                </label>
                <div className="flex gap-1">
                  <button type="button" aria-label="Move up" disabled={slot === 0} onClick={() => move(p.id, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button type="button" aria-label="Move down" disabled={slot === pins.length - 1} onClick={() => move(p.id, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
                <Button size="sm" variant="secondary" onClick={() => run(() => adminUnpinPost(p.id))}>
                  <PinOff size={13} /> Unpin
                </Button>
              </GlassCard>
            );
          })
        )}
      </div>
    </section>
  );
}
