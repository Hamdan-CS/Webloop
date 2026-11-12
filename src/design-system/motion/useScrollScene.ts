import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { gsap } from '../animations/gsap.config';

/**
 * Scoped GSAP lifecycle for scroll scenes (F4). `build` runs inside a
 * gsap.context bound to `ref`, with a gsap.matchMedia instance so scenes can
 * split desktop (pin + scrub) from mobile / reduced motion. Everything the
 * build creates — tweens, timelines, ScrollTriggers, pins — is reverted on
 * unmount or when deps change, so leaving a route never leaves triggers behind.
 *
 * Breakpoint conditions passed to `mm.add` are conventionally:
 *   { desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
 *     mobile:  '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
 *     reduce:  '(prefers-reduced-motion: reduce)' }
 */
export const SCENE_MEDIA = {
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
} as const;

export function useScrollScene(
  ref: RefObject<HTMLElement>,
  build: (mm: gsap.MatchMedia, self: HTMLElement) => void,
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    const ctx = gsap.context(() => build(mm, el), el);
    return () => {
      mm.revert();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
