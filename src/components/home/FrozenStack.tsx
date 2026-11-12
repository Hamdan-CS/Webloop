import { lazy, Suspense, useEffect, useState } from 'react';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import StackTimeline from './StackTimeline';

/**
 * Wrapper for the protected Project Stack.
 * - Above 900px: the untouched 3D ProjectStackScene (same breakpoint where it pins).
 * - 900px and below: StackTimeline, a light vertical layout. The 3D chunk is never
 *   downloaded on phones, which removes the stack's mobile performance cost.
 * The wrapping <div> also keeps GSAP's pin-spacer inside this subtree, so React
 * never has to insert a sibling next to a node GSAP has moved.
 */
const ProjectStackScene = lazy(() => import('@/components/scenes/A-ProjectStack/ProjectStackScene'));

const MOBILE_QUERY = '(max-width: 900px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

export function FrozenStack() {
  const mobile = useIsMobile();
  // keyed: crossing the breakpoint replaces this whole div, so React never has to
  // remove the 3D section from inside GSAP's pin-spacer (which it doesn't own)
  return (
    <div key={mobile ? 'timeline' : '3d'} className="stack-frozen">
      {mobile ? (
        <StackTimeline />
      ) : (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><LoopLoader /></div>}>
          <ProjectStackScene />
        </Suspense>
      )}
    </div>
  );
}
