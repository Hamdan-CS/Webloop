import { useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene, SCENE_MEDIA } from '@/design-system/motion/useScrollScene';

/**
 * 2 · Story sentence (pinned 160%, scrub .6). Five icons fly in from an
 * ellipse to their gaps while the words light up one by one; the label
 * fades last. Mobile and reduced motion show the sentence assembled.
 */
export function StorySentence() {
  const ref = useRef<HTMLElement>(null);

  useScrollScene(ref, (mm) => {
    mm.add(SCENE_MEDIA.desktop, () => {
      const icos = gsap.utils.toArray<HTMLElement>('[data-ico]');
      const words = gsap.utils.toArray<HTMLElement>('.gh-sentence .w');
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=160%', pin: true, scrub: 0.6 } });
      icos.forEach((ic, i) => {
        const a = (i / icos.length) * Math.PI * 2 + 0.6;
        tl.fromTo(ic,
          { x: () => Math.cos(a) * innerWidth * 0.38, y: () => Math.sin(a) * innerHeight * 0.34 - 40, rotate: (i % 2 ? 1 : -1) * 28, scale: 1.4 },
          { x: 0, y: 0, rotate: 0, scale: 1, ease: 'power3.inOut', duration: 1 }, i * 0.25);
      });
      words.forEach((w, i) => tl.to(w, { opacity: 1, duration: 0.1, ease: 'none' }, 0.2 + i * (1.6 / words.length)));
      tl.to('.label', { opacity: 0, y: -20, duration: 0.3 }, '+=.2');
    });
  });

  return (
    <section ref={ref} className="gh-story" id="how" aria-label="How WebLoop works">
      <div className="gh-story-in">
        <div className="label">Start with a brief. Not a blank page.</div>
        <p className="gh-sentence">
          <span className="w">WebLoop takes your</span>{' '}
          <span className="gh-ico slot" data-orb="spark" data-orb-scale=".62" />{' '}
          <span className="w">idea,</span>{' '}
          <span className="w">finds the</span>{' '}
          <span className="gh-ico peach" data-ico aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.4" fill="#e7743a" /><circle cx="16.5" cy="10" r="2.6" fill="#f2a06e" /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M13.5 18.5c.5-2.3 1.8-3.6 3.3-3.6s2.8 1.3 3.3 3.6" stroke="#e7743a" strokeWidth="2" fill="none" strokeLinecap="round" /></svg></span>{' '}
          <span className="w">people,</span>{' '}
          <span className="w">a</span>{' '}
          <span className="gh-ico aqua" data-ico aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="3" fill="#3d8ef5" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="#0069e0" strokeWidth="2" fill="none" /></svg></span>{' '}
          <span className="w">company brief</span>{' '}
          <span className="w">and a</span>{' '}
          <span className="gh-ico lav" data-ico aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4 2.5 9 12 14l9.5-5z" fill="#8f6be8" /><path d="M6.5 11.5v4c1.6 1.6 3.4 2.4 5.5 2.4s3.9-.8 5.5-2.4v-4" stroke="#8f6be8" strokeWidth="2" fill="none" /></svg></span>{' '}
          <span className="w">mentor,</span>{' '}
          <span className="w">then turns the work into</span>{' '}
          <span className="gh-ico mint" data-ico aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="#1fa968" /><path d="M8 12.3l2.7 2.7L16 9.6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{' '}
          <span className="w">verified</span> <span className="acc w">proof.</span>
        </p>
      </div>
    </section>
  );
}
