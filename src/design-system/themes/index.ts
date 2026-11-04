import { dark } from './dark';
import { light } from './light';
import { glass } from './glass';
import { minimal } from './minimal';

export { dark, light, glass, minimal };

export type ThemeId = typeof dark.id | typeof light.id;
export type PresetId = 'default' | typeof glass.id | typeof minimal.id;

export const themes = { dark, light } as const;

/**
 * Visual presets layer on top of the dark/light theme. 'default' means
 * "no preset" — the app's current, only-ever-shipped look (ported from the
 * approved HTML reference). glass/minimal are new, real, working presets;
 * premium-dark and clean-light (requested in the brief) are intentionally
 * left for a follow-up — see DESIGN-SYSTEM.md "Adding a new preset".
 */
export const presets: Record<PresetId, { id: PresetId; label: string; description?: string }> = {
  default: { id: 'default', label: 'Default (reference)', description: 'The current, shipped WebLoop look.' },
  glass: glass,
  minimal: minimal,
};
