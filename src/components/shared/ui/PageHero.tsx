import type { ReactNode } from 'react';
import { Cloud } from '@/design-system/illustrations/Cloud';
import { cn } from '@/utils/cn';

/** Page hero: eyebrow, headline (with an optional .acc word), lead, actions, and soft clouds. */
export function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  clouds = true,
  align = 'center',
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  clouds?: boolean;
  align?: 'center' | 'left';
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('page-hero', align === 'left' && 'left', className)}>
      {clouds && (
        <div className="page-hero-clouds" aria-hidden="true">
          <Cloud tone="white" width="22%" style={{ left: '-4%', top: '38%' }} className="g-drift" />
          <Cloud tone="sky" width="14%" style={{ left: '8%', top: '6%' }} className="g-drift" />
          <Cloud tone="sky" width="24%" style={{ right: '-5%', top: '30%' }} className="g-drift" />
          <Cloud tone="white" width="11%" style={{ right: '10%', top: '2%' }} className="g-drift" />
        </div>
      )}
      {eyebrow && <span className="label-overline">{eyebrow}</span>}
      <h1>{title}</h1>
      {lead && <p>{lead}</p>}
      {actions && <div className="actions">{actions}</div>}
      {children}
    </header>
  );
}
