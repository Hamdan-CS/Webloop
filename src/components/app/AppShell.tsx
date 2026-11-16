import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent as RMouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, ShieldAlert, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessagesData } from '@/components/messaging/messagesContext';
import { PipContext, type PipApi, type PipCorner } from '@/components/messaging/pipContext';
import { MessagesPip } from '@/components/messaging/MessagesPip';
import { Webi, WebiLogoLoop } from '@/design-system/webi';
import { useAppDesktop, useWebiEnabled } from '@/hooks/useWebiEnabled';
import { fetchProfileProjects, fetchJoinedProjects } from '@/services/api';
import { checkIsAdmin } from '@/features/feed/services/feedApi';
import { getDashboardPath, getDashboardLabel } from '@/utils/roles';
import { ScrollTrigger } from '@/design-system/animations/gsap.config';
import type { Project } from '@/types';
import { useTabs, NEW_TAB_PATH } from './tabs/tabsContext';
import { WorkspaceTabs } from './tabs/WorkspaceTabs';
import { NewTabPage } from './NewTabPage';
import { CommandPalette, type Command } from './CommandPalette';
import { WorkspaceContext, projectDot, type WorkspaceApi } from './workspaceContext';
import { setSiteView } from './siteView';
import { WIcon, type IconName } from './icons';
import { WAvatar } from './ui';
import { NotificationsMenu } from './NotificationsMenu';
import { useSlidingTabInk } from './slidingTabInk';
import './app-shell.css';
import './app-shell-app.css';
import './workspace-pages.css';

type View = { key: string; label: string; icon: IconName; to?: string; count?: number; dot?: number; action?: () => void; match: (p: string) => boolean; sidebarOnly?: boolean };

/**
 * Signed-in workspace (brief §3), the demo's #app: mist background, 248px
 * sidebar collapsible to 76px, one white panel inset 10px that scrolls on
 * its own, browser-style tabs above it, ⌘K palette, and a floating bottom
 * tab bar under 860px. Every signed-in page renders inside the panel; the
 * pages themselves (and their data, auth and guards) are unchanged.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, signOut, unreadMessages, unreadNotifications, pendingReviews, pendingInvites, refreshCounts } = useAuth();
  const { unreadConversations } = useMessagesData();
  const [bellOpen, setBellOpen] = useState(false);
  // Webi in the app: off by default; desktop only (phones keep toasts, no walking)
  const [webiOn, setWebiOn] = useWebiEnabled();
  const desktop = useAppDesktop();
  const turnWebiOff = useCallback(() => setWebiOn(false), [setWebiOn]);
  // while he's off, a click on the logo's ∞ brings him out instead of going home
  const onLogoClick = (e: RMouseEvent) => {
    if (webiOn || !desktop || !(e.target as Element).closest('[data-webi-logo]')) return;
    e.preventDefault();
    setWebiOn(true);
  };
  const bellRef = useRef<HTMLButtonElement>(null);
  const closeBell = useCallback(() => setBellOpen(false), []);

  // keep the bell and badges current without a reload (notifications have no realtime feed)
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void refreshCounts(); }, 60_000);
    return () => clearInterval(t);
  }, [refreshCounts]);
  const { open: openTab, newTab } = useTabs();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('wl_sb_collapsed') === '1'; } catch { return false; } });
  // the active sidebar row's highlight slides from item to item
  const navRef = useRef<HTMLElement>(null);
  const [ink, setInk] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const on = nav.querySelector<HTMLElement>('button.w-on');
      setInk(on ? { y: on.offsetTop, h: on.offsetHeight } : null);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [pathname, collapsed]);
  // tab bars inside the panel: one underline that slides between tabs
  useSlidingTabInk('w-ws-panel');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [meOpen, setMeOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem('wl_sb_collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);

  // the same read calls My Projects makes
  useEffect(() => {
    if (!profile) return;
    let live = true;
    Promise.all([
      fetchProfileProjects(profile.id, { includeDrafts: true }).catch(() => [] as Project[]),
      fetchJoinedProjects(profile.id).catch(() => [] as Project[]),
    ]).then(([own, joined]) => {
      if (!live) return;
      const seen = new Set<string>();
      setProjects([...own, ...joined].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))));
    });
    return () => { live = false; };
  }, [profile]);
  useEffect(() => { if (user) checkIsAdmin().then(setIsAdmin).catch(() => {}); }, [user]);

  // the panel is the scroller inside the shell: reset per route, and let
  // scroll-driven scenes inside pages measure against it
  useLayoutEffect(() => { panelRef.current?.scrollTo({ top: 0 }); }, [pathname]);
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    ScrollTrigger.defaults({ scroller: el });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 200);
    return () => { window.clearTimeout(id); ScrollTrigger.defaults({ scroller: window }); };
  }, []);

  // close the user menu on outside click
  useEffect(() => {
    if (!meOpen) return;
    const h = (e: MouseEvent) => { if (!meRef.current?.contains(e.target as Node)) setMeOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [meOpen]);

  // ⌘K / Ctrl+K toggles the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === 'Escape') { setCmdOpen(false); setMeOpen(false); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const home = profile ? getDashboardPath(profile.creator_type) : '/feed';
  const portfolio = profile ? `/creators/${profile.handle}` : '/settings';
  const backToSite = useCallback(() => { setSiteView(true); navigate('/explore'); }, [navigate]);
  const openMessages = useCallback(() => navigate('/messages'), [navigate]);

  // Messages picture-in-picture: one window for the whole app, outside the routed content
  const [pipState, setPipState] = useState<{ open: boolean; conversationId: string | null; minimised: boolean }>({ open: false, conversationId: null, minimised: false });
  const [pipCorner, setPipCorner] = useState<PipCorner>(() => {
    try { const c = localStorage.getItem('wl_pip_corner'); return c === 'bl' || c === 'tr' || c === 'tl' ? c : 'br'; } catch { return 'br'; }
  });
  // where "Pop out" goes back to: the last page outside Messages
  const [returnPath, setReturnPath] = useState<string | null>(null);
  useEffect(() => { if (!pathname.startsWith('/messages') && pathname !== NEW_TAB_PATH) setReturnPath(pathname); }, [pathname]);
  const openPip = useCallback((conversationId: string | null) => setPipState({ open: true, conversationId, minimised: false }), []);
  const closePip = useCallback(() => setPipState((s) => ({ ...s, open: false })), []);
  const setPipMinimised = useCallback((minimised: boolean) => setPipState((s) => ({ ...s, minimised })), []);
  const setPipConversation = useCallback((conversationId: string | null) => setPipState((s) => ({ ...s, conversationId })), []);
  const setCorner = useCallback((c: PipCorner) => { setPipCorner(c); try { localStorage.setItem('wl_pip_corner', c); } catch { /* ignore */ } }, []);
  const pip: PipApi = { ...pipState, corner: pipCorner, openPip, closePip, setMinimised: setPipMinimised, setConversation: setPipConversation, setCorner, returnPath: returnPath ?? home };

  const views: View[] = [
    { key: 'home', label: 'Home', icon: 'home', to: home, match: (p) => p.startsWith('/dashboard/') },
    { key: 'feed', label: 'Feed', icon: 'feed', to: '/feed', match: (p) => p.startsWith('/feed') },
    // dot = submitted tasks waiting for your review (moved here from the bell)
    { key: 'projects', label: 'Projects', icon: 'proj', to: '/my-projects', count: projects.length || undefined, dot: pendingReviews || undefined, match: (p) => p.startsWith('/my-projects') || p.startsWith('/projects/') },
    { key: 'explore', label: 'Explore', icon: 'expl', to: '/explore', match: (p) => p.startsWith('/explore') },
    // their home in the app now that the profile menu no longer lists them (kept off the phone tab bar)
    { key: 'gallery', label: 'Student work', icon: 'work', to: '/gallery', match: (p) => p.startsWith('/gallery'), sidebarOnly: true },
    { key: 'companies', label: 'Companies', icon: 'org', to: '/companies', match: (p) => p.startsWith('/companies'), sidebarOnly: true },
    { key: 'messages', label: 'Messages', icon: 'msg', to: '/messages', dot: unreadMessages || undefined, match: (p) => p.startsWith('/messages') },
    { key: 'portfolio', label: 'Portfolio', icon: 'port', to: portfolio, match: (p) => p === portfolio },
  ];

  // normal click → this tab; ⌘/Ctrl-click or middle-click → background tab
  const go = (v: { to?: string; action?: () => void }) => (e: RMouseEvent) => {
    if (v.action) { v.action(); return; }
    if (!v.to) return;
    if (e.metaKey || e.ctrlKey || e.button === 1) { e.preventDefault(); openTab(v.to, { background: true }); return; }
    navigate(v.to);
  };

  const commands: Command[] = useMemo(() => [
    { label: 'Go to Home', hint: 'G H', run: () => navigate(home) },
    { label: 'Go to Feed', hint: 'G F', run: () => navigate('/feed') },
    { label: 'Go to Projects', hint: 'G P', run: () => navigate('/my-projects') },
    { label: 'Explore projects', hint: 'G E', run: () => navigate('/explore') },
    { label: 'Open messages', hint: 'G M', run: openMessages },
    { label: 'View portfolio', hint: 'G O', run: () => navigate(portfolio) },
    { label: 'Publish a new project', hint: 'Action', run: () => navigate('/publish') },
    ...projects.slice(0, 8).map((p) => ({ label: `Open ${p.title}`, hint: 'Project', run: () => navigate(`/projects/${p.slug}`) })),
    { label: 'Student work', hint: 'Page', run: () => navigate('/gallery') },
    { label: 'Companies', hint: 'Page', run: () => navigate('/companies') },
    ...(profile?.creator_type !== 'company' && profile?.creator_type !== 'independent' ? [{ label: 'My applications', hint: 'Page', run: () => navigate('/my-applications') }] : []),
    { label: 'My invitations', hint: 'Page', run: () => navigate('/my-invitations') },
    { label: 'Settings', hint: 'Page', run: () => navigate('/settings') },
    ...(isAdmin ? [{ label: 'Moderation queue', hint: 'Admin', run: () => navigate('/admin/moderation') }] : []),
    { label: 'New tab', hint: '⌘B', run: newTab },
    { label: 'Back to the website', hint: 'Site', run: backToSite },
  ], [navigate, home, portfolio, projects, profile, isAdmin, openMessages, newTab, backToSite]);

  const api: WorkspaceApi = { projects, isAdmin, openPalette: () => setCmdOpen(true), openMessages, backToSite };
  // the bell counts notifications and conversations with unread messages; tasks to review sit on Projects, invitations in the profile menu
  const alerts = unreadConversations + unreadNotifications;
  const shownName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const roleLine = profile ? getDashboardLabel(profile.creator_type).replace(' Dashboard', '') : '';

  const handleSignOut = async () => { setMeOpen(false); try { await signOut(); } finally { setSiteView(false); navigate('/'); } };

  return (
    <WorkspaceContext.Provider value={api}>
    <PipContext.Provider value={pip}>
      <div className={`w-app${collapsed ? ' w-collapsed' : ''}`} data-lenis-prevent aria-label="WebLoop workspace">
        <aside className="w-sb" aria-label="Workspace">
          <div className="w-sb-top">
            <Link className="w-logo" to={home} aria-label="WebLoop home" onClick={onLogoClick} title={!webiOn && desktop ? 'Click the ∞ to bring out Webi' : undefined}>WebL<WebiLogoLoop width={24} height={13} />p</Link>
            <span className="w-sb-mark" onClick={onLogoClick} aria-hidden="true"><WebiLogoLoop width={30} height={16} /></span>
            <button type="button" className="w-icon-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed} onClick={() => setCollapsed((c) => !c)}><WIcon name="side" /></button>
          </div>
          <button type="button" className="w-sb-new" onClick={() => setCmdOpen(true)}><WIcon name="plus" /><span>New project</span><kbd>⌘K</kbd></button>
          <nav className="w-sb-nav" aria-label="Main" ref={navRef}>
            <span className="w-sb-ink" aria-hidden="true" style={ink ? { transform: `translateY(${ink.y}px)`, height: ink.h, opacity: 1 } : { opacity: 0 }} />
            {views.map((v) => (
              <button key={v.key} type="button" className={v.match(pathname) ? 'w-on' : ''} aria-current={v.match(pathname) ? 'page' : undefined} onClick={go(v)} onAuxClick={(e) => { if (e.button === 1) go(v)(e); }} title={collapsed ? v.label : undefined}>
                <WIcon name={v.icon} /><span>{v.label}</span>
                {v.count ? <em className="w-ct">{v.count}</em> : null}
                {v.dot ? <em className="w-dot">{v.dot}</em> : null}
              </button>
            ))}
            <button type="button" className="w-sb-newtab" onClick={newTab} title="New tab"><WIcon name="tab" /><span>New tab</span><kbd>⌘ B</kbd></button>
          </nav>
          {/* owned and joined projects are listed apart so it's clear which are yours */}
          {([
            ['Your projects', projects.filter((p) => p.owner_id === profile?.id)],
            ['Member of', projects.filter((p) => p.owner_id !== profile?.id)],
          ] as const).map(([label, list]) => list.length > 0 && (
            <div key={label} className="w-sb-group">
              <div className="w-sb-sec">{label}</div>
              <div className="w-sb-proj">
                {list.slice(0, 5).map((p) => (
                  <button key={p.id} type="button" onClick={go({ to: `/projects/${p.slug}` })} onAuxClick={(e) => { if (e.button === 1) go({ to: `/projects/${p.slug}` })(e); }} title={`${p.title} · ${label === 'Member of' ? 'Member' : 'Owner'}`} className={pathname === `/projects/${p.slug}` ? 'w-on' : ''}>
                    <i style={{ background: projectDot(p.slug) }} /><span>{p.title}</span>
                    {label === 'Member of' && <em className="w-sb-role">Member</em>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="w-sb-foot" ref={meRef}>
            <button type="button" className="w-me" aria-haspopup="menu" aria-expanded={meOpen} onClick={() => { setBellOpen(false); setMeOpen((o) => !o); }}>
              <WAvatar name={shownName} src={profile?.avatar_url} />
              <div><b>{shownName}</b><small>{roleLine}</small></div>
            </button>
            <button ref={bellRef} type="button" className={`w-icon-btn${alerts ? ' w-bell' : ''}`} aria-label={alerts ? `Notifications (${alerts})` : 'Notifications'} aria-haspopup="dialog" aria-expanded={bellOpen} onClick={() => { setMeOpen(false); setBellOpen((o) => !o); }}><WIcon name="bell" /></button>
            {bellOpen && <NotificationsMenu anchorRef={bellRef} onClose={closeBell} />}
            {meOpen && (
              <div className="hdr-menu w-me-menu" role="menu">
                <div className="w-me-head" role="presentation">
                  <b>{shownName}</b>
                  {user?.email && <small>{user.email}</small>}
                </div>
                <div className="hdr-menu-sep" />
                <MenuItem icon={<User size={15} />} label="My profile" onClick={() => { setMeOpen(false); navigate(portfolio); }} />
                {/* pending invitations get a badge here while there are any (the permanent item moved to the palette / New Tab) */}
                {pendingInvites > 0 && <MenuItem icon={<Mail size={15} />} label="My invitations" count={pendingInvites} onClick={() => { setMeOpen(false); navigate('/my-invitations'); }} />}
                <MenuItem icon={<Settings size={15} />} label="Settings" onClick={() => { setMeOpen(false); navigate('/settings'); }} />
                {isAdmin && <MenuItem icon={<ShieldAlert size={15} />} label="Moderation queue" onClick={() => { setMeOpen(false); navigate('/admin/moderation'); }} />}
                <div className="hdr-menu-sep" />
                <MenuItem icon={<LogOut size={15} />} label="Sign out" onClick={handleSignOut} danger />
              </div>
            )}
          </div>
        </aside>

        <main className="w-ws">
          <WorkspaceTabs />
          <div ref={panelRef} className="w-ws-panel" id="w-ws-panel">
            {pathname === NEW_TAB_PATH ? <NewTabPage /> : children}
          </div>
        </main>

        <nav className="w-tabbar" aria-label="Main">
          {views.filter((v) => !v.sidebarOnly).map((v) => (
            <button key={v.key} type="button" className={v.match(pathname) ? 'w-on' : ''} aria-current={v.match(pathname) ? 'page' : undefined} onClick={go(v)}>
              <WIcon name={v.icon} />{v.label}
            </button>
          ))}
        </nav>

        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
        <MessagesPip />
        {webiOn && desktop && <Webi variant="app" onDismiss={turnWebiOff} />}
      </div>
    </PipContext.Provider>
    </WorkspaceContext.Provider>
  );
}

function MenuItem({ icon, label, onClick, danger, count }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; count?: number }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`hdr-menu-item${danger ? ' danger' : ''}`}>
      {icon}<span className="flex-1 text-left">{label}</span>
      {!!count && <span className="w-menu-ct">{count}</span>}
    </button>
  );
}
