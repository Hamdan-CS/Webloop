import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';
import { useLenis } from '@/design-system/motion/lenisContext';
import { Cloud } from '@/design-system/illustrations/Cloud';
import { ClayObject } from '@/design-system/illustrations/ClayObject';
import { HERO_WORDS, FACE_SETS } from './homeContent';

/**
 * 1 · Hero. Headline with a cycling word (students → companies →
 * universities) and three face bubbles that recolour with it. With
 * `intro`, the lines start masked and reveal once `ready` turns true;
 * otherwise they reveal on mount. Clouds and clay objects drift apart as
 * you scroll past.
 */
export function HeroGenie({ intro, ready }: { intro: boolean; ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const rotRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const [k, setK] = useState(0);
  const [prev, setPrev] = useState(-1);

  // measured width of the visible word, so the line reflows smoothly
  const [w, setW] = useState<number | undefined>();
  useLayoutEffect(() => {
    const b = rotRef.current?.querySelectorAll('b')[k] as HTMLElement | undefined;
    if (b) setW(b.offsetWidth);
  }, [k]);

  useEffect(() => {
    if (reduced) return;
    const iv = window.setInterval(() => {
      setK((cur) => { setPrev(cur); return (cur + 1) % HERO_WORDS.length; });
    }, 2600);
    return () => window.clearInterval(iv);
  }, [reduced]);

  // initial hidden state before the intro hands over
  useLayoutEffect(() => {
    if (!intro || reduced || !ref.current) return;
    const el = ref.current;
    gsap.set(el.querySelectorAll('h1 .ln > span'), { yPercent: 110 });
    gsap.set(el.querySelectorAll('.gh-hero-fade'), { opacity: 0, y: 24 });
    gsap.set(el.querySelectorAll('.gh-hc'), { opacity: 0, scale: 0.9 });
    gsap.set('.site-header', { yPercent: -150 });
    return () => { gsap.set('.site-header', { clearProps: 'transform' }); };
  }, [intro, reduced]);

  // reveal
  useEffect(() => {
    if (!ready || reduced || !ref.current) return;
    const el = ref.current;
    const tl = gsap.timeline();
    tl.fromTo(el.querySelectorAll('.gh-hc'), { opacity: intro ? 0 : 0.0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.2, stagger: 0.06, ease: 'power3.out' })
      .fromTo(el.querySelectorAll('h1 .ln > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out' }, '<.1')
      .fromTo(el.querySelectorAll('.gh-hero-fade'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, '<.35');
    if (intro) tl.fromTo('.site-header', { yPercent: -150 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', clearProps: 'transform' }, '<');
    return () => { tl.kill(); };
  }, [ready, reduced, intro]);

  // scroll: clouds and objects drift apart as the hero leaves
  useScrollScene(ref, (mm) => {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.gh-hc').forEach((c) => {
        gsap.to(c, {
          xPercent: 40 * parseFloat(c.dataset.px ?? '0'), yPercent: -60, ease: 'none',
          scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
    });
  });

  const toHow = (e: React.MouseEvent) => {
    const t = document.getElementById('how');
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.6 }); else t.scrollIntoView();
  };

  return (
    <section ref={ref} className="gh-hero" id="top" aria-labelledby="gh-hero-h">
      <span className="gh-hc gh-float" data-px="-1" style={{ left: '-5%', top: '58%', width: '30%' }}><Cloud tone="white" width="100%" /></span>
      <span className="gh-hc gh-float" data-px="1" style={{ right: '-6%', top: '52%', width: '32%' }}><Cloud tone="sky" width="100%" /></span>
      <span className="gh-hc gh-float" data-px="-.6" style={{ left: '4%', top: '18%', width: '14%' }}><Cloud tone="sky" width="100%" /></span>
      <span className="gh-hc gh-float" data-px=".7" style={{ right: '8%', top: '14%', width: '12%' }}><Cloud tone="white" width="100%" /></span>
      <span className="gh-hc gh-float" data-px="-.8" style={{ left: '15%', top: '38%' }}><ClayObject kind="star" size={58} /></span>
      <span className="gh-hc gh-float" data-px=".8" style={{ right: '16%', top: '36%' }}><ClayObject kind="note" size={64} /></span>

      <h1 id="gh-hero-h" aria-label="Where students, companies and universities build real projects.">
        <span className="ln" aria-hidden="true">
          <span>
            Where{' '}
            <span className="gh-rotline">
              <span className="gh-faces">
                {FACE_SETS[k].map((c, i) => <i key={i} style={{ background: c, transform: prev >= 0 ? undefined : 'none' }} />)}
              </span>
              <span ref={rotRef} className="gh-rot" style={{ width: w }}>
                {HERO_WORDS.map((word, i) => (
                  <b key={word} className={i === k ? 'on' : i === prev ? 'out' : ''}>{word}</b>
                ))}
              </span>
            </span>
          </span>
        </span>
        <span className="ln" aria-hidden="true"><span>build <span className="acc">real projects.</span></span></span>
      </h1>
      <p className="gh-lead gh-hero-fade">Team up on real briefs. Every contribution is reviewed and verified, so your portfolio proves what you actually built.</p>
      <div className="gh-ctas gh-hero-fade">
        <Link className="gh-pill dark" to="/join">Join WebLoop <span className="arr">→</span></Link>
        <a className="gh-pill light" href="#how" onClick={toHow}>See how it works</a>
      </div>
      <div className="gh-orb-home gh-hero-fade" data-orb="spark" data-orb-scale="1">
        <span className="gh-chip gh-orb-tag">this is your idea</span>
      </div>
    </section>
  );
}
