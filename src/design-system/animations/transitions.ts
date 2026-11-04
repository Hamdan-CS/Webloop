/** Timing constants for page/route-level transitions. */
export const pageTransition = {
  durationMs: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** Mirrors the `.theme-transitioning` timing in index.css — keep in sync. */
export const themeTransition = {
  durationMs: 400,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
