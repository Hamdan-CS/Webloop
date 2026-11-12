import type { ReactNode } from 'react';

/**
 * Auth pages in the public-site look (brief §3): sky background with the
 * demo's clouds and a centred white card. Purely presentational — each
 * page's form JSX, handlers and Supabase calls pass through as `children`.
 * `wide` is for the join page, whose role picker and form sit side by side.
 */
export function AuthLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="gh-auth">
      <svg viewBox="0 0 200 120" className="gh-cloud gh-auth-c" style={{ left: '-8%', top: '58%', width: '30%' }} aria-hidden="true"><use href="#cloudW" width="200" height="120" /></svg>
      <svg viewBox="0 0 200 120" className="gh-cloud gh-auth-c" style={{ right: '-9%', top: '50%', width: '32%' }} aria-hidden="true"><use href="#cloudB" width="200" height="120" /></svg>
      <svg viewBox="0 0 200 120" className="gh-cloud gh-auth-c" style={{ left: '3%', top: '8%', width: '13%' }} aria-hidden="true"><use href="#cloudB" width="200" height="120" /></svg>
      <svg viewBox="0 0 200 120" className="gh-cloud gh-auth-c" style={{ right: '4%', top: '6%', width: '12%' }} aria-hidden="true"><use href="#cloudW" width="200" height="120" /></svg>
      <div className={wide ? 'gh-auth-in gh-auth-wide' : 'gh-auth-in'}>{children}</div>
    </div>
  );
}
