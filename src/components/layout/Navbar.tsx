import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Boxes, Menu, X, Sparkles, LogOut, User, Plus, LayoutDashboard, Inbox, ListChecks } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
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
  const { user, profile, unreadMessages, pendingReviews, signOut } = useAuth();
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
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-accent-500 text-ink-950">
            <Boxes size={20} strokeWidth={2.4} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight text-white">WebLoop</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent-300/70">
              build · team · prove
            </span>
          </div>
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
                <>
                  <NavIconButton
                    icon={<ListChecks size={18} />}
                    count={pendingReviews}
                    label="Tasks"
                    onClick={() => navigate(`/creators/${profile.handle}?tab=tasks`)}
                  />
                  <NavIconButton
                    icon={<Inbox size={18} />}
                    count={unreadMessages}
                    label="Messages"
                    onClick={() => navigate(`/creators/${profile.handle}?tab=messages`)}
                  />
                </>
              )}
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
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate(`/creators/${profile?.handle}?tab=messages`); }}>
                    <Inbox size={15} /> Messages
                    {unreadMessages > 0 && <span className="ml-1 rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">{unreadMessages}</span>}
                  </Button>
                  <Button variant="secondary" onClick={() => { setMobileOpen(false); navigate(`/creators/${profile?.handle}?tab=tasks`); }}>
                    <ListChecks size={15} /> Tasks
                    {pendingReviews > 0 && <span className="ml-1 rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">{pendingReviews}</span>}
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

function NavIconButton({ icon, label, count, onClick }: { icon: React.ReactNode; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
    >
      {icon}
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-ink-950">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
