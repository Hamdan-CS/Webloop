import { useEffect, useRef } from 'react';

/** Cursor-following tooltip for any element carrying `data-tip` (ported from the reference's #tip). */
export function GlobalTip() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tip = ref.current;
    if (!tip) return;
    const onMove = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.('[data-tip]') as HTMLElement | null;
      if (t) {
        tip.textContent = t.dataset.tip ?? '';
        tip.style.left = e.clientX + 'px';
        tip.style.top = e.clientY + 'px';
        tip.classList.add('show');
      } else tip.classList.remove('show');
    };
    const hide = () => tip.classList.remove('show');
    document.addEventListener('pointermove', onMove);
    window.addEventListener('scroll', hide, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', hide); };
  }, []);
  return <div ref={ref} className="tip" role="tooltip" aria-hidden="true" />;
}
