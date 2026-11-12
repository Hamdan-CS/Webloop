import { createContext, useContext } from 'react';

export interface WorkspaceTab { id: string; path: string }
export interface TabsApi {
  tabs: WorkspaceTab[];
  activeId: string;
  closed: string[];
  /** Switch to a tab (navigates to its route). */
  switchTo(id: string): void;
  /** Open a route in a new tab; background tabs don't take focus. */
  open(path: string, opts?: { background?: boolean }): void;
  close(id: string): void;
  reorder(fromId: string, toId: string): void;
  newTab(): void;
  reopenClosed(path: string): void;
}

export const TabsContext = createContext<TabsApi | null>(null);

export function useTabs(): TabsApi {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs must be used inside TabsProvider');
  return ctx;
}

export const NEW_TAB_PATH = '/new-tab';
export const MAX_TABS_BEFORE_SHRINK = 12;
