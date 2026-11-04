/* Deterministic contribution-heat helpers (ported from the approved prototype).
 * Used for the illustrative activity grids on gallery cards. */
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashS(str: string): number {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function heatLevels(seed: number, intensity: number, n: number): number[] {
  const r = mulberry(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const wk = (i / 5) | 0;
    const base = r() < 0.28 + intensity * 0.25 ? 0 : 1;
    let l = Math.round(r() * 3 * intensity * (0.6 + wk / 24));
    if (r() < 0.12) l = 4;
    out.push(clamp(base ? l : 0, 0, 4));
  }
  return out;
}
