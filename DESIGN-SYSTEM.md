# Design system

One place to change how WebLoop looks: `src/design-system/`. This document
is how to actually use it — what's real today, what's scaffolded for you to
extend, and what's explicitly out of scope.

## How it's wired up

`App.tsx` wraps the whole app in `<DesignProvider>` (from
`design-system/DesignProvider.tsx`), which composes three independent
providers:

- **`ThemeProvider`** (`design-system/components/ThemeProvider.tsx`) — dark
  vs. light. `useTheme()` gives you `{ theme, setTheme, toggleTheme }`.
  Persisted to `localStorage` under `devloop-theme`. This is the same
  provider that existed before the migration, just moved — its public API
  didn't change.
- **`PresetProvider`** (`design-system/components/PresetProvider.tsx`) — the
  visual preset: `default` / `glass` / `minimal`. `usePreset()` gives you
  `{ preset, setPreset, presets }`. Persisted under `webloop-preset`. Setting
  a preset puts `data-preset="glass"` (or `"minimal"`) on `<html>`.
- **`BackgroundProvider`** (`design-system/components/BackgroundProvider.tsx`)
  — an optional global background layer (`none` / `ambient-glow` / `grid`).
  `useBackground()` gives you `{ background, setBackground, backgrounds }`.
  Defaults to `none` so it doesn't fight with pages that already paint their
  own background.

None of these have a settings UI yet — wire up a toggle anywhere with
`usePreset()`/`useBackground()`/`useTheme()` the same way `ThemeToggle.tsx`
already does for theme.

## How to change things

| I want to change... | Edit this |
|---|---|
| A color (any color in the app) | `design-system/tokens/tokens.css` — find the `--token-name` under `:root,.dark` (and `.light` if it should differ) |
| Font families | `design-system/tokens/typography.ts` **and** `tailwind.config.js`'s `fontFamily` (both need the same array — Tailwind reads its own copy) |
| Shadow/radius/blur values | `design-system/tokens/shadows.ts`, `radius.ts` |
| What `glass`/`minimal` presets actually do | `design-system/themes/presets.css` — add a rule under `html[data-preset="..."] .your-class` |
| The default background layer | `design-system/backgrounds/backgrounds.ts` + `BackgroundEffects.tsx` |
| Animation timing/easing defaults | `design-system/animations/gsap.config.ts` |
| A reusable entrance/hover animation | `design-system/animations/motion-presets.ts` — `fadeInUp`, `staggerReveal`, `hoverLift`, `popIn` |

Tokens are the single source of truth for color: `tokens.css` is what the
app actually renders (Tailwind's `colors.slate/ink/accent/signal` in
`tailwind.config.js` read these CSS variables directly, so `bg-ink-900`,
`text-accent-400`, etc. are already theme-aware). `tokens/colors.ts` is a
**typed JS mirror** of the same values, for code that needs a literal color
outside of CSS — canvas/WebGL drawing, chart series, GSAP color tweens.
**There is no build step that generates one from the other** — if you
change a color's hue, update both files. This is the one honest gap in
"single source of truth"; see "Known limitations" below.

## Adding a new preset

The brief asked for five presets (Cirrel glassmorphism, modern minimal
SaaS, premium dark, clean light, futuristic ambient). Two are implemented
end-to-end (`glass`, `minimal`); `default` is the app's original look.
**`premium-dark` and `clean-light` are scaffolded conceptually but not
built** — adding one is:

1. Add `design-system/themes/premium-dark.ts` exporting `{ id, label, description }`.
2. Register it in `design-system/themes/index.ts`'s `presets` map and `PresetId` type.
3. Add `html[data-preset="premium-dark"] .surface, .surface-raised, .chip, .btn-primary { ... }` rules to `presets.css`.
4. That's it — `PresetProvider` and the `usePreset()` hook already handle any registered preset id.

## Using the shared card component

`design-system/components/GlassCard.tsx` wraps the existing `.surface` /
`.surface-raised` classes as a component:

```tsx
import { GlassCard } from '@/design-system';

<GlassCard raised className="p-6">...</GlassCard>
```

New panels should reach for this instead of hand-writing
`className="surface-raised ..."` — it's the same CSS, just named and
typed, and it already responds to theme/preset changes.

## Known limitations (read before assuming something is "done")

- **Preset coverage is global-surfaces-only.** `glass`/`minimal` restyle the
  *shared* classes (`.surface`, `.surface-raised`, `.chip`, `.btn-*`)
  defined in `index.css`'s `@layer components`. They do **not** retarget
  the large amount of page-specific bespoke CSS still in `index.css`
  (`.home-redesign`, `.how-*`, `.eco-*`, `.stack-*`, `.team-*`, `.auth-*`,
  etc.) or the inline styles inside `components/scenes/*`. Switching a
  preset today visibly changes cards/buttons/chips app-wide; it does not
  yet reskin the home page hero or the scene illustrations.
- **Scene engines are not migrated.** The 9 canvas/GSAP engines under
  `components/scenes/*` keep their own hand-rolled animation setup. They
  were judged too risky to rewrite in this pass (no automated visual
  regression coverage, imperative lifecycle/cleanup code). Migrating them
  to `design-system/animations/motion-presets.ts` is the natural next step,
  one scene at a time.
- **No CSS-from-TS code generation.** `tokens.css` and `tokens/*.ts` are
  maintained by hand in parallel, not generated from one source. If this
  becomes a real pain point, introducing something like Style Dictionary to
  generate `tokens.css` from the TS files would close this gap — intentionally
  not done here to avoid adding new build tooling in the same pass as a
  structural refactor.
- **Illustrative/decorative colors were deliberately left hardcoded** —
  Google's official brand icon colors (`GoogleIcon.tsx`), the macOS-style
  traffic-light dots and fixed-dark "browser mockup" panel in
  `ProjectStackScene`, and a handful of one-off SVG gradient stops with no
  matching token. These are either legally fixed (Google) or deliberately
  theme-invariant illustrations, not oversights.
