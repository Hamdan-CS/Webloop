import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { PresetProvider } from './components/PresetProvider';
import { BackgroundProvider } from './components/BackgroundProvider';
import { configureGsapDefaults } from './animations/gsap.config';
import './themes/presets.css';

/**
 * Single entry point for the design system: composes the theme
 * (dark/light), the visual preset (default/glass/minimal) and the global
 * background layer, and configures shared GSAP defaults once.
 *
 * Replaces a bare <ThemeProvider> wrap in App.tsx. Nothing about
 * routing/auth/data providers changes — this slots in at the same spot.
 */
export function DesignProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    configureGsapDefaults();
  }, []);

  return (
    <ThemeProvider>
      <PresetProvider>
        <BackgroundProvider>{children}</BackgroundProvider>
      </PresetProvider>
    </ThemeProvider>
  );
}
