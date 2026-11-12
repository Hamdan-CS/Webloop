import { useEffect, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, ScrollTrigger } from '../animations/gsap.config';
import { useReducedMotion } from './useReducedMotion';
import { LenisContext } from './lenisContext';

/**
 * Site-wide smooth scrolling (F4). One Lenis instance drives the window
 * scroll and feeds ScrollTrigger, so every pinned/scrubbed scene (the
 * protected stack, the Companies city, How It Works, the new homepage)
 * keeps measuring the same scroll position. Skipped entirely when the
 * visitor prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reduced) return;
    const instance = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      // nested scroll areas (modals, dropdown lists, chat panes) keep their own scrolling
      allowNestedScroll: true,
      anchors: true,
    });
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
