import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface AccordionProps {
  title: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Height animates via the CSS grid-rows 0fr<->1fr trick (see .feed-acc-body in
 * index.css) so an "auto"-height section still transitions smoothly. */
export function Accordion({ title, badge, open, onToggle, children }: AccordionProps) {
  return (
    <div className="border-b border-white/5 py-1 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-2.5 text-left text-sm font-semibold text-white"
      >
        {title}
        {badge && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">{badge}</span>}
        <ChevronDown size={15} className={cn('feed-acc-chevron ml-auto text-slate-500', open && 'open')} />
      </button>
      <div className={cn('feed-acc-body', open && 'open')}>
        <div className="pb-3">{children}</div>
      </div>
    </div>
  );
}
