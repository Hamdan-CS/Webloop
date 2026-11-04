export type BackgroundId = 'none' | 'ambient-glow' | 'grid';

export interface BackgroundConfig {
  id: BackgroundId;
  label: string;
  description: string;
}

/**
 * Background presets available to <BackgroundEffects>. These are
 * deliberately lightweight (a fixed gradient/blur layer), separate from
 * the bespoke canvas/WebGL hero scenes in components/scenes/ and
 * components/home/ParticleStage — those are a different, heavier system
 * and are not switched by this registry (see DESIGN-SYSTEM.md).
 */
export const backgrounds: Record<BackgroundId, BackgroundConfig> = {
  none: { id: 'none', label: 'None', description: 'No decorative background layer.' },
  'ambient-glow': {
    id: 'ambient-glow',
    label: 'Ambient glow',
    description: 'A soft, fixed radial accent glow behind page content.',
  },
  grid: {
    id: 'grid',
    label: 'Grid',
    description: 'A faint fixed grid pattern behind page content.',
  },
};
