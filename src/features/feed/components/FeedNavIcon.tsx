import { useId } from 'react';
import { cn } from '@/utils/cn';
import { INF_PATH } from '@/components/navigation/Wordmark';

/** The Feed nav item's icon — the same infinity-loop path as the WebLoop
 * wordmark/LoopLoader, reused here at nav size. Unlike the wordmark (which
 * always flows), this one is still by default and only animates on hover,
 * or continuously while `hasUnseen` is true. */
export function FeedNavIcon({ hasUnseen, className }: { hasUnseen?: boolean; className?: string }) {
  const id = useId();
  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <svg viewBox="0 0 64 30" width={22} height={11} aria-hidden="true" className={cn('feed-nav-loop', hasUnseen && 'live')}>
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="1" stopColor="var(--wordmark-accent)" />
          </linearGradient>
        </defs>
        <path stroke={`url(#${id})`} pathLength={100} d={INF_PATH} />
        <path className="spark" pathLength={100} d={INF_PATH} />
      </svg>
      {hasUnseen && <span className="feed-nav-dot absolute -right-1.5 -top-1" />}
    </span>
  );
}
