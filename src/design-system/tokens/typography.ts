/**
 * Font stacks — mirrors `fontFamily` in tailwind.config.js, and the
 * --font-sans/--font-display/--font-accent/--font-mono CSS variables in
 * tokens/tokens.css (used by plain CSS that can't reach a Tailwind
 * utility class, e.g. index.css's bespoke per-page rules). Change a
 * family in all three places.
 */
export const fontFamily = {
  sans: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['Geist Variable', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  serif: ['Instrument Serif', 'Georgia', 'serif'],
  mono: ['Geist Mono Variable', 'Geist Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
} as const;

export const fontSize = {
  xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
  xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
} as const;

/** Genie display rule: weight 500, tracking tightens with size. */
export const display = { weight: 500, tracking: '-0.035em', trackingBody: '-0.01em' } as const;

export const fontWeight = {
  normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
} as const;
