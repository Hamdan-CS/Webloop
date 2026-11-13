/** Mirrors the shadow-related CSS variables in tokens.css and the `boxShadow` extension in tailwind.config.js. */
export const shadows = {
  glow: '0 0 0 1px var(--glow-border)',
  card: '0 1px 0 0 var(--card-inner) inset, 0 1px 24px -12px var(--card-shadow)',
  glass: 'var(--glass-shadow)',
  glassLg: 'var(--glass-shadow-lg)',
  // Genie (F2)
  float: '0 14px 20px 4px rgba(4, 69, 144, .08)',
  btn: '0 1px 2px rgba(10, 13, 18, .8), 0 0 0 1px #0a0d12',
} as const;

export const blur = {
  panel: '14px',
  particleGlowDark: '56px',
  particleGlowLight: '64px',
} as const;
