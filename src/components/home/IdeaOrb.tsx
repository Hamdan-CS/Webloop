import { useEffect, useRef, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/design-system/animations/gsap.config';

/**
 * 12 · The "idea" orb travelling between [data-orb] anchors (v4 logic): it
 * flies between anchors along a 60px arc while a segment is in progress, rests
 * on (and scrolls with) the anchor it reached, fades with that anchor's own
 * opacity, and hides off-screen. Desktop only; not rendered with reduced motion.
 */
export function IdeaOrb({ rootRef, ready }: { rootRef: RefObject<HTMLElement>; ready: boolean }) {
  const orbRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const root = rootRef.current, orb = orbRef.current;
    if (!root || !orb) return;
    let segs: ScrollTrigger[] = [];
    let anchors: HTMLElement[] = [];
    const build = () => {
      segs.forEach((s) => s.kill());
      anchors = [...root.querySelectorAll<HTMLElement>('[data-orb]')];
      segs = anchors.slice(1).map((a) => {
        const sec = a.closest('section') ?? a;
        return ScrollTrigger.create({ trigger: sec, start: 'top 70%', end: () => (sec.parentElement?.classList.contains('pin-spacer') ? 'top top' : 'top 30%') });
      });
    };
    build();
    const t1 = window.setTimeout(build, 1500), t2 = window.setTimeout(build, 4000);
    const center = (el: Element) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const hold = ([x, y]: number[]) => [x, gsap.utils.clamp(innerHeight * 0.14, innerHeight * 0.86, y)];
    const ease = gsap.parseEase('power2.inOut');
    const xapp = () => root.querySelector('#gh-xapp');
    const alt = (el: HTMLElement): Element => { const x = xapp(); return el.dataset.orbAlt && x && +getComputedStyle(x).opacity < 0.5 ? root.querySelector(el.dataset.orbAlt) ?? el : el; };
    let ox = 0, oy = 0, os = 1, oo = 0, first = true;
    const tick = () => {
      if (!readyRef.current || innerWidth < 768 || anchors.length < 2) { oo = 0; gsap.set(orb, { opacity: 0 }); return; }
      let i = -1, p = 0;
      for (let k = segs.length - 1; k >= 0; k--) if (scrollY >= segs[k].start) { i = k; p = segs[k].progress; break; }
      let A: HTMLElement, B: HTMLElement, t: number, travelling = false;
      if (i < 0) { A = B = anchors[0]; t = 0; }
      else if (p >= 1) { A = B = anchors[i + 1]; t = 0; }
      else { A = anchors[i]; B = anchors[i + 1]; t = ease(p); travelling = true; }
      const ca = center(alt(A)), a = travelling ? hold(ca) : ca, b = center(alt(B));
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * -60;
      const sa = parseFloat(A.dataset.orbScale || '1'), sb = parseFloat(B.dataset.orbScale || '1'), s = sa + (sb - sa) * t;
      const form = t > 0.55 ? B.dataset.orb : A.dataset.orb;
      const onScreen = travelling || (y > -60 && y < innerHeight + 60);
      const target = form === 'hide' || (A.dataset.orb === 'hide' && t < 0.4) || !onScreen ? 0 : 1;
      const fadeA = t > 0.55 ? 1 : +getComputedStyle(alt(A)).opacity;
      const k = first ? 1 : 0.22; first = false;
      ox += (x - ox) * k; oy += (y - oy) * k; os += (s - os) * k; oo += (target * fadeA - oo) * 0.18;
      if (form && form !== 'hide') orb.dataset.form = form;
      gsap.set(orb, { x: ox - 42, y: oy - 42, scale: os, opacity: oo });
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); segs.forEach((s) => s.kill()); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [rootRef]);

  return (
    <div ref={orbRef} id="gh-orb" data-form="spark" aria-hidden="true">
      <div className="gh-f gh-spark" />
      <div className="gh-f gh-brief"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3" fill="#cce7ff" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="#0069e0" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
      <div className="gh-f gh-badge"><svg width="44%" height="44%"><use href="#check" /></svg></div>
    </div>
  );
}
