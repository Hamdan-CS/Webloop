import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { useLenis } from '@/design-system/motion/lenisContext';
import { STICK, stickerSVG } from '@/components/genie/stickers';
import { heroDecor } from './genieMarkup';

const SETS: [string, string[]][] = [['students', ['cap']], ['companies', ['brief', 'laptop']], ['universities', ['campus', 'book', 'cap']]];

/**
 * 1 · Hero. The rotating word rolls out letter by letter and the next rolls
 * in; the sticker bubbles change count 1 → 2 → 3 with it (every 2.8s, the
 * demo's values). Clouds and clay objects drift apart as the hero scrolls
 * away. Reduced motion: first word, no roll.
 */
export function HeroGenie({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const rotRef = useRef<HTMLSpanElement>(null);
  const bubsRef = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    const rot = rotRef.current, bubs = bubsRef.current;
    if (!rot || !bubs) return;
    let k = 0;
    let cur: HTMLElement | null = null;
    const word = (w: string) => { const el = document.createElement('span'); el.className = 'gh-rw'; el.innerHTML = [...w].map((c) => `<span class="gh-ch">${c}</span>`).join(''); return el; };
    const bub = (ic: string) => { const i = document.createElement('i'); i.style.background = STICK[ic][0]; i.innerHTML = stickerSVG(ic); return i; };
    const fit = () => { if (cur) rot.style.width = `${Math.ceil(cur.getBoundingClientRect().width) + 2}px`; };
    const show = (n: number, first?: boolean) => {
      const [w, ics] = SETS[n];
      const el = word(w), old = cur;
      rot.appendChild(el); cur = el; fit();
      const olds = [...bubs.querySelectorAll('i')], fresh = ics.map(bub);
      if (first || reduced) { old?.remove(); olds.forEach((o) => o.remove()); fresh.forEach((f) => bubs.appendChild(f)); return; }
      gsap.to(old!.querySelectorAll('.gh-ch'), { yPercent: -110, stagger: 0.02, duration: 0.42, ease: 'power2.in', onComplete: () => old!.remove() });
      gsap.fromTo(el.querySelectorAll('.gh-ch'), { yPercent: 110 }, { yPercent: 0, stagger: 0.03, duration: 0.85, ease: 'expo.out', delay: 0.18 });
      gsap.to(olds, {
        scale: 0, duration: 0.28, stagger: { each: 0.04, from: 'end' }, ease: 'back.in(2)', onComplete: () => {
          olds.forEach((o) => o.remove()); fresh.forEach((f) => bubs.appendChild(f));
          gsap.fromTo(fresh, { scale: 0, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.6, stagger: 0.09, ease: 'back.out(2.4)' });
        },
      });
    };
    show(0, true);
    addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    const iv = reduced ? 0 : window.setInterval(() => { if (document.hidden) return; k = (k + 1) % SETS.length; show(k); }, 2800);
    return () => { window.clearInterval(iv); removeEventListener('resize', fit); rot.replaceChildren(); bubs.replaceChildren(); };
  }, [reduced]);

  // hero clouds drift apart as you leave (first echo of the intro)
  useScrollScene(ref, (mm) => {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.gh-hc').forEach((c) => gsap.to(c, {
        xPercent: 40 * parseFloat(c.dataset.px ?? '0'), yPercent: -60, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true },
      }));
    });
  });

  const toHow = (e: React.MouseEvent) => {
    const t = document.getElementById('how');
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.6 }); else t.scrollIntoView();
  };

  return (
    <section ref={ref} className="gh-hero" id="top">
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: heroDecor }} />
      <h1 aria-label="Where students, companies and universities build real projects.">
        <span className="gh-ln" aria-hidden="true"><span><span>Where</span><span ref={rotRef} className="gh-rot" /><span ref={bubsRef} className="gh-bubs" /></span></span>
        <span className="gh-ln" aria-hidden="true"><span><span>build</span><span className="gh-acc">real projects.</span></span></span>
      </h1>
      <p className="gh-lead gh-hero-fade">Team up on real briefs. Every contribution is reviewed and verified, so your portfolio proves what you actually built.</p>
      <div className="gh-ctas gh-hero-fade">
        <Link className="gh-pill gh-dark" to="/join">Join WebLoop <span className="gh-arr">→</span></Link>
        <a className="gh-pill gh-light" href="#how" onClick={toHow}>See how it works</a>
      </div>
      <div className="gh-orb-home gh-hero-fade" data-orb="spark" data-orb-scale="1"><span className="gh-chip gh-orb-tag">this is your idea</span></div>
    </section>
  );
}
