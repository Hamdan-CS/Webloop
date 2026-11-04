import gsap from 'gsap';
import { duration, easing, prefersReducedMotion } from './gsap.config';

/**
 * Reusable GSAP presets for common entrance/hover motion. Each one is a
 * no-op (or an instant snap) when the visitor has reduced-motion set.
 * New components should reach for these instead of hand-rolling a tween;
 * existing scene engines keep their own bespoke animation code for now.
 */

export function fadeInUp(target: gsap.TweenTarget, opts: { delay?: number } = {}) {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, y: 0 });
    return;
  }
  return gsap.fromTo(
    target,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: duration.base, ease: easing.standard, delay: opts.delay ?? 0 },
  );
}

export function staggerReveal(targets: gsap.TweenTarget, opts: { stagger?: number } = {}) {
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0 });
    return;
  }
  return gsap.fromTo(
    targets,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: duration.base, ease: easing.standard, stagger: opts.stagger ?? 0.08 },
  );
}

export function hoverLift(el: Element) {
  if (prefersReducedMotion()) return { enter: () => {}, leave: () => {} };
  return {
    enter: () => gsap.to(el, { y: -4, duration: duration.fast, ease: easing.standard }),
    leave: () => gsap.to(el, { y: 0, duration: duration.fast, ease: easing.standard }),
  };
}

export function popIn(target: gsap.TweenTarget) {
  if (prefersReducedMotion()) {
    gsap.set(target, { opacity: 1, scale: 1 });
    return;
  }
  return gsap.fromTo(
    target,
    { opacity: 0, scale: 0.92, y: 6 },
    { opacity: 1, scale: 1, y: 0, duration: duration.base, ease: easing.bounce },
  );
}
