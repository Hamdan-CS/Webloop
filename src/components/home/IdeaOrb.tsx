import { useEffect, useRef, type RefObject } from 'react';
import { gsap, ScrollTrigger } from '@/design-system/animations/gsap.config';

/**
 * 12 · The idea orb: one "idea" that travels between anchors as you scroll.
 * Anchors are elements with data-orb="spark|brief|badge|hide" (optional
 * data-orb-scale and data-orb-alt) inside `rootRef`, read in DOM order.
 * Each step is a ScrollTrigger on the anchor's section; while travelling the
 * orb flies from the previous anchor (held inside 14–86% of the viewport)
 * to the next along a 60px arc, then rides with its anchor. Desktop only;
 * hidden with reduced motion and on screens under 768px.
 */
export function IdeaOrb({ rootRef, ready }: { rootRef: RefObject<HTMLElement>; ready: boolean }) {
  const orbRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    const root = rootRef.current;
    const orb = orbRef.current;
    if (!root || !orb) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
    // anchors appear as lazy sections mount; rebuild a few times while the page settles
    build();
    const t1 = window.setTimeout(build, 1500);
    const t2 = window.setTimeout(build, 4000);

    const center = (el: Element) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const hold = ([x, y]: number[]) => [x, gsap.utils.clamp(innerHeight * 0.14, innerHeight * 0.86, y)];
    const ease = gsap.parseEase('power2.inOut');
    let ox = 0, oy = 0, os = 1, first = true;

    const tick = () => {
      if (!readyRef.current || innerWidth < 768 || anchors.length < 2) { gsap.set(orb, { opacity: 0 }); return; }
      let i = -1, p = 0;
      for (let k = segs.length - 1; k >= 0; k--) { if (scrollY >= segs[k].start) { i = k; p = segs[k].progress; break; } }
      let A: HTMLElement, B: HTMLElement, t: number;
      if (i < 0) { A = anchors[0]; B = anchors[0]; t = 0; } else { A = anchors[i]; B = anchors[i + 1]; t = ease(p); }
      const xapp = root.querySelector('.gh-xapp');
      const alt = (el: HTMLElement): Element => (el.dataset.orbAlt && xapp && +getComputedStyle(xapp).opacity < 0.5 ? root.querySelector(el.dataset.orbAlt) ?? el : el);
      const a = hold(center(alt(A))), b = center(alt(B));
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * -60;
      const sa = parseFloat(A.dataset.orbScale || '1'), sb = parseFloat(B.dataset.orbScale || '1'), s = sa + (sb - sa) * t;
      const form = t > 0.55 ? B.dataset.orb : A.dataset.orb;
      const k = first ? 1 : 0.22; first = false;
      ox += (x - ox) * k; oy += (y - oy) * k; os += (s - os) * k;
      if (form !== 'hide') orb.dataset.form = form;
      gsap.set(orb, { x: ox - 42, y: oy - 42, scale: os, opacity: (form === 'hide' ? 0 : 1) * (A.dataset.orb === 'hide' && t < 0.4 ? 0 : 1) });
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); segs.forEach((s) => s.kill()); window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [rootRef]);

  return (
    <div ref={orbRef} className="gh-orb" data-form="spark" aria-hidden="true">
      <div className="f spark" />
      <div className="f brief"><svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3" fill="#cce7ff" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="#0069e0" strokeWidth="1.8" strokeLinecap="round" /></svg></div>
      <div className="f badge"><svg width="44%" height="44%" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
    </div>
  );
}
