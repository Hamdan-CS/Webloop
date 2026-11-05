import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { fetchProjects, type ProjectQuery } from '@/services/api';
import type { Project } from '@/types';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Select } from '@/components/shared/ui/Select';
import { cn } from '@/utils/cn';
import { statusLabel, statusTone } from '@/utils/labels';
import { Badge } from '@/components/shared/ui/Badge';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
      .then((data) => setProjects(data))
      .catch((e) => setError(e.message ?? 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, [query]);

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

  const fan = projects.slice(0, 3);

  return (
    <div className="container-page py-8">
      {/* Fan hero — 3 angled project cards, matches the reference's ex-hero */}
      {!loading && fan.length >= 3 && (
        <div className="ex-hero">
          <div className="sec-hd">
            <h1 className="ex-hero-h1">Explore <span className="hl">Projects</span></h1>
            <p className="lead mt-2.5">
              Discover student ideas, company opportunities, and university programs — all open to browse.
            </p>
          </div>
          <div className="fan" aria-hidden="true">
            <div className="fp f0" style={fan[0].cover_image_url ? { backgroundImage: `url(${fan[0].cover_image_url})` } : { background: 'linear-gradient(135deg, var(--cyan), var(--blue))' }} />
            <div className="fp f1" onClick={() => navigate(`/projects/${fan[1].slug}`)}>
              <div style={fan[1].cover_image_url ? { backgroundImage: `url(${fan[1].cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' } : { background: 'linear-gradient(135deg, var(--blue), var(--violet))', width: '100%', height: '100%' }} />
              <div className="corner"><Badge tone={statusTone[fan[1].status]}>{statusLabel[fan[1].status]}</Badge></div>
              <div className="ov-txt"><h3>{fan[1].title}</h3><p>{fan[1].category ?? 'Project'}</p></div>
            </div>
            <div className="fp f2" style={fan[2].cover_image_url ? { backgroundImage: `url(${fan[2].cover_image_url})` } : { background: 'linear-gradient(135deg, var(--violet), var(--cyan))' }} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="pills">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => updateParam('type', t.value)}
              className={cn('pill', (query.type ?? 'all') === t.value && 'on')}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tool-row">
          <div className="search">
            <Search />
            <input
              value={query.search ?? ''}
              onChange={(e) => updateParam('q', e.target.value || null)}
              placeholder="Search projects by title or summary..."
            />
          </div>
          <Select
            className="w-44"
            value={query.sort ?? 'newest'}
            options={SORTS.map((s) => ({ value: s.value, label: `Sort: ${s.label}` }))}
            onChange={(v) => updateParam('sort', v)}
          />
          <div className="fbtn">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn('btn-secondary', showFilters && 'border-accent-400/40 text-accent-200')}
            >
              <SlidersHorizontal size={15} /> Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-accent-500 text-ink-950 text-[10px] font-bold px-1.5">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <div className="fpanel open card-g">
                <div className="grp">
                  <h5>Category</h5>
                  <Select
                    value={query.category ?? 'all'}
                    options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
                    onChange={(v) => updateParam('category', v)}
                  />
                </div>
                <div className="grp">
                  <h5>Difficulty</h5>
                  <Select
                    value={query.difficulty ?? 'all'}
                    options={[
                      { value: 'all', label: 'Any level' },
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                    ]}
                    onChange={(v) => updateParam('difficulty', v)}
                  />
                </div>
                <div className="grp">
                  <h5>Status</h5>
                  <Select
                    value={query.status ?? 'all'}
                    options={[
                      { value: 'all', label: 'Any status' },
                      { value: 'recruiting', label: 'Recruiting' },
                      { value: 'in_progress', label: 'In progress' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                    onChange={(v) => updateParam('status', v)}
                  />
                </div>
                <div className="grp">
                  <h5>Compensation</h5>
                  <Select
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
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleChip active={!!query.beginner} onClick={() => toggleParam('beginner')}>Beginner-friendly</ToggleChip>
                  <ToggleChip active={!!query.remote} onClick={() => toggleParam('remote')}>Remote</ToggleChip>
                  <ToggleChip active={!!query.recruiting} onClick={() => toggleParam('recruiting')}>Actively recruiting</ToggleChip>
                </div>
                {query.technology && (
                  <span className="chip border-accent-400/40 text-accent-200 mt-2">
                    Tech: {query.technology}
                    <button onClick={() => updateParam('technology', null)} aria-label="Clear technology"><X size={12} /></button>
                  </span>
                )}
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="mt-3 text-xs text-slate-400 hover:text-white">Clear all filters</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && !error && (
        <div className="result-line">
          <span>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {/* Main grid */}
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
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
        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-white/5 text-slate-500">
        <Search size={24} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-white">No projects match your filters</h3>
      <p className="mt-2 text-sm text-slate-400">Try clearing some filters or broadening your search.</p>
    </div>
  );
}
