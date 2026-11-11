import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FeedSidebar } from './FeedSidebar';
import type { FeedFiltersState, FeedPostType } from '../types';

const POST_TYPES: { value: FeedPostType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'guide', label: 'Guides' },
  { value: 'pictures', label: 'Pictures' },
  { value: 'text', label: 'Text' },
];

function countFilters(f: FeedFiltersState): number {
  let n = 0;
  if (f.postType !== 'all') n++;
  if (f.tags.length > 0) n++;
  if (f.postedBy !== 'all') n++;
  if (f.sort !== 'for_you') n++;
  if (f.savedOnly) n++;
  return n;
}

interface FeedMobileBarProps {
  filters: FeedFiltersState;
  onChange: (next: FeedFiltersState) => void;
  onEditTopics: () => void;
}

export function FeedMobileBar({ filters, onChange, onEditTopics }: FeedMobileBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = countFilters(filters);

  return (
    <div className="lg:hidden">
      <div className="sticky top-16 z-20 -mx-4 bg-ink-950/80 px-4 py-2.5 backdrop-blur-md">
        <div className="relative mb-2">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search the feed…"
            className="w-full rounded-full border border-white/10 bg-ink-900/60 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...filters, postType: t.value })}
              className={cn('chip shrink-0 transition-colors', filters.postType === t.value && 'border-accent-400/50 bg-accent-500/15 text-accent-200')}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="chip relative shrink-0 transition-colors"
          >
            <SlidersHorizontal size={12} /> Filters
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-accent-500 px-1.5 text-[10px] font-semibold text-ink-950">{activeCount}</span>
            )}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 backdrop-blur-sm" onClick={() => setSheetOpen(false)}>
          <div
            className="max-h-[85vh] w-full overflow-auto rounded-t-2xl border-t border-white/10 bg-ink-950 p-4 pb-8 animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="heading text-base">Filters</h3>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close filters" className="rounded-full p-1.5 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <FeedSidebar filters={filters} onChange={onChange} onEditTopics={onEditTopics} canSort />
            <button type="button" onClick={() => setSheetOpen(false)} className="btn-primary mt-4 w-full">
              Show posts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
