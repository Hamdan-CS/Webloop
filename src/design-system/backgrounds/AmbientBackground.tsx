/**
 * A fixed, full-viewport radial glow using the theme's accent/glow tokens.
 * Purely decorative, pointer-events disabled, sits behind page content
 * (z-index 0) — safe to mount once near the app root.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(60% 50% at 50% 0%, var(--radial-glow-color), var(--body-radial-fade) 70%)',
      }}
    />
  );
}
