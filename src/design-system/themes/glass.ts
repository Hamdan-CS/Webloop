/**
 * "Cirrel-inspired glassmorphism" preset — a visual preset, independent of
 * the dark/light theme. Applied via `data-preset="glass"` on <html>
 * (see presets.css). Heavier blur, more translucency, brighter glass edges
 * on top of whichever theme (dark/light) is currently active.
 */
export const glass = {
  id: 'glass',
  label: 'Glassmorphism',
  description: 'Heavier blur, translucent panels, bright glass edges.',
} as const;
