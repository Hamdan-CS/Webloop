import { useCallback, useRef } from 'react';

const canTilt = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(pointer: fine)').matches &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Pointer tilt + gloss position — port of the reference's `tilt(el, max)`. */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null);
  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el || !canTilt()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max * 2).toFixed(2)}deg) rotateY(${((px - 0.5) * max * 2).toFixed(2)}deg)`;
    el.style.setProperty('--mx', px * 100 + '%');
    el.style.setProperty('--my', py * 100 + '%');
  }, [max]);
  const onPointerLeave = useCallback(() => { if (ref.current) ref.current.style.transform = ''; }, []);
  return { ref, onPointerMove, onPointerLeave };
}
