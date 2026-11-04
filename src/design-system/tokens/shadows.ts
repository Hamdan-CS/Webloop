/** Mirrors the shadow-related CSS variables in tokens.css and the `boxShadow` extension in tailwind.config.js. */
export const shadows = {
  glow: '0 0 0 1px var(--glow-border)',
  card: '0 1px 0 0 var(--card-inner) inset, 0 1px 24px -12px var(--card-shadow)',
  glass: 'var(--glass-shadow)',
  glassLg: 'var(--glass-shadow-lg)',
} as const;

export const blur = {
  panel: '14px',
  particleGlowDark: '56px',
  particleGlowLight: '64px',
} as const;
