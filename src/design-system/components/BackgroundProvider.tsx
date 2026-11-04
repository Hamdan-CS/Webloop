import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { backgrounds, type BackgroundId } from '@/design-system/backgrounds/backgrounds';
import { BackgroundEffects } from '@/design-system/backgrounds/BackgroundEffects';

interface BackgroundContextValue {
  background: BackgroundId;
  setBackground: (b: BackgroundId) => void;
  backgrounds: typeof backgrounds;
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

export function useBackground() {
  const ctx = useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider');
  return ctx;
}

function getInitialBackground(): BackgroundId {
  if (typeof window === 'undefined') return 'none';
  const stored = localStorage.getItem('webloop-background');
  if (stored && stored in backgrounds) return stored as BackgroundId;
  return 'none';
}

/**
 * Renders the global background layer (see backgrounds/BackgroundEffects)
 * and exposes `useBackground()` so a settings UI can switch it. Defaults
 * to 'none' so existing pages (most of which already paint their own
 * background via bespoke CSS/canvas scenes) are unaffected until a page
 * opts in.
 */
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundId>(getInitialBackground);

  const setBackground = useCallback((b: BackgroundId) => {
    setBackgroundState(b);
    localStorage.setItem('webloop-background', b);
  }, []);

  return (
    <BackgroundContext.Provider value={{ background, setBackground, backgrounds }}>
      <BackgroundEffects background={background} />
      {children}
    </BackgroundContext.Provider>
  );
}
