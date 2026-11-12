import { useEffect, useRef, type RefObject } from 'react';

const STICKERS = [
  { bg: 'var(--g-peach)', glyph: '<circle cx="12" cy="12" r="6" fill="#e7743a"/>' },
  { bg: 'var(--g-violet)', glyph: '<path d="M12 4l2.2 5 5.3.5-4 3.6 1.2 5.2L12 15.6 7.3 18.3l1.2-5.2-4-3.6 5.3-.5z" fill="#8f6be8"/>' },
  { bg: 'linear-gradient(#ecfbf3,#c9f1dc)', glyph: '<path d="M7 12.5l3.2 3.2L17 9" stroke="#1fa968" stroke-width="2.8" fill="none" stroke-linecap="round"/>' },
  { bg: 'var(--g-solar)', glyph: '<rect x="5" y="6" width="14" height="12" rx="3" fill="#e8a920"/>' },
  { bg: 'var(--g-aqua)', glyph: '<path d="M7 9a3 3 0 1 0 0 6c2 0 3-2 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-2-5-3S9 9 7 9z" fill="none" stroke="#0069e0" stroke-width="2.2"/>' },
];

/**
 * 10 · Sticker trail behind the cursor in the FAQ: a pastel sticker every
 * 30px of pointer travel (64px over a question), at most 44 alive, each
 * popping, drifting against the motion, falling 34px and shrinking over
 * 2.3s (Web Animations API). Fine pointers only; off with reduced motion.
 */
export function StickerTrail({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = targetRef.current;
    const box = layer.current;
    if (!host || !box) return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let lx = 0, ly = 0, acc = 0, n = 0, first = true;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (first) { lx = x; ly = y; first = false; return; }
      const dx = x - lx, dy = y - ly;
      acc += Math.hypot(dx, dy);
      lx = x; ly = y;
      const overQ = !!(e.target as HTMLElement).closest('.g-acc-item');
      if (acc < (overQ ? 64 : 30)) return;
      acc = 0;
      if (box.childElementCount >= 44) box.firstElementChild?.remove();
      const s = STICKERS[n++ % STICKERS.length];
      const el = document.createElement('span');
      el.className = 'gh-sticker';
      el.style.background = s.bg;
      el.innerHTML = `<svg viewBox="0 0 24 24">${s.glyph}</svg>`;
      box.appendChild(el);
      const rot = (Math.random() - 0.5) * 40;
      const anim = el.animate([
        { transform: `translate(${x}px, ${y}px) scale(0) rotate(${rot}deg)`, opacity: 1 },
        { transform: `translate(${x - dx * 0.6}px, ${y - dy * 0.6}px) scale(1.08) rotate(${rot}deg)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${x - dx * 1.4}px, ${y - dy * 1.4 + 34}px) scale(.4) rotate(${rot * 1.6}deg)`, opacity: 0 },
      ], { duration: 2300, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      anim.onfinish = () => el.remove();
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', () => { first = true; });
    return () => { host.removeEventListener('pointermove', onMove); box.replaceChildren(); };
  }, [targetRef]);

  return <div ref={layer} className="gh-stickers" aria-hidden="true" />;
}
