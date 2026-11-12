import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TabsContext, NEW_TAB_PATH, type TabsApi, type WorkspaceTab } from './tabsContext';

/*
 * Browser-style workspace tabs (brief §4). Each tab is just a route; the URL
 * always shows the active tab. A normal navigation replaces the active tab's
 * page, ⌘/Ctrl-click or middle-click opens a background tab. Tabs, order and
 * the last 5 closed are kept per user in localStorage. Route paths and route
 * guards are untouched — this only decides which route to navigate to.
 */

const uid = () => Math.random().toString(36).slice(2, 10);
const keyFor = (userId: string) => `wl_tabs:${userId}`;
type Saved = { tabs: WorkspaceTab[]; activeId: string; closed: string[] };

function load(userId: string, current: string): Saved {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (Array.isArray(s.tabs) && s.tabs.length) {
        // the URL wins on reload: make sure the current route is a tab and active
        const hit = s.tabs.find((t) => t.path === current);
        if (hit) return { ...s, activeId: hit.id, closed: s.closed ?? [] };
        const active = s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0];
        return { tabs: s.tabs.map((t) => (t.id === active.id ? { ...t, path: current } : t)), activeId: active.id, closed: s.closed ?? [] };
      }
    }
  } catch { /* storage blocked or corrupt: start fresh */ }
  const id = uid();
  return { tabs: [{ id, path: current }], activeId: id, closed: [] };
}

export function TabsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const current = location.pathname + location.search;
  const [state, setState] = useState<Saved>(() => load(userId, current));
  const stateRef = useRef(state);
  stateRef.current = state;

  // persist per user
  useEffect(() => {
    try { localStorage.setItem(keyFor(userId), JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, userId]);

  // a normal navigation replaces the active tab's page
  useEffect(() => {
    setState((s) => {
      const active = s.tabs.find((t) => t.id === s.activeId);
      if (!active || active.path === current) return s;
      return { ...s, tabs: s.tabs.map((t) => (t.id === s.activeId ? { ...t, path: current } : t)) };
    });
  }, [current]);

  const switchTo = useCallback((id: string) => {
    const t = stateRef.current.tabs.find((x) => x.id === id);
    if (!t) return;
    setState((s) => ({ ...s, activeId: id }));
    if (t.path !== current) navigate(t.path);
  }, [current, navigate]);

  const open = useCallback((path: string, opts?: { background?: boolean }) => {
    const id = uid();
    setState((s) => {
      const i = s.tabs.findIndex((t) => t.id === s.activeId);
      const tabs = [...s.tabs.slice(0, i + 1), { id, path }, ...s.tabs.slice(i + 1)];
      return { ...s, tabs, activeId: opts?.background ? s.activeId : id };
    });
    if (!opts?.background) navigate(path);
  }, [navigate]);

  const close = useCallback((id: string) => {
    const s = stateRef.current;
    const i = s.tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const closedPath = s.tabs[i].path;
    const rest = s.tabs.filter((t) => t.id !== id);
    const closed = closedPath === NEW_TAB_PATH ? s.closed : [closedPath, ...s.closed.filter((p) => p !== closedPath)].slice(0, 5);
    if (!rest.length) {
      // closing the last tab opens a New tab
      const nid = uid();
      setState({ tabs: [{ id: nid, path: NEW_TAB_PATH }], activeId: nid, closed });
      navigate(NEW_TAB_PATH);
      return;
    }
    if (id === s.activeId) {
      const next = rest[Math.min(i, rest.length - 1)];
      setState({ tabs: rest, activeId: next.id, closed });
      navigate(next.path);
    } else {
      setState({ ...s, tabs: rest, closed });
    }
  }, [navigate]);

  const reorder = useCallback((fromId: string, toId: string) => {
    setState((s) => {
      const from = s.tabs.findIndex((t) => t.id === fromId), to = s.tabs.findIndex((t) => t.id === toId);
      if (from < 0 || to < 0 || from === to) return s;
      const tabs = [...s.tabs];
      const [m] = tabs.splice(from, 1);
      tabs.splice(to, 0, m);
      return { ...s, tabs };
    });
  }, []);

  const newTab = useCallback(() => open(NEW_TAB_PATH), [open]);
  const reopenClosed = useCallback((path: string) => {
    setState((s) => ({ ...s, closed: s.closed.filter((p) => p !== path) }));
    open(path);
  }, [open]);

  // keyboard: ⌘/Ctrl+T, ⌘/Ctrl+W, Ctrl+(Shift+)Tab, ⌘/Ctrl+B — browsers keep some of
  // these for themselves, so Alt+T / Alt+W / Alt+[ ] / Alt+B work everywhere too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable="true"]');
      const s = stateRef.current;
      const idx = s.tabs.findIndex((t) => t.id === s.activeId);
      const cycle = (d: number) => switchTo(s.tabs[(idx + d + s.tabs.length) % s.tabs.length].id);
      if ((mod && !e.shiftKey && (k === 't' || k === 'b')) || (e.altKey && (k === 't' || k === 'b'))) { if (typing && !mod) return; e.preventDefault(); newTab(); return; }
      if ((mod && !e.shiftKey && k === 'w') || (e.altKey && k === 'w')) { e.preventDefault(); close(s.activeId); return; }
      if (e.ctrlKey && k === 'tab') { e.preventDefault(); cycle(e.shiftKey ? -1 : 1); return; }
      if (e.altKey && (k === ']' || k === '[')) { e.preventDefault(); cycle(k === ']' ? 1 : -1); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [switchTo, newTab, close]);

  // ⌘/Ctrl-click or middle-click on an internal link → new background tab
  useEffect(() => {
    const intercept = (e: MouseEvent) => {
      const wantsTab = e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey));
      if (!wantsTab) return;
      const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      open(url.pathname + url.search, { background: true });
    };
    const block = (e: MouseEvent) => { if (e.button === 1 && (e.target as HTMLElement)?.closest?.('a[href]')) e.preventDefault(); };
    document.addEventListener('click', intercept, true);
    document.addEventListener('auxclick', intercept, true);
    document.addEventListener('mousedown', block, true);
    return () => { document.removeEventListener('click', intercept, true); document.removeEventListener('auxclick', intercept, true); document.removeEventListener('mousedown', block, true); };
  }, [open]);

  const api = useMemo<TabsApi>(() => ({ ...state, switchTo, open, close, reorder, newTab, reopenClosed }), [state, switchTo, open, close, reorder, newTab, reopenClosed]);
  return <TabsContext.Provider value={api}>{children}</TabsContext.Provider>;
}
