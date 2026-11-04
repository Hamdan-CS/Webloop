/**
 * Font stacks — mirrors `fontFamily` in tailwind.config.js. Change a
 * family in both places (Tailwind needs the literal array for its
 * `font-sans`/`font-display`/`font-serif`/`font-mono` utilities to work).
 */
export const fontFamily = {
  sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['Bricolage Grotesque', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  serif: ['Instrument Serif', 'Georgia', 'serif'],
  mono: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
} as const;

export const fontSize = {
  xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
  xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
} as const;

export const fontWeight = {
  normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800,
} as const;
