import { useEffect, useState } from 'react';

/** Mirrors the CSS `prefers-reduced-motion: reduce` query for JS-driven
 * sequencing (typewriter reveals, cursor-move timers, etc.) that CSS
 * transitions alone can't cover — those still need a reduced-motion branch
 * that jumps straight to the end state instead of just skipping a transition. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
