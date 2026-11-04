import type { ElementType, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface GlassCardProps {
  as?: ElementType;
  raised?: boolean;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * The shared glass-panel surface, as a component instead of a bare CSS
 * class string. Wraps the same `.surface` / `.surface-raised` classes
 * from index.css, so it already responds to theme and preset changes —
 * use this for new panels instead of hand-writing `className="surface-raised ..."`.
 */
export function GlassCard({ as: Component = 'div', raised = false, className, children, ...props }: GlassCardProps) {
  return (
    <Component className={cn(raised ? 'surface-raised' : 'surface', className)} {...props}>
      {children}
    </Component>
  );
}
