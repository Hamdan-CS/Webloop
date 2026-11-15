import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/shared/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roles';
import { useLenis } from '@/design-system/motion/lenisContext';
import './nav.css';
import { setSiteView } from '@/components/app/siteView';
import { WebiLogoLoop } from '@/design-system/webi/WebiLogoLoop';

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


export function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [spyOn, setSpyOn] = useState<string | null>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const lenis = useLenis();
  const { user, profile } = useAuth();
  const shownName: string =
    profile?.display_name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'User';
  const onHome = location.pathname === '/';
  const items: Item[] = onHome ? HOME_SECTIONS : user ? AUTHED_PAGES : GUEST_PAGES;
  // Feed is shown to guests only (signed-in users reach it in Lab) and sends them to sign in
  const feedTo = '/signin';

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

  const openApp = () => {
    setOpen(false);
    setSiteView(false);
    navigate(profile ? getDashboardPath(profile.creator_type) : '/my-projects');
  };

  const renderLink = (it: Item, inSheet = false) =>
    it.to.startsWith('#') ? (
      <a key={it.to} href={it.to} className={cn(!inSheet && spyOn === it.to && 'gh-on')} onClick={(e) => goSection(e, it.to)}>{it.label}</a>
    ) : (
      <NavLink key={it.to} to={it.to} className={({ isActive }) => cn(!inSheet && isActive && 'gh-on')}>{it.label}</NavLink>
    );

  const feedLink = (inSheet = false) => (
    <NavLink to={feedTo} className={({ isActive }) => cn(!inSheet && isActive && 'gh-on')} aria-label="Feed">
      Feed<i className="gh-live" aria-hidden="true" />
    </NavLink>
  );

  return (
    <>
      <nav className={cn('gh-nav site-header', hidden && 'gh-hide', compact && 'gh-compact', open && 'gh-open')} aria-label="Main">
        <div className="gh-nav-in">
          <Link className="gh-logo" to="/" aria-label="WebLoop home">
            WebL<WebiLogoLoop width={26} height={14} />p
          </Link>
          <div ref={linksRef} className="gh-nav-links" onPointerLeave={() => movePill(activeEl())}>
            <span ref={pillRef} className="gh-nav-pill" aria-hidden="true" />
            <span onPointerOver={(e) => { const a = (e.target as HTMLElement).closest('a'); if (a) movePill(a); }} style={{ display: 'contents' }}>
              {!user && feedLink()}
              {items.map((it) => renderLink(it))}
            </span>
          </div>
          <div className="gh-nav-r">
            {user ? (
              /* Signed in: the website stays the same as for guests — everything
                 personal (feed, projects, applications, invitations, settings,
                 sign out) lives in the app, so the site only offers the way in. */
              <button type="button" className="gh-pill gh-dark" onClick={openApp} title="Lab" aria-label="Lab">
                <LayoutDashboard size={16} /> Lab
                <Avatar src={profile?.avatar_url} name={shownName} size="xs" />
              </button>
            ) : (
              <>
                <Link className="gh-si" to="/signin" {...(onHome ? { 'data-webi-mood': 'happy', 'data-webi-say': 'Welcome back!' } : {})}>Sign in</Link>
                <Link className="gh-pill gh-dark" to="/join">Join WebLoop</Link>
              </>
            )}
            <button className="gh-nav-burger" type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}><i /></button>
          </div>
        </div>
        <div className="gh-nav-sheet" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {!user && feedLink(true)}
          {items.map((it) => renderLink(it, true))}
          {user ? (
            <a href="#" className="gh-pill gh-dark" title="Lab" aria-label="Lab" onClick={(e) => { e.preventDefault(); openApp(); }}>
              <LayoutDashboard size={16} /> Lab
              <Avatar src={profile?.avatar_url} name={shownName} size="xs" />
            </a>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link className="gh-pill gh-dark" to="/join">Join WebLoop</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

