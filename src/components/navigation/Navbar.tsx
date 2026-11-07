import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, LayoutDashboard, FileText, Mail, FolderKanban } from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { Wordmark } from '@/components/navigation/Wordmark';
import { Avatar } from '@/components/shared/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/FloatingPanel';
import { getDashboardPath, getDashboardLabel } from '@/utils/roles';

const navItems = [
  { to: '/explore', label: 'Explore Projects' },
  { to: '/gallery', label: 'Student Work' },
  { to: '/companies', label: 'Companies' },
  { to: '/how-it-works', label: 'How It Works' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, pendingInvites } = useAuth();
  const visibleNavItems = navItems.filter((item) => item.to !== '/how-it-works' || !user);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  // slide the active-tab indicator to whichever link React Router has marked
  // active, instead of re-deriving route-matching rules here
  useLayoutEffect(() => {
    const updateIndicator = () => {
      const nav = navRef.current;
      const activeEl = nav?.querySelector<HTMLElement>('.hdr-link.active');
      if (nav && activeEl) {
        const navRect = nav.getBoundingClientRect();
        const elRect = activeEl.getBoundingClientRect();
        setIndicator({ left: elRect.left - navRect.left, width: elRect.width, opacity: 1 });
      } else {
        setIndicator((prev) => ({ ...prev, opacity: 0 }));
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // hide on scroll down, show on scroll up or near the top
  useEffect(() => {
    let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY, d = y - lastY;
      if (y < 80 || d < -6) { setHidden(false); document.documentElement.removeAttribute('data-hdr'); }
      else if (d > 6) { setHidden(true); document.documentElement.setAttribute('data-hdr', 'hidden'); }
      lastY = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); document.documentElement.removeAttribute('data-hdr'); };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className={cn('site-header', hidden && 'hdr-hide')}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="hdr-logo flex items-center" aria-label="WebLoop home">
          <Wordmark />
        </Link>

        <nav ref={navRef} className="hdr-nav hidden md:flex items-center gap-[clamp(10px,1.8vw,30px)]">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('hdr-link whitespace-nowrap', isActive && 'active')}
            >
              {item.label}
            </NavLink>
          ))}
          <span
            className="hdr-nav-indicator"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: indicator.opacity }}
            aria-hidden="true"
          />
        </nav>

        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <ThemeToggle />
          <NotificationBell />
          {user ? (
            <>
              {profile && (
                <Button variant="ghost" onClick={() => navigate(getDashboardPath(profile.creator_type))} className="text-sm">
                  <LayoutDashboard size={15} /> {getDashboardLabel(profile.creator_type).replace(' Dashboard', '')}
                </Button>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="hdr-user"
                >
                  <Avatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                  <span className="hdr-user-n">
                    {profile?.display_name ?? 'User'}
                  </span>
                </button>
                {menuOpen && (
                  <div className="hdr-menu animate-fade-in-up">
                    <MenuItem icon={<LayoutDashboard size={15} />} label={profile ? getDashboardLabel(profile.creator_type) : 'Dashboard'} onClick={() => { setMenuOpen(false); navigate(profile ? getDashboardPath(profile.creator_type) : '/'); }} />
                    <MenuItem icon={<User size={15} />} label="My Profile" onClick={() => { setMenuOpen(false); navigate(`/creators/${profile?.handle}`); }} />
                    <MenuItem icon={<FolderKanban size={15} />} label="My Projects" onClick={() => { setMenuOpen(false); navigate('/my-projects'); }} />
                    <MenuItem icon={<FileText size={15} />} label="My Applications" onClick={() => { setMenuOpen(false); navigate('/my-applications'); }} />
                    <MenuItem icon={<Mail size={15} />} label="My Invitations" count={pendingInvites} onClick={() => { setMenuOpen(false); navigate('/my-invitations'); }} />
                    <div className="hdr-menu-sep" />
                    <MenuItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleSignOut} danger />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="hdr-link whitespace-nowrap" onClick={() => navigate('/signin')}>
                Sign In
              </button>
              <button className="hdr-primary flex items-center gap-2 whitespace-nowrap" onClick={() => navigate('/join')}>
Join the Platform
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
        <NotificationBell />
        <button
          className="hdr-theme hdr-burger md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-5 py-4" style={{ borderTop: '1px solid var(--hdr-line)', background: 'var(--hdr-bg)' }}>
          <nav className="flex flex-col gap-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn('hdr-link block rounded-lg px-3 py-2.5 text-sm font-medium', isActive && 'active')}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <ThemeToggle className="self-start" />
              {user ? (
                <>
                  {profile && (
                    <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate(getDashboardPath(profile.creator_type)); }}>
                      <LayoutDashboard size={15} /> {getDashboardLabel(profile.creator_type)}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate(`/creators/${profile?.handle}`); }}>
                    <User size={15} /> My Profile
                  </Button>
                  <Button variant="ghost" onClick={handleSignOut}>
                    <LogOut size={15} /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <button className="hdr-link text-left" onClick={() => { setMobileOpen(false); navigate('/signin'); }}>
                    Sign In
                  </button>
                  <button className="hdr-primary flex items-center justify-center gap-2" onClick={() => { setMobileOpen(false); navigate('/join'); }}>
Join the Platform
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuItem({ icon, label, onClick, danger, count }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'hdr-menu-item',
        danger && 'danger',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {!!count && (
        <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">{count}</span>
      )}
    </button>
  );
}

