import { useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { ClayFace } from '@/design-system/illustrations/ClayFace';

const Word = ({ text }: { text: string }) => (
  <h2 className="gh-word" aria-label={text}>
    {[...text].map((ch, i) => <span key={i} aria-hidden="true">{ch}</span>)}
  </h2>
);

/**
 * 5 · Team / Build / Prove. Per band: the cloud edge slides in, letters rise
 * with a little random tilt (back.out), the sub-line fades, characters pop
 * and then float up across the band. Reduced motion: shown at rest.
 */
export function WordBands() {
  const ref = useRef<HTMLElement>(null);

  useScrollScene(ref, (mm) => {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.gh-band').forEach((b) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: b, start: 'top 75%', end: 'center 45%', scrub: 0.7 } });
        const edge = b.querySelector<HTMLElement>('.edge');
        if (edge) tl.fromTo(edge, { xPercent: edge.dataset.edge === 'l' ? -40 : 40 }, { xPercent: 0, ease: 'power2.out', duration: 1 }, 0);
        tl.from(b.querySelectorAll('.gh-word span'), { yPercent: 115, rotate: () => gsap.utils.random(-14, 14), opacity: 0, stagger: 0.07, ease: 'back.out(1.6)', duration: 0.7 }, 0.1)
          .from(b.querySelector('.sub'), { opacity: 0, y: 20, duration: 0.4 }, '-=.3');
        const who = b.querySelectorAll<HTMLElement>('[data-who]');
        who.forEach((w, i) => tl.from(w, { scale: 0, rotate: i ? 30 : -30, ease: 'back.out(2.4)', duration: 0.6 }, 0.3 + i * 0.15));
        who.forEach((w) => gsap.to(w, { yPercent: -40, ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: true } }));
      });
    });
  });

  return (
    <section ref={ref} className="gh-words" aria-label="Team, build, prove">
      <div className="gh-band b1">
        <div className="who" style={{ left: '14%', top: '24%' }} data-who><ClayFace tone="peach" size={110} /></div>
        <div className="who" style={{ right: '15%', top: '56%' }} data-who><ClayFace tone="lav" size={84} /></div>
        <div><Word text="Team" /><p className="sub">Find teammates by skill, time zone and availability.</p></div>
      </div>
      <div className="gh-band b2">
        <div className="edge" data-edge="l" aria-hidden="true"><svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice"><g fill="#ffffff"><circle cx="120" cy="150" r="110" /><circle cx="330" cy="120" r="140" /><circle cx="560" cy="170" r="90" /><circle cx="1180" cy="180" r="70" /><rect x="0" y="0" width="1440" height="40" /></g></svg></div>
        <div className="who" style={{ right: '16%', top: '22%' }} data-who><ClayFace tone="solar" size={104} /></div>
        <div><Word text="Build" /><p className="sub">Ship it in sprints, with tasks and commits in the open.</p></div>
      </div>
      <div className="gh-band b3">
        <div className="edge" data-edge="r" aria-hidden="true"><svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice"><g fill="#ebf5ff"><circle cx="260" cy="180" r="80" /><circle cx="900" cy="160" r="100" /><circle cx="1120" cy="120" r="150" /><circle cx="1350" cy="150" r="110" /><rect x="0" y="0" width="1440" height="40" /></g></svg></div>
        <div className="who" style={{ left: '16%', top: '30%' }} data-who><ClayFace tone="blue" size={112} /></div>
        <div>
          <Word text="Prove" />
          <p className="sub">Every merged commit and review lands on your portfolio, verified.</p>
          <span data-orb="badge" data-orb-scale=".8" style={{ display: 'block', width: 84, height: 84, margin: '28px auto 0' }} />
        </div>
      </div>
    </section>
  );
}
