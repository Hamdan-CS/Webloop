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
    950: '#ebf5ff', 900: '#fafdff', 850: '#ffffff', 800: '#dde8f5',
    700: '#c9d8ec', 600: '#a8b8ce', 500: '#828d9e', 400: '#636872',
  },
  slate: {
    50: '#0a0d12', 100: '#0a0d12', 200: '#181d27', 300: '#535862',
    400: '#636872', 500: '#707680', 600: '#535862', 700: '#353a44',
    800: '#181d27', 900: '#0a0d12',
  },
  accent: {
    50: '#ebf5ff', 100: '#cce7ff', 200: '#0054b8', 300: '#0069e0',
    400: '#0069e0', 500: '#0060cc', 600: '#0054b8', 700: '#00489e',
    800: '#003a80', 900: '#002d63',
  },
  signal: { green: '#087443', amber: '#a15c07', rose: '#b42318', violet: '#6d28d9' },
  contentStrong: '#0a0d12',
  bodyBg: '#ebf5ff',
} as const;

/**
 * Genie semantic palette (F2) — mirrors the hex tokens in the first :root
 * block of tokens.css. 3D scenes read these when they are recoloured (F7).
 */
export const genie = {
  sky: '#ebf5ff', card: '#fafdff', paper: '#ffffff', mist: '#f6f7f8', stackBg: '#f4f8fd',
  ink: '#0a0d12', charcoal: '#181d27', graphite: '#535862', fog: '#93979f', line: '#dde8f5',
  iris: '#0069e0', irisHi: '#479dff',
  lav: '#f1e6ff', mint: '#d3f6e3', powder: '#cce7ff', solar: '#fff2be', peach: '#ffe2d1',
  ok: '#087443', okBg: '#e4f6ec', warn: '#a15c07', warnBg: '#fff3dc', danger: '#b42318', dangerBg: '#fdecea',
  /** contribution graph levels, empty → busiest */
  heat: ['#eef5ff', '#bcd8ff', '#7cb5ff', '#3d8ef5', '#0060cc'],
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
