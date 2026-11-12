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
      className="mtab fixed inset-x-3 z-40 grid rounded-[24px] px-1 md:hidden"
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
              cn('flex flex-col items-center justify-center gap-1 py-2 text-center text-[10.5px] font-medium leading-tight text-graphite', isActive && 'text-ink')
            }
          >
            {item.isFeed ? (
              <span className="flex h-7 w-10 items-center justify-center rounded-full bg-sky">
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
