import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

/**
 * Dark mode is switched off for the Genie redesign (BLUEPRINT section B).
 * While false the app is always light: stored preferences are ignored and
 * setTheme/toggleTheme are no-ops. Flip to true to bring dark mode back
 * (its token set still lives in tokens.css under :root/.dark).
 */
export const DARK_MODE_ENABLED = false;

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined' || !DARK_MODE_ENABLED) return 'light';
  const stored = localStorage.getItem('devloop-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

function applyThemeClass(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transitioning');
  }
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  window.dispatchEvent(new Event('themechange'));
  if (animate) {
    setTimeout(() => root.classList.remove('theme-transitioning'), 450);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeClass(theme, false);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (!DARK_MODE_ENABLED) t = 'light';
    setThemeState(t);
    localStorage.setItem('devloop-theme', t);
    applyThemeClass(t, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
