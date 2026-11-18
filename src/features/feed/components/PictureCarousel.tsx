import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Heart, SquareTerminal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { notify } from '@/utils/notify';
import { getPostImageUrl } from '../services/feedApi';
import { DOUBLE_TAP_WINDOW_MS } from '../constants';
import { commandLines, domainOf } from '../imageDetails';
import type { PostImage } from '../types';

interface PictureCarouselProps {
  images: PostImage[];
  liked: boolean;
  onDoubleTapLike: () => void;
}

export function PictureCarousel({ images, liked, onDoubleTapLike }: PictureCarouselProps) {
  const [active, setActive] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const [termOpen, setTermOpen] = useState(false);
  const lastTap = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const termId = useId();
  // mouse drag-to-swipe (touch already scrolls natively)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    // update right away (don't wait for the scroll event): pills/caption switch, terminal closes
    if (next !== active) {
      setActive(next);
      setTermOpen(false);
    }
  }

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0 || images.length < 2) return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = trackRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    el.scrollLeft = d.left - dx;
  }

  function onDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = trackRef.current;
    if (!d || !el) return;
    drag.current = null;
    el.classList.remove('dragging');
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    const dx = e.clientX - d.x;
    const from = Math.round(d.left / el.clientWidth);
    // a short flick is enough to change picture
    const target = Math.abs(dx) > el.clientWidth * 0.15 ? from + (dx < 0 ? 1 : -1) : from;
    goTo(target);
    if (d.moved) lastTap.current = 0; // a drag is never half of a double-tap like
  }

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== active) {
      setActive(next);
      setTermOpen(false); // each image has its own command: close on swipe
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('.fp-pic-nav, .feed-dot')) return; // arrows/dots aren't taps on the picture
    if (drag.current?.moved) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_WINDOW_MS) {
      if (!liked) onDoubleTapLike();
      const id = now;
      setBursts((b) => [...b, id]);
      setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 850);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  if (images.length === 0) return null;
  const img = images[active];
  const lines = img?.command ? commandLines(img.command) : [];
  const link = img?.link_url ?? null;
  const linkLabel = link ? img?.link_label?.trim() || domainOf(link) || 'Open link' : '';

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-xl bg-ink-900"
        style={{ aspectRatio: '1 / 1' }}
        onPointerUp={onPointerUp}
      >
        <div
          ref={trackRef}
          onScroll={onScroll}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
          }}
          tabIndex={images.length > 1 ? 0 : undefined}
          role={images.length > 1 ? 'region' : undefined}
          aria-roledescription={images.length > 1 ? 'carousel' : undefined}
          aria-label={images.length > 1 ? `Picture ${active + 1} of ${images.length}` : undefined}
          className={cn('feed-track h-full w-full', images.length > 1 && 'can-drag')}
        >
          {images.map((im, i) => (
            <img key={im.id ?? i} src={getPostImageUrl(im.path)} alt={im.caption ?? ''} className="h-full w-full object-cover" />
          ))}
        </div>
        {images.length > 1 && (
          <>
            {active > 0 && (
              <button type="button" className="fp-pic-nav prev" onClick={() => goTo(active - 1)} aria-label="Previous picture">
                <ChevronLeft size={20} />
              </button>
            )}
            {active < images.length - 1 && (
              <button type="button" className="fp-pic-nav next" onClick={() => goTo(active + 1)} aria-label="Next picture">
                <ChevronRight size={20} />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn('feed-dot', i === active && 'on')}
                  onClick={() => goTo(i)}
                  aria-label={`Show picture ${i + 1}`}
                  aria-current={i === active}
                />
              ))}
            </div>
          </>
        )}
        {bursts.map((id) => (
          <Heart
            key={id}
            size={90}
            className="feed-burst pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg"
          />
        ))}
      </div>

      {(img?.caption || lines.length > 0 || link) && (
        <div className="fp-pic-meta">
          {img?.caption && <p className="fp-pic-cap">{img.caption}</p>}
          {(lines.length > 0 || link) && (
            <div className="fp-pic-acts">
              {lines.length > 0 && (
                <button
                  type="button"
                  className={cn('fp-pic-pill', termOpen && 'on')}
                  onClick={() => setTermOpen((v) => !v)}
                  aria-expanded={termOpen}
                  aria-controls={termId}
                >
                  <SquareTerminal size={13} /> Terminal
                </button>
              )}
              {link && (
                <a className="fp-pic-pill" href={link} target="_blank" rel="noopener noreferrer">
                  <ArrowUpRight size={13} /> {linkLabel}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {lines.length > 0 && (
        <div id={termId} className={cn('fp-pic-term', termOpen && 'open')} hidden={!termOpen}>
          {/* key: a new image gets a fresh terminal (and Copy state) */}
          {termOpen && <PicTerminal key={active} lines={lines} />}
        </div>
      )}
    </div>
  );
}

function PicTerminal({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    const text = lines.join('\n');
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // copying blocked (http, iframe, permissions): select the commands instead
      const node = preRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      notify.info('Copy is blocked here. The commands are selected: press Ctrl+C (⌘C on Mac).');
    }
  }

  return (
    <div className="fp-term fp-term-sm">
      <div ref={preRef}>
        {lines.map((l, i) => (
          <div key={i} className="cl"><span className="ps" aria-hidden="true">$ </span>{l}</div>
        ))}
      </div>
      <button type="button" className="fp-copy" onClick={copy} aria-label="Copy all commands">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
