/** Limits for the project Technologies picker and "What we built" list. */
export const MAX_SKILLS = 15;
export const MAX_HIGHLIGHTS = 12;
export const MAX_HIGHLIGHT_LEN = 160;

/** Trimmed, non-empty points, capped to the limits (what gets saved). */
export function cleanHighlights(rows: string[]): string[] {
  return rows
    .map((r) => r.trim().slice(0, MAX_HIGHLIGHT_LEN))
    .filter(Boolean)
    .slice(0, MAX_HIGHLIGHTS);
}
