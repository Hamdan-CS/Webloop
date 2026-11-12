import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene, SCENE_MEDIA } from '@/design-system/motion/useScrollScene';
import { Cloud } from '@/design-system/illustrations/Cloud';
import { LoopMark } from '@/design-system/illustrations/LoopMark';

/**
 * 11 · Ending: the intro in reverse (pinned 160%, scrub .8). Clouds close in
 * from both sides, the copy rises, and the loop draws itself closed under
 * the verified badge. Mobile / reduced motion: final state, no pin.
 */
export function ClosingLoop() {
  const ref = useRef<HTMLElement>(null);

  useScrollScene(ref, (mm) => {
    mm.add(SCENE_MEDIA.desktop, () => {
      gsap.set('.gh-seal .g-loop-path', { strokeDashoffset: 1 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=160%', pin: true, scrub: 0.8 } });
      tl.fromTo('.gh-side.l', { xPercent: -80, scale: 1.25 }, { xPercent: 0, scale: 1, ease: 'power2.out', duration: 1 }, 0)
        .fromTo('.gh-side.r', { xPercent: 80, scale: 1.25 }, { xPercent: 0, scale: 1, ease: 'power2.out', duration: 1 }, 0)
        .fromTo('.gh-end-copy', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.1)
        .to('.gh-seal .g-loop-path', { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, 0.8)
        .to('.gh-seal > span:last-child', { opacity: 1, duration: 0.3 }, 1.3)
        .to({}, { duration: 0.3 });
    });
  });

  return (
    <section ref={ref} className="gh-end" id="end" aria-labelledby="gh-end-h">
      <div className="gh-end-copy">
        <span className="gh-mono" style={{ color: '#2a5a97' }}>Open beta</span>
        <h2 id="gh-end-h" style={{ marginTop: 16 }}>Close the <span className="acc">loop.</span></h2>
        <p className="gh-lead">Bring the idea. We'll bring the team, the brief and the proof.</p>
        <div className="gh-ctas">
          <Link className="gh-pill dark" to="/join">Join WebLoop <span className="arr">→</span></Link>
          <Link className="gh-pill light" to="/explore">Browse projects</Link>
        </div>
      </div>
      <div className="gh-side l" aria-hidden="true">
        <Cloud tone="white" width="70%" style={{ left: 0, bottom: 0 }} />
        <Cloud tone="sky" width="60%" style={{ left: '30%', bottom: '20%' }} />
        <Cloud tone="white" width="58%" style={{ left: '52%', bottom: '-6%' }} />
      </div>
      <div className="gh-side r" aria-hidden="true">
        <Cloud tone="sky" width="72%" style={{ right: 0, bottom: '-4%' }} />
        <Cloud tone="white" width="58%" style={{ right: '32%', bottom: '18%' }} />
        <Cloud tone="sky" width="60%" style={{ right: '50%', bottom: '-8%' }} />
      </div>
      <div className="gh-seal">
        <span data-orb="badge" data-orb-scale="1.25" className="gh-end-orb" />
        <LoopMark width={140} draw />
        <span>Loop closed · idea → verified work</span>
      </div>
    </section>
  );
}
