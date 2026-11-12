import { createContext, useContext } from 'react';
import type { Project } from '@/types';

export interface WorkspaceApi {
  /** The signed-in user's own + joined projects (same calls My Projects uses). */
  projects: Project[];
  isAdmin: boolean;
  openPalette(): void;
  openMessages(): void;
  backToSite(): void;
}
export const WorkspaceContext = createContext<WorkspaceApi | null>(null);
export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside AppShell');
  return ctx;
}

/** Stable colour dot for a project (the demo's YOUR PROJECTS palette). */
const DOTS = ['#3d8ef5', '#12996a', '#8f6be8', '#f0a92a', '#e7743a', '#0069e0'];
export const projectDot = (seed: string) => DOTS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % DOTS.length];
