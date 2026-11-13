import { useEffect, useRef, useState } from 'react';
import { pauseCssLoopsOffscreen } from '@/components/home/offscreen';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';
import { useLenis } from '@/design-system/motion/lenisContext';
import { IntroCurtain, INTRO_KEY } from '@/components/home/IntroCurtain';
import { HeroGenie } from '@/components/home/HeroGenie';
import { StoryScene } from '@/components/home/StoryScene';
import { FrozenStack } from '@/components/home/FrozenStack';
import { WordBands } from '@/components/home/WordBands';
import { FeatureCards } from '@/components/home/FeatureCards';
import { ProjectArc } from '@/components/home/ProjectArc';
import { HomeCompanies } from '@/components/home/HomeCompanies';
import { Testimonials } from '@/components/home/Testimonials';
import { HomeFaq } from '@/components/home/HomeFaq';
import { EndLoop } from '@/components/home/EndLoop';
import { IdeaOrb } from '@/components/home/IdeaOrb';
import '@/components/home/genie-home.css';
import '@/components/home/genie-home-app.css';

function introSeen() {
  try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch { return true; }
}

/**
 * Homepage — the approved v4 demo (docs/redesign/webloop-genie-demo.html),
 * section by section: intro, hero, story (→ app → flood), the protected 3D
 * Project Stack (unchanged, via FrozenStack), Team/Build/Prove, expanding
 * feature cards, curved project arc, companies (3D city kept), testimonials,
 * FAQ with sticker trail, particle-loop ending. Guest-only route.
 */
export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const { hash } = useLocation();
  const [playIntro] = useState(() => !reduced && !introSeen());
  const [ready, setReady] = useState(!playIntro);

  // performance: pause the decorative CSS loops (marquees, floating object,
  // orb ring) while they are off-screen
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    return pauseCssLoopsOffscreen(root, '.gh-marq-t, .gh-tst-row, .gh-xc-obj .gh-mv, #gh-orb .gh-spark');
  }, [reduced, ready]);

  // arriving from another page via /#section: scroll there once laid out
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => {
      const t = document.querySelector(hash);
      if (t) { if (lenis) lenis.scrollTo(t as HTMLElement, { immediate: true }); else t.scrollIntoView(); }
    }, 600);
    return () => window.clearTimeout(id);
  }, [hash, lenis]);

  return (
    <div ref={rootRef} className={`ghome${reduced ? ' gh-rm' : ''}`}>
      {playIntro && <IntroCurtain onDone={() => setReady(true)} />}
      {!reduced && <IdeaOrb rootRef={rootRef} ready={ready} />}
      <HeroGenie reduced={reduced} />
      <StoryScene reduced={reduced} />
      {/* 4 · protected stack, untouched; the wrapper only carries the orb's resting anchor */}
      <section className="gh-stack-slot">
        <FrozenStack />
        <span data-orb="hide" style={{ display: 'block', width: 10, height: 10, margin: '0 auto' }} />
      </section>
      <WordBands />
      <FeatureCards />
      <ProjectArc reduced={reduced} />
      <HomeCompanies />
      <Testimonials />
      <HomeFaq reduced={reduced} />
      <EndLoop reduced={reduced} />
    </div>
  );
}

export default HomePage;
