import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';

export interface ActivityItem {
  id: string;
  initials: string;
  title: string;
  meta: string;
  status: 'verified' | 'review';
  tone?: string;
}

const TONES = ['#cce7ff', '#ffd1b8', '#d3f6e3', '#e4ccff', '#fff2be'];

/**
 * GitHub-style activity feed with verification pills. With `stream`, a new
 * row arrives every 3.8s "in review" and flips to Verified 1.6s later (the
 * demo's live feed). Streaming pauses under reduced motion.
 */
export function ActivityFeed({ items, stream = false, max = 5, onVerified }: { items: ActivityItem[]; stream?: boolean; max?: number; onVerified?: () => void }) {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState(() => items.slice(0, max).map((r) => ({ ...r, fresh: false })));
  const next = useRef(max);
  const cb = useRef(onVerified);
  cb.current = onVerified;

  useEffect(() => {
    if (!stream || reduced || items.length === 0) return;
    let flip: number | undefined;
    const iv = window.setInterval(() => {
      const src = items[next.current++ % items.length];
      const id = `${src.id}-${next.current}`;
      setRows((rs) => [{ ...src, id, status: 'review' as const, fresh: true }, ...rs].slice(0, max));
      flip = window.setTimeout(() => {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'verified' as const } : r)));
        cb.current?.();
      }, 1600);
    }, 3800);
    return () => { window.clearInterval(iv); window.clearTimeout(flip); };
  }, [stream, reduced, items, max]);

  return (
    <div className="g-feed" role="list">
      {rows.map((r) => (
        <div key={r.id} role="listitem" className={`g-feed-row${r.fresh ? ' is-fresh' : ''}`}>
          <span className="g-av" style={{ background: r.tone ?? TONES[r.initials.charCodeAt(0) % 5] }}>{r.initials}</span>
          <span className="g-feed-txt"><b>{r.title}</b><small>{r.meta}</small></span>
          <span key={r.status} className={`g-st ${r.status === 'verified' ? 'is-v' : 'is-r'}`}>{r.status === 'verified' ? 'Verified' : 'In review'}</span>
        </div>
      ))}
    </div>
  );
}
