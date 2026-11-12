import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Baselayer hierarchy in Genie type: mono eyebrow → display headline → one-line lead. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = 'center',
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'left';
  as?: 'h1' | 'h2';
  className?: string;
}) {
  return (
    <div className={cn('section-head', align === 'center' && 'center', className)}>
      {eyebrow && <span className="label-overline">{eyebrow}</span>}
      <Tag>{title}</Tag>
      {lead && <p>{lead}</p>}
    </div>
  );
}
