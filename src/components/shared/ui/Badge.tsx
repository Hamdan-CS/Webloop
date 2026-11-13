import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'green' | 'amber' | 'rose' | 'violet';
}

// Badges are chips: pill shape, pastel wash per tone (see .chip-* in index.css).
const toneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: '',
  accent: 'chip-sky',
  green: 'chip-ok',
  amber: 'chip-warn',
  rose: 'chip-danger',
  violet: 'chip-lav',
};

export function Badge({ children, className, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'chip',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
