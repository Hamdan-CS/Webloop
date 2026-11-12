import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene, SCENE_MEDIA } from '@/design-system/motion/useScrollScene';
import { RING_PROJECTS, RING_BG, type RingTone } from './homeContent';

const N = 20;
const GLYPH: Record<RingTone, JSX.Element> = {
  aqua: <><rect x="4" y="5" width="16" height="14" rx="3" fill="#3d8ef5" /><path d="M4 9h16" stroke="#fff" strokeWidth="1.6" /></>,
  peach: <><rect x="7" y="3" width="10" height="18" rx="3" fill="#e7743a" /><circle cx="12" cy="17.5" r="1.2" fill="#fff" /></>,
  lav: <path d="M5 18V11M10 18V6M15 18v-9M20 18V13" stroke="#8f6be8" strokeWidth="2.6" strokeLinecap="round" />,
  solar: <><rect x="4" y="7" width="16" height="11" rx="4" fill="#e8a920" /><circle cx="9" cy="12.5" r="1.6" fill="#fff" /><path d="M14.5 11.5h2.5M15.7 10.3v2.5" stroke="#fff" strokeWidth="1.4" /></>,
  mint: <><circle cx="12" cy="12" r="7.5" fill="#1fa968" /><path d="M8.6 12.2l2.4 2.4 4.4-4.6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></>,
};

/**
 * 7 · Project ring (pinned 120%, scrub .6). Twenty pastel project tiles on
 * a circle that turns as you scroll; hovering or focusing a tile shows that
 * project in the centre. Mobile: the ring turns with scroll, no pin.
 */
export function ProjectArc() {
  const ref = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [R, setR] = useState(360);

  useEffect(() => {
    const place = () => setR(Math.min(innerWidth * 0.4, innerHeight * 0.36, 520));
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  useScrollScene(ref, (mm) => {
    mm.add(SCENE_MEDIA.desktop, () => {
      gsap.fromTo(ringRef.current, { rotate: 40 }, { rotate: -100, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=120%', pin: true, scrub: 0.6 } });
      gsap.from('.gh-rt', { scale: 0, stagger: 0.03, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: ref.current, start: 'top 70%' } });
    });
    mm.add(SCENE_MEDIA.mobile, () => {
      gsap.fromTo(ringRef.current, { rotate: 40 }, { rotate: -60, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
  });

  const p = RING_PROJECTS[sel];
  return (
    <section ref={ref} className="gh-ring-sec" aria-labelledby="gh-ring-h">
      <div className="gh-ring-hd">
        <span className="gh-mono">Explore</span>
        <h2 id="gh-ring-h" className="gh-display" style={{ marginTop: 12 }}>Projects from every field</h2>
        <p className="gh-lead">Scroll to turn the ring. Hover a project to peek inside.</p>
      </div>
      <div ref={ringRef} className="gh-ring">
        {Array.from({ length: N }, (_, i) => {
          const idx = i % RING_PROJECTS.length;
          const [name, , , tone] = RING_PROJECTS[idx];
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          return (
            <button
              key={i}
              type="button"
              className="gh-rt"
              aria-label={name}
              onPointerEnter={() => setSel(idx)}
              onFocus={() => setSel(idx)}
              style={{ left: Math.cos(a) * R, top: Math.sin(a) * R, transform: `rotate(${(a * 180) / Math.PI + 90}deg)` }}
            >
              <span className="gh-rt-in" style={{ background: RING_BG[tone] }}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{GLYPH[tone]}</svg>
                <small>{name}</small>
              </span>
            </button>
          );
        })}
      </div>
      <div className="gh-ring-info" aria-live="polite">
        <b>{p[0]}</b>
        <span>{p[1]}</span>
        <span className="gh-chip">{p[2]}</span>
      </div>
    </section>
  );
}
