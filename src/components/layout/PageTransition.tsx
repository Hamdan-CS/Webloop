import { cloneElement, isValidElement, Suspense, useLayoutEffect, type ReactElement, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollTrigger, easeOutArray } from '@/design-system/animations/gsap.config';
import { useLenis } from '@/design-system/motion/lenisContext';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';

/**
 * Route transitions (F4, replaces RouteStage). The old page fades into the
 * sky canvas (0.25s), then the new one rises 16px and fades in (0.45s,
 * Genie ease). Scroll-driven pages (/ and /how-it-works) get opacity only:
 * a moving parent would throw off their pin measurements. Suspense and the
 * route loader are kept exactly as before.
 *
 * `children` is the <Routes> element; it receives the captured location so
 * the exiting page keeps rendering its own route while it fades out.
 */
export function PageTransition({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const location = useLocation();
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const scrollDriven = location.pathname === '/' || location.pathname === '/how-it-works';

  // After each route change: jump to the top immediately (no smooth scroll
  // through the old page), then let every ScrollTrigger re-measure.
  useLayoutEffect(() => {
    if (location.hash) return;
    lenis?.scrollTo(0, { immediate: true, force: true });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.hash, lenis]);

  const routes = isValidElement(children)
    ? cloneElement(children as ReactElement<{ location?: unknown }>, { location })
    : children;

  const enter = reduced ? { duration: 0 } : { duration: 0.45, ease: easeOutArray };
  const leave = reduced ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' as const };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: scrollDriven || reduced ? 0 : 16 }}
        animate={{ opacity: 1, y: 0, transition: enter }}
        exit={{ opacity: 0, transition: leave }}
        // no transform left behind: fixed popups and GSAP pins inside the page keep working
        transformTemplate={(_, generated) => (generated === 'translateY(0px)' || generated === 'none' ? '' : generated)}
      >
        <Suspense fallback={fallback}>{routes}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
