import { GlassCard } from '@/design-system';

/** `compact`: no square image block — a short placeholder for small lists (profile Posts). */
export function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <GlassCard raised className="p-5">
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3.5 w-3/4 rounded" />
        {!compact && <div className="skeleton h-3.5 w-1/2 rounded" />}
      </div>
      {!compact && <div className="skeleton mt-4 aspect-square w-full rounded-xl" />}
    </GlassCard>
  );
}

export function SkeletonFeed({ count = 3, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} compact={compact} />
      ))}
    </div>
  );
}
