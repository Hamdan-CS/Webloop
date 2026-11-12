import { useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { words } from './genieMarkup';

/**
 * 5 · Team / Build / Prove: letters rise, cloud edges slide in, characters
 * pop and then float up across the band (demo timeline, exact values).
 */
export function WordBands() {
  const ref = useRef<HTMLElement>(null);

  useScrollScene(ref, (mm) => {
    const sec = ref.current!;
    sec.querySelectorAll<HTMLElement>('.gh-word').forEach((w) => {
      if (w.dataset.split) return;
      w.dataset.split = '1';
      w.innerHTML = [...(w.textContent ?? '')].map((ch) => `<span>${ch}</span>`).join('');
    });
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      sec.querySelectorAll<HTMLElement>('.gh-band').forEach((b) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: b, start: 'top 75%', end: 'center 45%', scrub: 0.7 } });
        const edge = b.querySelector<HTMLElement>('.gh-edge');
        if (edge) tl.fromTo(edge, { xPercent: edge.dataset.edge === 'l' ? -40 : 40 }, { xPercent: 0, ease: 'power2.out', duration: 1 }, 0);
        tl.from(b.querySelectorAll('.gh-word span'), { yPercent: 115, rotate: () => gsap.utils.random(-14, 14), opacity: 0, stagger: 0.07, ease: 'back.out(1.6)', duration: 0.7 }, 0.1)
          .from(b.querySelector('.gh-sub'), { opacity: 0, y: 20, duration: 0.4 }, '-=.3');
        const who = b.querySelectorAll<HTMLElement>('[data-who]');
        who.forEach((w, i) => tl.from(w, { scale: 0, rotate: i ? 30 : -30, ease: 'back.out(2.4)', duration: 0.6 }, 0.3 + i * 0.15));
        who.forEach((w) => gsap.to(w, { yPercent: -40, ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: true } }));
      });
    });
  });

  return <section ref={ref} className="gh-words" id="words" dangerouslySetInnerHTML={{ __html: words }} />;
}
