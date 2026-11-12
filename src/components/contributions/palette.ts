/** Reads the app's own CSS variables so the grid always matches the active theme (light/dark) — no hardcoded colours. */
function cssColor(expr: string): string {
  const probe = document.createElement('div');
  probe.style.color = expr;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

export function isLightTheme(): boolean {
  return document.documentElement.classList.contains('light');
}

/** 5-step GitHub-style blue scale from the --heat-* tokens (Genie, F7), lightest -> 5-star day. */
export function ratingSteps(): string[] {
  return [
    cssColor('var(--heat-1)'),
    cssColor('var(--heat-2)'),
    cssColor('var(--heat-3)'),
    cssColor('var(--heat-4)'),
    cssColor('rgb(var(--accent-700))'),
  ];
}

/** Empty-day tile: the palest blue, not grey. */
export function tileGrey(): string {
  return cssColor('var(--heat-0)');
}

export function mutedColor(): string {
  return cssColor('rgb(var(--slate-500))');
}

export function bgColor(): string {
  return cssColor('rgb(var(--ink-950))');
}

/** Maps a 1-5 average rating onto the 5-step blue scale; null/0 (empty day) -> grey. */
export function colorForRating(avgRating: number | null, steps: string[], grey: string): string {
  if (avgRating === null || avgRating <= 0) return grey;
  const idx = Math.min(steps.length - 1, Math.max(0, Math.round(avgRating) - 1));
  return steps[idx];
}
