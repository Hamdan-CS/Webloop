import { useCallback } from 'react';
import { WEBI, type WebiMood } from './webi.config';
import type { WebiMoodEventDetail } from './webiEngine';

/** Fire a mood from anywhere (also usable outside React). No-op when Webi isn't mounted. */
export function setWebiMood(mood: WebiMood, ms: number = WEBI.triggers.forcedDefaultMs, say?: string) {
  window.dispatchEvent(new CustomEvent<WebiMoodEventDetail>('webi:mood', { detail: { mood, ms, say } }));
}

/**
 * For home-page components: `const { setMood } = useWebi(); setMood('error', 2800, "That didn't work.")`.
 * Goes through the `webi:mood` window event, so it never needs a context provider.
 */
export function useWebi() {
  const setMood = useCallback((mood: WebiMood, ms?: number, say?: string) => setWebiMood(mood, ms, say), []);
  return { setMood };
}
