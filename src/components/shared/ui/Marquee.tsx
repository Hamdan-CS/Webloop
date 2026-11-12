import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Endless horizontal strip (content rendered twice). Pauses on hover; static under reduced motion. */
export function Marquee({ children, speed = 34, reverse = false, className, fade = true }: { children: ReactNode; speed?: number; reverse?: boolean; className?: string; fade?: boolean }) {
  return (
    <div className={cn('g-marq', fade && 'is-fade', className)}>
      <div className="g-marq-t" style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}>
        <div className="g-marq-set">{children}</div>
        <div className="g-marq-set" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
