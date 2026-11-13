import { createContext, useContext } from 'react';
import type Lenis from 'lenis';

/** The app's Lenis instance (null when reduced motion turns smooth scroll off). */
export const LenisContext = createContext<Lenis | null>(null);

export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}
