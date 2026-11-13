import { useLayoutEffect, useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useLenis } from '@/design-system/motion/lenisContext';

export const INTRO_KEY = 'wl_intro_seen';

// [left %, top %, width vw, depth 0 far … 2 near, tone] — the demo's INTRO_CL
const INTRO_CL: [number, number, number, number, 'B' | 'W'][] = [
  [-6, 4, 40, 0, 'B'], [32, -6, 40, 0, 'W'], [68, 6, 42, 0, 'B'], [8, 56, 40, 0, 'W'], [58, 60, 44, 0, 'B'],
  [-14, 24, 56, 1, 'W'], [40, 18, 58, 1, 'B'], [18, 66, 58, 1, 'B'], [66, 70, 52, 1, 'W'],
  [-24, 40, 74, 2, 'W'], [36, 44, 78, 2, 'W'], [-12, -14, 62, 2, 'W'], [58, -16, 64, 2, 'W']];

/**
 * 0 · Cloud intro (first visit per session). Three depths of cloud hold
 * almost still, then the bank opens — near clouds move first and furthest —
 * while the veil lifts and the hero and nav reveal (introTL, exact values).
 * `onDone` runs when the timeline completes (the orb becomes ready then).
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
      const tl = gsap.timeline({
        onComplete: () => {
          try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
          lenis?.start();
          done.current();
        },
      });
      gsap.set('.gh-veil', { opacity: 1 });
      gsap.set('.gh-ic', { x: 0, y: 0, scale: 1, opacity: 1 });
      gsap.set('.ghome .gh-hero h1 .gh-ln>span', { yPercent: 110 });
      gsap.set('.ghome .gh-hero-fade', { opacity: 0, y: 24 });
      gsap.set('.gh-nav-in', { yPercent: -150 });
      gsap.set('.ghome .gh-hero .gh-hc', { opacity: 0, scale: 0.94 });
      // a short, almost still moment, then the bank opens: near clouds move first and furthest
      gsap.utils.toArray<SVGElement>('.gh-ic').forEach((c) => {
        const d = Number(c.dataset.d);
        let vx = Number(c.dataset.cx) - 50, vy = Number(c.dataset.cy) - 50;
        const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        const dist = (0.5 + 0.42 * d) * innerWidth;
        tl.to(c, { x: `+=${gsap.utils.random(-14, 14)}`, y: '-=8', duration: 0.5, ease: 'sine.inOut' }, 0)
          .to(c, { x: vx * dist, y: vy * dist * 0.5 - innerHeight * 0.06, scale: 1.08 + 0.22 * d, duration: 2.1 - 0.3 * d, ease: 'power2.inOut' }, 0.32 + (2 - d) * 0.09)
          .to(c, { opacity: 0, duration: 0.9, ease: 'power1.in' }, 1.25 + (2 - d) * 0.08);
      });
      tl.to('.gh-veil', { opacity: 0, duration: 1.3, ease: 'power1.inOut' }, 0.55)
        .to('.ghome .gh-hero .gh-hc', { opacity: 1, scale: 1, duration: 1.4, stagger: 0.06, ease: 'power3.out' }, 1.0)
        .to('.ghome .gh-hero h1 .gh-ln>span', { yPercent: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 1.15)
        .to('.ghome .gh-hero-fade', { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, 1.45)
        .to('.gh-nav-in', { yPercent: 0, duration: 1, ease: 'expo.out' }, 1.45)
        .set(el, { display: 'none' });
    });
    return () => { ctx.revert(); lenis?.start(); };
    // runs once per mount; replaying would restart the curtain
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} id="gh-intro" aria-hidden="true">
      <div className="gh-veil" />
      <div id="gh-introClouds">
        {INTRO_CL.map((c, i) => (
          <svg key={i} viewBox="0 0 200 120" className={`gh-cloud gh-ic gh-d${c[3]}`} data-d={c[3]} data-cx={c[0] + c[2] / 2} data-cy={c[1] + c[2] * 0.3}
            style={{ left: `${c[0]}vw`, top: `${c[1]}vh`, width: `${c[2]}vw` }}>
            <use href={`#cloud${c[4]}`} width="200" height="120" />
          </svg>
        ))}
      </div>
    </div>
  );
}
