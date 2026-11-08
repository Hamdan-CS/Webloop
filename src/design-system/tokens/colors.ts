/**
 * Typed mirror of the color variables defined in `tokens.css`.
 * Use this when a color is needed in JS/TS (canvas drawing, WebGL
 * uniforms, GSAP color tweens, chart series) rather than CSS —
 * everything else should keep using `var(--token-name)` in CSS/Tailwind.
 *
 * Keep in sync with tokens.css by hand; there is no build-time generator
 * for these yet (see DESIGN-SYSTEM.md "Known limitations").
 */

export const darkColors = {
  ink: {
    950: '#070a12', 900: '#0b0f1a', 850: '#0f1424', 800: '#141a2e',
    700: '#1c2440', 600: '#283156', 500: '#3a4476', 400: '#5b6896',
  },
  slate: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  accent: {
    50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9',
    400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490',
    800: '#155e75', 900: '#164e63',
  },
  signal: { green: '#34d399', amber: '#fbbf24', rose: '#fb7185', violet: '#a78bfa' },
  contentStrong: '#ffffff',
  bodyBg: '#070a12',
} as const;

export const lightColors = {
  ink: {
    950: '#f4f8fd', 900: '#fafbfe', 850: '#ffffff', 800: '#f1f5fb',
    700: '#e2e8f4', 600: '#cbd5e8', 500: '#94a3c0', 400: '#64748b',
  },
  slate: {
    50: '#0f172a', 100: '#1e293b', 200: '#334155', 300: '#475569',
    400: '#64748b', 500: '#475569', 600: '#334155', 700: '#1e293b',
    800: '#0f172a', 900: '#020617',
  },
  accent: {
    50: '#ecfeff', 100: '#ccfbf0', 200: '#0d6473', 300: '#0e7490',
    400: '#0891b2', 500: '#0e7490', 600: '#0e7490', 700: '#0d5a6c',
    800: '#155e75', 900: '#164e63',
  },
  signal: { green: '#037a56', amber: '#a16207', rose: '#be123c', violet: '#6d28d9' },
  contentStrong: '#0f172a',
  bodyBg: '#f4f8fd',
} as const;

export type DesignTheme = 'dark' | 'light';

export function getColors(theme: DesignTheme) {
  return theme === 'dark' ? darkColors : lightColors;
}

/**
 * Portfolio/project category palette — shared by WorkCard (gallery) and
 * anywhere else a project category needs a consistent color. Theme-
 * invariant by design (these color-code a category, not light/dark state).
 */
export const categoryColors: Record<string, string> = {
  'Web App': '#3b82f6',
  ML: '#2563eb',
  'Game / Engine': '#8b5cf6',
  'Backend / Infra': '#10b981',
  'Mobile App': '#ec4899',
  'Design / UI': '#f59e0b',
};
export const categoryColorDefault = '#3b82f6';

/** Small badge accents (banner "Hiring"/"New" chips) — theme-invariant. */
export const badgeAccentColors = {
  hiring: '#10b981',
  new: '#ec4899',
} as const;
