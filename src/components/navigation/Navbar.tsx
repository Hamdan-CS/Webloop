import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, LayoutDashboard, FileText, Mail, FolderKanban, Settings, ShieldAlert } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/shared/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/FloatingPanel';
import { getDashboardPath, getDashboardLabel } from '@/utils/roles';
import { MobileTabBar, type NavItem } from '@/components/navigation/MobileTabBar';
import { checkIsAdmin, fetchLatestPostTimestamp } from '@/features/feed/services/feedApi';
import { LAST_FEED_VISIT_KEY } from '@/features/feed/constants';
import { useLenis } from '@/design-system/motion/lenisContext';
import './nav.css';
import { setSiteView } from '@/components/app/siteView';

/*
 * Site nav — the v4 demo's floating bar (.nav / .nav-pill / .nav-sheet):
 * sliding active pill, scroll-spy, compact + hide on scroll down, mobile
 * sheet, and the "Feed" link with its live dot. Items, auth menu, role logic
 * and handlers are unchanged from the previous navbar; only markup changed.
 * Styles: components/layout/genie-shell.css (generated from the demo).
 */

type Item = { to: string; label: string; feed?: boolean };

// On the homepage the demo's section anchors; elsewhere the real pages.
const HOME_SECTIONS: Item[] = [
  { to: '#how', label: 'How it works' },
  { to: '#projects', label: 'Features' },
  { to: '#explore', label: 'Projects' },
  { to: '#companies', label: 'Companies' },
  { to: '#faq', label: 'FAQ' },
];
const GUEST_PAGES: Item[] = [
  { to: '/explore', label: 'Explore Projects' },
  { to: '/gallery', label: 'Student Work' },
  { to: '/companies', label: 'Companies' },
  { to: '/how-it-works', label: 'How It Works' },
];
const AUTHED_PAGES: Item[] = [
  { to: '/explore', label: 'Explore Projects' },
  { to: '/gallery', label: 'Student Work' },
  { to: '/companies', label: 'Companies' },
];

// mobile tab bar for signed-in visitors (unchanged; the app shell replaces it in Phase 3)
const AUTHED_TABS: NavItem[] = [
  { to: '/explore', label: 'Explore Projects' },
  { to: '/feed', label: 'Feed', isFeed: true },
  { to: '/gallery', label: 'Student Work' },
  { to: '/companies', label: 'Companies' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [hasUnseenFeed, setHasUnseenFeed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [spyOn, setSpyOn] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const lenis = useLenis();
  const { user, profile, signOut, pendingInvites } = useAuth();
  const shownName: string =
    profile?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'User';
  const onHome = location.pathname === '/';
  const items: Item[] = onHome ? HOME_SECTIONS : user ? AUTHED_PAGES : GUEST_PAGES;
  // Feed: signed-in → /feed; signed-out → sign in (sign-in has no return-to yet)
  const feedTo = user ? '/feed' : '/signin';

  useEffect(() => {
    if (!user) return;
    fetchLatestPostTimestamp().then((latest) => {
      if (!latest) return;
      const lastVisit = localStorage.getItem(LAST_FEED_VISIT_KEY);
      setHasUnseenFeed(!lastVisit || new Date(latest) > new Date(lastVisit));
    });
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-wl-select-portal]')) return;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  /* sliding pill: follows hover, rests on the active link */
  const movePill = useCallback((a: HTMLElement | null) => {
    const pill = pillRef.current;
    if (!pill) return;
    if (!a) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    pill.style.width = `${a.offsetWidth}px`;
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  }, []);
  const activeEl = () => linksRef.current?.querySelector<HTMLElement>('a.gh-on') ?? null;
  useEffect(() => { requestAnimationFrame(() => movePill(activeEl())); }, [spyOn, location.pathname, movePill, user]);

  /* compact + hide on scroll down, scroll-spy over the homepage sections (demo values) */
  useEffect(() => {
    let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY;
      setCompact(y > 120);
      setOpen((isOpen) => {
        if (!isOpen) {
          if (y > lastY + 6 && y > 500) { setHidden(true); document.documentElement.setAttribute('data-hdr', 'hidden'); }
          else if (y < lastY - 6 || y < 200) { setHidden(false); document.documentElement.removeAttribute('data-hdr'); }
        }
        return isOpen;
      });
      lastY = y;
      if (onHome) {
        let on: string | null = null;
        for (const it of HOME_SECTIONS) {
          const s = document.querySelector(it.to);
          if (!s) continue;
          const r = s.getBoundingClientRect();
          if (r.top < innerHeight * 0.45 && r.bottom > innerHeight * 0.45) on = it.to;
        }
        setSpyOn(on);
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener('scroll', onScroll); document.documentElement.removeAttribute('data-hdr'); };
  }, [onHome]);

  const goSection = (e: ReactMouseEvent, hash: string) => {
    const t = document.querySelector(hash);
    setOpen(false);
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t as HTMLElement, { duration: 1.6 }); else t.scrollIntoView();
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    setOpen(false);
    try { await signOut(); } finally { navigate('/'); }
  };

  const renderLink = (it: Item, inSheet = false) =>
    it.to.startsWith('#') ? (
      <a key={it.to} href={it.to} className={cn(!inSheet && spyOn === it.to && 'gh-on')} onClick={(e) => goSection(e, it.to)}>{it.label}</a>
    ) : (
      <NavLink key={it.to} to={it.to} className={({ isActive }) => cn(!inSheet && isActive && 'gh-on')}>{it.label}</NavLink>
    );

  const feedLink = (inSheet = false) => (
    <NavLink to={feedTo} className={({ isActive }) => cn(!inSheet && isActive && user && 'gh-on')} aria-label={hasUnseenFeed ? 'Feed, new posts' : 'Feed'}>
      Feed<i className="gh-live" aria-hidden="true" />
    </NavLink>
  );

  return (
    <>
      <nav className={cn('gh-nav site-header', hidden && 'gh-hide', compact && 'gh-compact', open && 'gh-open')} aria-label="Main">
        <div className="gh-nav-in">
          <Link className="gh-logo" to="/" aria-label="WebLoop home">
            WebL<svg width="26" height="14" aria-hidden="true"><use href="#loop" /></svg>p
          </Link>
          <div ref={linksRef} className="gh-nav-links" onPointerLeave={() => movePill(activeEl())}>
            <span ref={pillRef} className="gh-nav-pill" aria-hidden="true" />
            <span onPointerOver={(e) => { const a = (e.target as HTMLElement).closest('a'); if (a) movePill(a); }} style={{ display: 'contents' }}>
              {feedLink()}
              {items.map((it) => renderLink(it))}
            </span>
          </div>
          <div className="gh-nav-r">
            {user ? (
              <>
                <NotificationBell />
                {profile && (
                  <button type="button" className="gh-pill gh-dark" onClick={() => { setSiteView(false); navigate(getDashboardPath(profile.creator_type)); }} title={getDashboardLabel(profile.creator_type)}>
                    <LayoutDashboard size={16} /> Open app
                  </button>
                )}
                <div className="relative" ref={menuRef}>
                  <button type="button" onClick={() => setMenuOpen((v) => !v)} className="hdr-user" aria-expanded={menuOpen} aria-haspopup="menu">
                    <Avatar src={profile?.avatar_url} name={shownName} size="sm" />
                    <span className="hdr-user-n">{shownName}</span>
                  </button>
                  {menuOpen && (
                    <div className="hdr-menu animate-fade-in-up" role="menu">
                      <MenuItem icon={<User size={15} />} label="My Profile" onClick={() => { setMenuOpen(false); navigate(`/creators/${profile?.handle}`); }} />
                      <MenuItem icon={<FolderKanban size={15} />} label="My Projects" onClick={() => { setMenuOpen(false); navigate('/my-projects'); }} />
                      {profile?.creator_type !== 'company' && (
                        <MenuItem icon={<FileText size={15} />} label="My Applications" onClick={() => { setMenuOpen(false); navigate('/my-applications'); }} />
                      )}
                      <MenuItem icon={<Mail size={15} />} label="My Invitations" count={pendingInvites} onClick={() => { setMenuOpen(false); navigate('/my-invitations'); }} />
                      <MenuItem icon={<Settings size={15} />} label="Settings" onClick={() => { setMenuOpen(false); navigate('/settings'); }} />
                      {isAdmin && (
                        <MenuItem icon={<ShieldAlert size={15} />} label="Moderation queue" onClick={() => { setMenuOpen(false); navigate('/admin/moderation'); }} />
                      )}
                      <div className="hdr-menu-sep" />
                      <MenuItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleSignOut} danger />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link className="gh-si" to="/signin">Sign in</Link>
                <Link className="gh-pill gh-dark" to="/join">Join WebLoop</Link>
              </>
            )}
            <button className="gh-nav-burger" type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><i /></button>
          </div>
        </div>
        <div className="gh-nav-sheet" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {feedLink(true)}
          {items.map((it) => renderLink(it, true))}
          {user ? (
            <>
              {profile && <Link to={getDashboardPath(profile.creator_type)}>{getDashboardLabel(profile.creator_type)}</Link>}
              <Link to={`/creators/${profile?.handle}`}>My Profile</Link>
              <Link to="/my-projects">My Projects</Link>
              {profile?.creator_type !== 'company' && <Link to="/my-applications">My Applications</Link>}
              <Link to="/my-invitations">{pendingInvites ? `My Invitations (${pendingInvites})` : 'My Invitations'}</Link>
              <Link to="/settings">Settings</Link>
              {isAdmin && <Link to="/admin/moderation">Moderation queue</Link>}
              <a href="#" onClick={(e) => { e.preventDefault(); handleSignOut(); }}>Sign Out</a>
            </>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link className="gh-pill gh-dark" to="/join">Join WebLoop</Link>
            </>
          )}
        </div>
      </nav>
      {user && <MobileTabBar items={AUTHED_TABS} hasUnseenFeed={hasUnseenFeed} />}
    </>
  );
}

function MenuItem({ icon, label, onClick, danger, count }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; count?: number }) {
  return (
    <button onClick={onClick} role="menuitem" className={cn('hdr-menu-item', danger && 'danger')}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {!!count && <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">{count}</span>}
    </button>
  );
}
