import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { fetchCompanies, fetchCompanyProjectSummaries, type CompanyProjectSummary } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { Select } from '@/components/ui/Select';
import { CompaniesCityScene } from '@/components/scenes/Companies-City/CompaniesCityScene';

type Sort = 'new' | 'az';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Record<string, CompanyProjectSummary>>({});
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('new');

  useEffect(() => {
    fetchCompanies()
      .then(async (c) => {
        setCompanies(c);
        try { setSummaries(await fetchCompanyProjectSummaries(c.map((p) => p.id))); } catch { /* cards still render without counts */ }
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    let l = companies.filter((c) => !query || `${c.display_name} ${c.bio ?? ''} ${c.location ?? ''}`.toLowerCase().includes(query));
    l = [...l].sort(sort === 'az' ? (a, b) => a.display_name.localeCompare(b.display_name) : (a, b) => b.created_at.localeCompare(a.created_at));
    return l;
  }, [companies, q, sort]);

  const openCompany = (handle: string) => navigate(`/creators/${handle}`);

  return (
    <div className="container-page py-8">
      {!loading && companies.length > 0 && <CompaniesCityScene companies={companies} onOpen={openCompany} hoveredId={hoverId} onHoverId={setHoverId} />}

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : (
        <>
          <div className="co-filters">
            <div className="search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search companies by name, bio, or location…" aria-label="Search companies" />
            </div>
            <Select
              className="w-44"
              value={sort}
              options={[{ value: 'new', label: 'Sort: Newest' }, { value: 'az', label: 'Sort: A to Z' }]}
              onChange={(v) => setSort(v as Sort)}
            />
          </div>
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>{list.length} compan{list.length === 1 ? 'y' : 'ies'}</p>

          {list.length === 0 ? (
            <div className="surface p-14 text-center">
              <p className="text-slate-400">No companies match those filters.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <CompanyCard key={c.id} company={c} summary={summaries[c.id]} glow={hoverId === c.id} onHover={setHoverId} onOpen={openCompany} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
