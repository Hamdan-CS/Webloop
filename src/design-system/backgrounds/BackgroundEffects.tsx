import { AmbientBackground } from './AmbientBackground';
import type { BackgroundId } from './backgrounds';

interface BackgroundEffectsProps {
  background: BackgroundId;
}

/**
 * Renders the currently selected global background preset. Mount once
 * near the app root (see DesignProvider) — individual pages that need a
 * heavier, bespoke background (the canvas/WebGL scenes) render their own
 * and should leave `background="none"` to avoid stacking two layers.
 */
export function BackgroundEffects({ background }: BackgroundEffectsProps) {
  if (background === 'ambient-glow') return <AmbientBackground />;
  if (background === 'grid') {
    return (
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    );
  }
  return null;
}
