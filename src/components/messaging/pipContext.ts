import { createContext, useContext } from 'react';

export type PipCorner = 'br' | 'bl' | 'tr' | 'tl';

export interface PipApi {
  open: boolean;
  /** Chat open inside the PiP (null = conversation list). */
  conversationId: string | null;
  minimised: boolean;
  corner: PipCorner;
  /** Show the PiP (whole Messages section), optionally on one chat. */
  openPip(conversationId: string | null): void;
  closePip(): void;
  setMinimised(on: boolean): void;
  setConversation(id: string | null): void;
  setCorner(c: PipCorner): void;
  /** Last page outside /messages — where "Pop out" sends the user back to. */
  returnPath: string;
}

export const PipContext = createContext<PipApi | null>(null);

export function usePip(): PipApi | null {
  return useContext(PipContext);
}
