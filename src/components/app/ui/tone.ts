const TONES = ['#cce7ff', '#ffd1b8', '#d3f6e3', '#e4ccff', '#fff2be'];

/** Stable pastel for a name/id, from the demo's TONES set. */
export const toneFor = (seed: string) => TONES[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];

/** "Maya Patel" → "MP". */
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || '?';
