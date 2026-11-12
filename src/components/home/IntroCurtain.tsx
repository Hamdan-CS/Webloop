import { useLayoutEffect, useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useLenis } from '@/design-system/motion/lenisContext';
import { Cloud } from '@/design-system/illustrations/Cloud';
import { LoopMark } from '@/design-system/illustrations/LoopMark';

export const INTRO_KEY = 'wl_intro_seen';

/**
 * 0 · Cloud intro (once per session). The loop draws on, a caption fades in,
 * then the two cloud banks part and the sky veil lifts. `onDone` fires as
 * the clouds part so the hero reveal overlaps the end of the curtain.
 * Smooth scroll is paused while it plays (~3.2s).
 */
export function IntroCurtain({ onDone }: { onDone(): void }) {
  const root = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const done = useRef(onDone);
  done.current = onDone;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    lenis?.stop();
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.set('.gh-mark .g-loop-path', { strokeDashoffset: 1 });
      const tl = gsap.timeline({
        onComplete: () => {
          try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
          lenis?.start();
          gsap.set(el, { display: 'none' });
        },
      });
      tl.to('.gh-mark .g-loop-path', { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' })
        .to('.gh-mark span', { opacity: 1, duration: 0.4 }, '-=.5')
        .to('.gh-mark', { opacity: 0, scale: 0.9, duration: 0.35 }, '+=.15')
        .add(() => done.current(), '<')
        .to('.gh-side.l', { xPercent: -95, scale: 1.25, duration: 1.4, ease: 'power3.inOut' }, '<')
        .to('.gh-side.r', { xPercent: 95, scale: 1.25, duration: 1.4, ease: 'power3.inOut' }, '<')
        .to('.gh-veil', { opacity: 0, duration: 0.9, ease: 'power1.out' }, '<.2');
    }, el);
    return () => { ctx.revert(); lenis?.start(); };
    // lenis is created once by SmoothScroll; re-running would replay the intro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="gh-intro" aria-hidden="true">
      <div className="gh-veil" />
      <div className="gh-side l">
        <Cloud tone="white" width="62%" style={{ left: '-4%', top: '6%' }} />
        <Cloud tone="sky" width="70%" style={{ left: '20%', top: '30%' }} />
        <Cloud tone="white" width="80%" style={{ left: '-10%', top: '52%' }} />
        <Cloud tone="sky" width="66%" style={{ left: '30%', top: '70%' }} />
      </div>
      <div className="gh-side r">
        <Cloud tone="sky" width="64%" style={{ right: '-6%', top: '2%' }} />
        <Cloud tone="white" width="66%" style={{ right: '22%', top: '24%' }} />
        <Cloud tone="sky" width="78%" style={{ right: '-8%', top: '46%' }} />
        <Cloud tone="white" width="70%" style={{ right: '26%', top: '68%' }} />
      </div>
      <div className="gh-mark">
        <LoopMark width={120} draw />
        <span>Opening the loop…</span>
      </div>
    </div>
  );
}
