import type { Project } from '@/types';
import type { IconName } from '../icons';
import { NEW_TAB_PATH } from './tabsContext';
import { projectDot } from '../workspaceContext';

export interface TabMeta { title: string; icon?: IconName; dot?: string }

const STATIC: [RegExp, TabMeta][] = [
  [/^\/dashboard\//, { title: 'Home', icon: 'home' }],
  [/^\/feed/, { title: 'Feed', icon: 'feed' }],
  [/^\/my-projects/, { title: 'Projects', icon: 'proj' }],
  [/^\/explore/, { title: 'Explore', icon: 'expl' }],
  [/^\/gallery/, { title: 'Student work', icon: 'expl' }],
  [/^\/companies/, { title: 'Companies', icon: 'expl' }],
  [/^\/my-applications/, { title: 'Applications', icon: 'proj' }],
  [/^\/my-invitations/, { title: 'Invitations', icon: 'msg' }],
  [/^\/publish/, { title: 'New project', icon: 'plus' }],
  [/^\/build-profile/, { title: 'Build profile', icon: 'port' }],
  [/^\/settings/, { title: 'Settings', icon: 'gear' }],
  [/^\/admin\/moderation/, { title: 'Moderation', icon: 'gear' }],
];

const pretty = (s: string) => decodeURIComponent(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Title + icon (or project colour dot) for a tab, from its route. */
export function tabMeta(path: string, projects: Project[], ownHandle?: string | null): TabMeta {
  const p = path.split('?')[0];
  if (p === NEW_TAB_PATH) return { title: 'New tab', icon: 'tab' };
  const proj = p.match(/^\/projects\/([^/]+)/);
  if (proj) {
    const hit = projects.find((x) => x.slug === proj[1]);
    return { title: hit?.title ?? pretty(proj[1]), dot: projectDot(proj[1]) };
  }
  const cr = p.match(/^\/creators\/([^/]+)/);
  if (cr) return cr[1] === ownHandle ? { title: 'Portfolio', icon: 'port' } : { title: `@${decodeURIComponent(cr[1])}`, icon: 'port' };
  for (const [re, m] of STATIC) if (re.test(p)) return m;
  return { title: pretty(p.split('/').filter(Boolean).pop() ?? 'Page'), icon: 'tab' };
}
