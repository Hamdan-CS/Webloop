import { useState } from 'react';
import { Search, Bookmark, Rss } from 'lucide-react';
import { cn } from '@/utils/cn';
import { GlassCard } from '@/design-system';
import { Accordion } from './Accordion';
import { FEED_TAGS } from '../constants';
import type { FeedFiltersState, FeedPostedBy, FeedPostType, FeedSort } from '../types';
import { DEFAULT_FEED_FILTERS } from '../types';

const POST_TYPES: { value: FeedPostType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'guide', label: 'Guides' },
  { value: 'pictures', label: 'Pictures' },
  { value: 'text', label: 'Text' },
];

const POSTED_BY: { value: FeedPostedBy; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'team', label: 'Student teams' },
  { value: 'company', label: 'Companies' },
  { value: 'university', label: 'Universities' },
];

const SORTS: { value: FeedSort; label: string }[] = [
  { value: 'for_you', label: 'For you' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_liked', label: 'Most liked' },
];

interface FeedSidebarProps {
  filters: FeedFiltersState;
  onChange: (next: FeedFiltersState) => void;
  onEditTopics: () => void;
  canSort: boolean;
}

function countFilters(f: FeedFiltersState): number {
  let n = 0;
  if (f.postType !== 'all') n++;
  if (f.tags.length > 0) n++;
  if (f.postedBy !== 'all') n++;
  if (f.sort !== 'for_you') n++;
  if (f.savedOnly) n++;
  return n;
}

export function FeedSidebar({ filters, onChange, onEditTopics, canSort }: FeedSidebarProps) {
  const [open, setOpen] = useState({ topics: false, from: false, sort: false });
  const activeCount = countFilters(filters);

  function toggleTag(tag: string) {
    const tags = filters.tags.includes(tag as never)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag as (typeof filters.tags)[number]];
    onChange({ ...filters, tags });
  }

  return (
    <GlassCard className="p-4">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search the feed…"
          className="w-full rounded-full border border-white/10 bg-ink-900/60 py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onChange({ ...filters, savedOnly: false })}
          className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium', !filters.savedOnly ? 'bg-accent-500/10 text-accent-200' : 'text-slate-400 hover:bg-white/5')}
        >
          <Rss size={15} /> Feed
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, savedOnly: true })}
          className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium', filters.savedOnly ? 'bg-accent-500/10 text-accent-200' : 'text-slate-400 hover:bg-white/5')}
        >
          <Bookmark size={15} /> Saved
        </button>
      </div>

      <div className="mt-4">
        <p className="label-overline mb-2">Post type</p>
        <div className="flex flex-wrap gap-1.5">
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...filters, postType: t.value })}
              className={cn('chip transition-colors', filters.postType === t.value && 'border-accent-400/50 bg-accent-500/15 text-accent-200')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <Accordion
          title="Topics"
          badge={filters.tags.length > 0 ? `${filters.tags.length} on` : undefined}
          open={open.topics}
          onToggle={() => setOpen((o) => ({ ...o, topics: !o.topics }))}
        >
          <div className="flex flex-wrap gap-1.5">
            {FEED_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn('chip transition-colors', filters.tags.includes(tag) && 'border-accent-400/50 bg-accent-500/15 text-accent-200')}
              >
                {tag}
              </button>
            ))}
          </div>
          <button type="button" onClick={onEditTopics} className="link-accent mt-2 block text-xs">
            Edit my topics
          </button>
        </Accordion>

        <Accordion
          title="Posted by"
          badge={filters.postedBy !== 'all' ? POSTED_BY.find((p) => p.value === filters.postedBy)?.label : undefined}
          open={open.from}
          onToggle={() => setOpen((o) => ({ ...o, from: !o.from }))}
        >
          <div className="flex flex-col gap-1">
            {POSTED_BY.map((p) => (
              <label key={p.value} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-300">
                <input
                  type="radio"
                  name="posted-by"
                  checked={filters.postedBy === p.value}
                  onChange={() => onChange({ ...filters, postedBy: p.value })}
                  className="accent-accent-500"
                />
                {p.label}
              </label>
            ))}
          </div>
        </Accordion>

        {canSort && (
          <Accordion
            title="Sort by"
            badge={SORTS.find((s) => s.value === filters.sort)?.label}
            open={open.sort}
            onToggle={() => setOpen((o) => ({ ...o, sort: !o.sort }))}
          >
            <div className="flex flex-col gap-1">
              {SORTS.map((s) => (
                <label key={s.value} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-300">
                  <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === s.value}
                    onChange={() => onChange({ ...filters, sort: s.value })}
                    className="accent-accent-500"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </Accordion>
        )}
      </div>

      {activeCount > 0 && (
        <button type="button" onClick={() => onChange(DEFAULT_FEED_FILTERS)} className="link-accent mt-3 block text-xs">
          Reset filters
        </button>
      )}
    </GlassCard>
  );
}
