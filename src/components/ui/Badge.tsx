import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'accent' | 'green' | 'amber' | 'rose' | 'violet';
}

const toneClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-white/10 bg-white/5 text-slate-300',
  accent: 'border-accent-400/30 bg-accent-500/10 text-accent-200',
  green: 'border-signal-green/30 bg-signal-green/10 text-signal-green',
  amber: 'border-signal-amber/30 bg-signal-amber/10 text-signal-amber',
  rose: 'border-signal-rose/30 bg-signal-rose/10 text-signal-rose',
  violet: 'border-signal-violet/30 bg-signal-violet/10 text-signal-violet',
};

export function Badge({ children, className, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
