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

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center" aria-label="WebLoop home">
          <Wordmark />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-white bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
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
              <Button variant="ghost" onClick={() => navigate('/signin')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/join')}>
                <Sparkles size={15} />
                Join the Platform
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden rounded-lg p-2 text-slate-300 hover:bg-white/5"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-ink-950/95 px-5 py-4">
          <nav className="flex flex-col gap-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'text-white bg-white/5' : 'text-slate-300 hover:bg-white/5',
                  )
                }
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
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate('/signin'); }}>
                    Sign In
                  </Button>
                  <Button onClick={() => { setMobileOpen(false); navigate('/join'); }}>
                    <Sparkles size={15} /> Join the Platform
                  </Button>
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

