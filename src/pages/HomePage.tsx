import { useRef, useState } from 'react';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';
import { IntroCurtain, INTRO_KEY } from '@/components/home/IntroCurtain';
import { HeroGenie } from '@/components/home/HeroGenie';
import { StorySentence } from '@/components/home/StorySentence';
import { ExpandingCard } from '@/components/home/ExpandingCard';
import { FrozenStack } from '@/components/home/FrozenStack';
import { WordBands } from '@/components/home/WordBands';
import { FeatureCards } from '@/components/home/FeatureCards';
import { ProjectArc } from '@/components/home/ProjectArc';
import { HomeCompanies } from '@/components/home/HomeCompanies';
import { Testimonials } from '@/components/home/Testimonials';
import { HomeFaq } from '@/components/home/HomeFaq';
import { ClosingLoop } from '@/components/home/ClosingLoop';
import { IdeaOrb } from '@/components/home/IdeaOrb';
import '@/components/home/home.css';

function introSeen() {
  try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch { return true; }
}

/**
 * Homepage — the approved Genie demo (docs/redesign/webloop-genie-demo.html),
 * section by section. The protected 3D Project Stack is mounted unchanged
 * through FrozenStack, straight after the expanding card's flood hands off
 * to it. Guest-only route (signed-in visitors go to /feed via HomeRoute).
 */
export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [playIntro] = useState(() => !reduced && !introSeen());
  const [ready, setReady] = useState(!playIntro);

  return (
    <div ref={rootRef} className="ghome">
      {playIntro && <IntroCurtain onDone={() => setReady(true)} />}
      <HeroGenie intro={playIntro} ready={ready} />
      <StorySentence />
      <ExpandingCard />
      <FrozenStack />
      <WordBands />
      <FeatureCards />
      <ProjectArc />
      <HomeCompanies />
      <Testimonials />
      <HomeFaq />
      <ClosingLoop />
      <IdeaOrb rootRef={rootRef} ready={ready} />
    </div>
  );
}

export default HomePage;
