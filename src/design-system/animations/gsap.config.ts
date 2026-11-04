import gsap from 'gsap';

/**
 * Shared GSAP defaults. Call once at app startup (DesignProvider does this).
 * Individual scene engines (components/scenes/*) currently set up their own
 * gsap/ScrollTrigger instances and are NOT migrated to read these defaults
 * yet — see DESIGN-SYSTEM.md "Known limitations" for the incremental plan.
 */
export function configureGsapDefaults() {
  gsap.defaults({ ease: 'power3.out', duration: 0.6 });
}

export const easing = {
  standard: 'power3.out',
  emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  bounce: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
} as const;

export const duration = {
  fast: 0.2,
  base: 0.4,
  slow: 0.7,
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
