import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, ArrowRight, Globe, Search } from 'lucide-react';
import { fetchCompanies, fetchProfileStats } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Rating, NoRating } from '@/components/ui/Rating';
import { Select } from '@/components/ui/Select';
import { CompaniesCityScene } from '@/components/scenes/Companies-City/CompaniesCityScene';

type Sort = 'new' | 'az';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, { avg: number; count: number }>>({});
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('new');

  useEffect(() => {
    fetchCompanies().then(async (c) => {
      setCompanies(c);
      const entries = await Promise.all(
        c.map(async (p) => {
          const s = await fetchProfileStats(p.id);
          return [p.id, { avg: s.avg_rating, count: s.review_count }] as const;
        }),
      );
      setStats(Object.fromEntries(entries));
      setLoading(false);
    });
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
      {!loading && companies.length > 0 && <CompaniesCityScene companies={companies} onOpen={openCompany} />}

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
                <article key={c.id} className="cc">
                  <div className="banner" style={c.banner_url ? { backgroundImage: `url(${c.banner_url})` } : { background: 'linear-gradient(135deg, var(--cyan), var(--blue))' }} />
                  <div className="main">
                    <div className="hd">
                      <div className="logo-sq"><Avatar src={c.avatar_url} name={c.display_name} size="lg" /></div>
                      <div className="nm">
                        <h3>{c.display_name}{c.verified && <CheckCircle2 size={16} className="vf" />}</h3>
                      </div>
                    </div>
                    <div className="meta">
                      <span className="ref-tag">Company</span>
                      {c.location && <span className="ref-tag">{c.location}</span>}
                    </div>
                    {c.bio && <p className="line-clamp-2">{c.bio}</p>}
                    {c.website_url && <span className="url"><Globe size={14} /> {c.website_url.replace(/^https?:\/\//, '')}</span>}
                    <div className="foot">
                      {stats[c.id]?.count ? <Rating value={stats[c.id].avg} count={stats[c.id].count} /> : <NoRating label="No reviews yet" />}
                      <button type="button" className="go" aria-label={`Open ${c.display_name}`} onClick={() => openCompany(c.handle)}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
