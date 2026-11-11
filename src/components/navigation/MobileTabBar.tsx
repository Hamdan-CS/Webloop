import { NavLink } from 'react-router-dom';
import { Compass, Image, Building2, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FeedNavIcon } from '@/features/feed/components/FeedNavIcon';

export interface NavItem {
  to: string;
  label: string;
  isFeed?: boolean;
}

const ICONS: Record<string, typeof Compass> = {
  '/explore': Compass,
  '/gallery': Image,
  '/companies': Building2,
  '/how-it-works': Info,
};

/** Fixed bottom tab bar for small screens — the site had no persistent mobile
 * nav before the Feed feature, so this adds one (per the brief), with Feed
 * always in the center tab. */
export function MobileTabBar({ items, hasUnseenFeed }: { items: NavItem[]; hasUnseenFeed: boolean }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      aria-label="Primary"
    >
      {items.map((item) => {
        const Icon = ICONS[item.to];
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-500', isActive && 'text-accent-300')
            }
          >
            {item.isFeed ? (
              <span className="flex h-7 w-10 items-center justify-center rounded-full bg-accent-500/15">
                <FeedNavIcon hasUnseen={hasUnseenFeed} />
              </span>
            ) : (
              Icon && <Icon size={19} />
            )}
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
