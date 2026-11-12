import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { presets, type PresetId } from '@/design-system/themes';

interface PresetContextValue {
  preset: PresetId;
  setPreset: (p: PresetId) => void;
  presets: typeof presets;
}

const PresetContext = createContext<PresetContextValue | null>(null);

export function usePreset() {
  const ctx = useContext(PresetContext);
  if (!ctx) throw new Error('usePreset must be used within PresetProvider');
  return ctx;
}

/**
 * Look presets (glass / minimal) are switched off for the Genie redesign:
 * a preset saved by a visitor would override the new surfaces. Flip to
 * true to bring them back (presets.css is untouched).
 */
export const PRESETS_ENABLED = false;

function getInitialPreset(): PresetId {
  if (typeof window === 'undefined' || !PRESETS_ENABLED) return 'default';
  const stored = localStorage.getItem('webloop-preset');
  if (stored && stored in presets) return stored as PresetId;
  return 'default';
}

export function PresetProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<PresetId>(getInitialPreset);

  useEffect(() => {
    const root = document.documentElement;
    if (preset === 'default') {
      root.removeAttribute('data-preset');
    } else {
      root.setAttribute('data-preset', preset);
    }
  }, [preset]);

  const setPreset = useCallback((p: PresetId) => {
    if (!PRESETS_ENABLED) p = 'default';
    setPresetState(p);
    localStorage.setItem('webloop-preset', p);
  }, []);

  return (
    <PresetContext.Provider value={{ preset, setPreset, presets }}>
      {children}
    </PresetContext.Provider>
  );
}
