import { Check, Clock3, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Baselayer verification line: status mark · what · source · when. */
export function VerifyRow({ status, label, source, time, className }: { status: 'verified' | 'pending' | 'rejected'; label: string; source?: string; time?: string; className?: string }) {
  return (
    <div className={cn('g-vrow', `is-${status}`, className)}>
      <span className="g-vrow-ck" aria-label={status}>
        {status === 'verified' && <Check size={12} strokeWidth={3.2} />}
        {status === 'rejected' && <X size={12} strokeWidth={3.2} />}
        {status === 'pending' && <Clock3 size={12} strokeWidth={2.4} />}
      </span>
      <span className="g-vrow-l">
        {label}
        {source && <small>{source}</small>}
      </span>
      <small className="g-vrow-t">{time ?? (status === 'pending' ? 'pending' : '')}</small>
    </div>
  );
}
