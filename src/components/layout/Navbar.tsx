import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles, LogOut, User, Plus, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Wordmark } from '@/components/layout/Wordmark';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/components/auth/AuthContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getDashboardPath, getDashboardLabel } from '@/lib/roles';

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
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const visibleNavItems = navItems.filter((item) => item.to !== '/how-it-works' || !user);

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
      if (y < 80 || d < -6) setHidden(false);
      else if (d > 6) setHidden(true);
      lastY = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
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

        <nav className="hidden md:flex items-center gap-[clamp(14px,2.2vw,30px)]">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('hdr-link', isActive && 'active')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              {profile && (
                <Button variant="ghost" onClick={() => navigate(getDashboardPath(profile.creator_type))} className="text-sm">
                  <LayoutDashboard size={15} /> {getDashboardLabel(profile.creator_type).replace(' Dashboard', '')}
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/publish')} className="text-sm">
                <Plus size={15} /> Publish
              </Button>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-white/5 transition-colors"
                >
                  <Avatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                  <span className="text-sm font-medium text-slate-200 max-w-[100px] truncate">
                    {profile?.display_name ?? 'User'}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-ink-900/95 backdrop-blur-md py-1.5 shadow-card animate-fade-in-up">
                    <MenuItem icon={<LayoutDashboard size={15} />} label={profile ? getDashboardLabel(profile.creator_type) : 'Dashboard'} onClick={() => { setMenuOpen(false); navigate(profile ? getDashboardPath(profile.creator_type) : '/'); }} />
                    <MenuItem icon={<User size={15} />} label="My Profile" onClick={() => { setMenuOpen(false); navigate(`/creators/${profile?.handle}`); }} />
                    <MenuItem icon={<Plus size={15} />} label="Publish Project" onClick={() => { setMenuOpen(false); navigate('/publish'); }} />
                    <MenuItem icon={<LayoutDashboard size={15} />} label="My Applications" onClick={() => { setMenuOpen(false); navigate('/my-applications'); }} />
                    <div className="my-1 border-t border-white/5" />
                    <MenuItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleSignOut} danger />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="hdr-link" onClick={() => navigate('/signin')}>
                Sign In
              </button>
              <button className="hdr-primary flex items-center gap-2" onClick={() => navigate('/join')}>
                <Sparkles size={15} />
                Join the Platform
              </button>
            </>
          )}
        </div>

        <button
          className="hdr-theme md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate('/publish'); }}>
                    <Plus size={15} /> Publish Project
                  </Button>
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
                    <Sparkles size={15} /> Join the Platform
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
        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
        danger ? 'text-signal-rose hover:bg-signal-rose/10' : 'text-slate-300 hover:bg-white/5 hover:text-white',
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

