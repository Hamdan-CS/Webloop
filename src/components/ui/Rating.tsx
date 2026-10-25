import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function Rating({ value, count, size = 'sm', className }: RatingProps) {
  const starSize = size === 'sm' ? 14 : 16;
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={starSize}
            className={n <= Math.round(value) ? 'fill-signal-amber text-signal-amber' : 'text-white/20'}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-300">
        {value.toFixed(1)}
        {count !== undefined && <span className="text-slate-500"> ({count})</span>}
      </span>
    </div>
  );
}

export function NoRating({ label = 'No reviews yet' }: { label?: string }) {
  return <span className="text-xs text-slate-500">{label}</span>;
}
