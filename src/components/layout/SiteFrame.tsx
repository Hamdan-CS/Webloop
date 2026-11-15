import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TabsProvider } from '@/components/app/tabs/TabsProvider';
import { AppShell } from '@/components/app/AppShell';
import { isSiteView, onSiteViewChange, setSiteView as storeSiteView } from '@/components/app/siteView';

const AUTH_PATHS = new Set(['/signin', '/join', '/forgot-password', '/reset-password']);

/* Personal pages only exist inside the app — never render them in the website frame. */
const APP_ONLY_PREFIXES = ['/feed', '/my-', '/settings', '/dashboard', '/publish', '/admin', '/build-profile'];
const isAppOnly = (p: string) => APP_ONLY_PREFIXES.some((x) => p === x || p.startsWith(x));

/**
 * Chooses the frame around the routes — layout only, routes and guards are
 * untouched. Signed-in visitors get the workspace shell on every page except
 * the auth pages (or after "Back to site"); everyone else gets the public
 * site with the floating nav and footer.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [siteView, setSiteView] = useState(isSiteView);
  useEffect(() => onSiteViewChange(() => setSiteView(isSiteView())), []);
  const appOnly = isAppOnly(pathname);
  const inApp = !!user && (!siteView || appOnly) && !AUTH_PATHS.has(pathname);

  // landing on a personal page from the website takes you back into the app for good.
  // Runs on navigation only — not when site view turns on, so "Back to site"
  // from e.g. the dashboard isn't undone before it navigates away.
  useEffect(() => {
    if (user && isAppOnly(pathname) && isSiteView()) storeSiteView(false);
  }, [user, pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('wl-in-app', inApp);
    return () => document.documentElement.classList.remove('wl-in-app');
  }, [inApp]);

  if (inApp && user) {
    return (
      <TabsProvider userId={user.id}>
        <AppShell>{children}</AppShell>
      </TabsProvider>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {/* the floating nav sits 14px down and is 64px tall: leave room under it */}
      <main className="flex-1 pt-24">{children}</main>
      <Footer />
    </div>
  );
}
