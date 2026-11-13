import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { PresetProvider } from './components/PresetProvider';
import { BackgroundProvider } from './components/BackgroundProvider';
import { configureGsapDefaults } from './animations/gsap.config';
import { SmoothScroll } from './motion/SmoothScroll';
import { GenieSprite } from '@/components/genie/GenieSprite';
import '@/components/layout/genie-shell.css';
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
        <BackgroundProvider>
          <GenieSprite />
          <SmoothScroll>{children}</SmoothScroll>
        </BackgroundProvider>
      </PresetProvider>
    </ThemeProvider>
  );
}
