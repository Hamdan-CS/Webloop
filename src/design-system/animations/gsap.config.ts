import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registered once for the whole app (F4). Scene files may still call
// registerPlugin themselves; GSAP ignores repeat registrations.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/**
 * Shared GSAP defaults. Call once at app startup (DesignProvider does this).
 */
export function configureGsapDefaults() {
  gsap.defaults({ ease: 'power3.out', duration: 0.6 });
}

export const easing = {
  standard: 'power3.out',
  emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  bounce: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
  /** Genie: fast start, gentle settle */
  genie: 'expo.out',
  out: 'cubic-bezier(.16,1,.3,1)',
} as const;

/** Same curve as --ease-out, for Framer Motion's `ease` arrays. */
export const easeOutArray = [0.16, 1, 0.3, 1] as const;

export const duration = {
  fast: 0.2,
  base: 0.4,
  slow: 0.7,
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
