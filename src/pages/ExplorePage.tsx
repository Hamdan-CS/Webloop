import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react';
import { fetchProjects, type ProjectQuery } from '@/lib/api';
import type { Project } from '@/lib/types';
import { ProjectCover } from '@/components/projects/ProjectCover';
import { DetailsPanel } from '@/components/projects/DetailsPanel';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { fetchProfileStats } from '@/lib/api';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Web App', 'Mobile App', 'Backend / Infra', 'Developer Tool', 'Game / Engine', 'ML', 'CLI'];
const TYPES = [
  { value: 'all', label: 'All projects' },
  { value: 'student', label: 'Student projects' },
  { value: 'company', label: 'Company projects' },
  { value: 'university', label: 'University projects' },
  { value: 'open_source', label: 'Open source' },
];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'most_active', label: 'Most active' },
];

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [ratingMap, setRatingMap] = useState<Record<string, { avg: number; count: number }>>({});

  const query: ProjectQuery = useMemo(
    () => ({
      type: searchParams.get('type') ?? 'all',
      category: searchParams.get('category') ?? 'all',
      difficulty: searchParams.get('difficulty') ?? 'all',
      status: searchParams.get('status') ?? 'all',
      compensation: searchParams.get('compensation') ?? 'all',
      beginner: searchParams.get('beginner') === '1',
      remote: searchParams.get('remote') === '1',
      recruiting: searchParams.get('recruiting') === '1',
      search: searchParams.get('q') ?? undefined,
      technology: searchParams.get('technology') ?? undefined,
      sort: (searchParams.get('sort') as ProjectQuery['sort']) ?? 'newest',
    }),
    [searchParams],
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchProjects(query)
      .then((data) => {
        setProjects(data);
        // load ratings for project owners
        const ownerIds = Array.from(new Set(data.map((p) => p.owner_id)));
        Promise.all(
          ownerIds.map(async (id) => {
            const stats = await fetchProfileStats(id);
            return [id, { avg: stats.avg_rating, count: stats.review_count }] as const;
          }),
        ).then((entries) => {
          setRatingMap(Object.fromEntries(entries));
        });
      })
      .catch((e) => setError(e.message ?? 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, [query]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? projects[0] ?? null,
    [projects, selectedId],
  );
  const selectedIndex = selected ? projects.findIndex((p) => p.id === selected.id) : -1;

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const toggleParam = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (next.get(key) === '1') next.delete(key);
    else next.set(key, '1');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const activeFilterCount = Array.from(searchParams.entries()).filter(
    ([k, v]) => !['sort'].includes(k) && v !== 'all' && v !== '',
  ).length;

  return (
    <div className="container-page py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Explore Projects</h1>
        <p className="mt-2 text-slate-400">
          Discover student ideas, company opportunities, and university programs — all open to browse.
        </p>
      </div>

      {/* Type tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => updateParam('type', t.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
              (query.type ?? 'all') === t.value
                ? 'bg-accent-500 text-ink-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query.search ?? ''}
            onChange={(e) => updateParam('q', e.target.value || null)}
            placeholder="Search projects by title or summary..."
            className="w-full rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:bg-ink-900"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'btn-secondary',
            showFilters && 'border-accent-400/40 text-accent-200',
          )}
        >
          <SlidersHorizontal size={15} /> Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-accent-500 text-ink-950 text-[10px] font-bold px-1.5">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="relative">
          <select
            value={query.sort ?? 'newest'}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="appearance-none rounded-xl border border-white/10 bg-ink-900/60 py-2.5 pl-4 pr-9 text-sm text-slate-200 focus:border-accent-400/40"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value} className="bg-ink-900">
                Sort: {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="surface mb-6 p-4 animate-fade-in-up">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Category"
              value={query.category ?? 'all'}
              options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
              onChange={(v) => updateParam('category', v)}
            />
            <FilterSelect
              label="Difficulty"
              value={query.difficulty ?? 'all'}
              options={[
                { value: 'all', label: 'Any level' },
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              onChange={(v) => updateParam('difficulty', v)}
            />
            <FilterSelect
              label="Status"
              value={query.status ?? 'all'}
              options={[
                { value: 'all', label: 'Any status' },
                { value: 'recruiting', label: 'Recruiting' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'completed', label: 'Completed' },
              ]}
              onChange={(v) => updateParam('status', v)}
            />
            <FilterSelect
              label="Compensation"
              value={query.compensation ?? 'all'}
              options={[
                { value: 'all', label: 'Any' },
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid_educational', label: 'Unpaid · Educational' },
                { value: 'open_source', label: 'Open source' },
              ]}
              onChange={(v) => updateParam('compensation', v)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ToggleChip active={!!query.beginner} onClick={() => toggleParam('beginner')}>
              Beginner-friendly
            </ToggleChip>
            <ToggleChip active={!!query.remote} onClick={() => toggleParam('remote')}>
              Remote
            </ToggleChip>
            <ToggleChip active={!!query.recruiting} onClick={() => toggleParam('recruiting')}>
              Actively recruiting
            </ToggleChip>
            {query.technology && (
              <span className="chip border-accent-400/40 text-accent-200">
                Tech: {query.technology}
                <button onClick={() => updateParam('technology', null)} aria-label="Clear technology">
                  <X size={12} />
                </button>
              </span>
            )}
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="ml-auto text-xs text-slate-400 hover:text-white">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main two-panel layout */}
      {loading ? (
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : error ? (
        <div className="surface p-10 text-center">
          <p className="text-signal-rose">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.5fr_1fr]">
          {/* LEFT: interactive preview + card grid */}
          <div className="group relative flex flex-col gap-5">
            {selected && (
              <div className="relative h-[46vh] min-h-[340px] lg:h-[52vh]">
                <ProjectCover
                  project={selected}
                  index={selectedIndex}
                  total={projects.length}
                  onPrev={() =>
                    setSelectedId(
                      projects[(selectedIndex - 1 + projects.length) % projects.length].id,
                    )
                  }
                  onNext={() =>
                    setSelectedId(projects[(selectedIndex + 1) % projects.length].id)
                  }
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'transition-transform',
                    selected?.id === p.id && 'lg:ring-2 lg:ring-accent-400/40 rounded-2xl',
                  )}
                >
                  <ProjectCard project={p} selected={selected?.id === p.id} onClick={() => setSelectedId(p.id)} compact />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: persistent details panel (sticky on desktop) */}
          <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            {selected && (
              <div className="h-full surface-raised overflow-hidden">
                <DetailsPanel
                  project={selected}
                  avgRating={ratingMap[selected.owner_id]?.avg}
                  reviewCount={ratingMap[selected.owner_id]?.count}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2.5 text-sm text-slate-200 focus:border-accent-400/40"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-ink-900">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
    </label>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-accent-400/40 bg-accent-500/15 text-accent-200'
          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
      )}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="surface p-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
        <Search size={24} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-white">No projects match your filters</h3>
      <p className="mt-2 text-sm text-slate-400">Try clearing some filters or broadening your search.</p>
    </div>
  );
}
