import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Building2, CheckCircle2, ArrowRight, Globe } from 'lucide-react';
import { fetchCompanies, fetchProfileStats } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating, NoRating } from '@/components/ui/Rating';

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, { avg: number; count: number }>>({});

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

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <span className="label-overline">Companies</span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">Discover companies</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Startups and studios publishing real projects, recruiting student contributors, and hiring from verified work.
        </p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {companies.map((c) => (
            <Link key={c.id} to={`/creators/${c.handle}`} className="surface-raised p-6 hover:border-accent-400/30 transition-all group">
              <div className="flex items-start gap-4">
                <Avatar src={c.avatar_url} name={c.display_name} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-lg font-bold text-white truncate">{c.display_name}</h2>
                    {c.verified && <CheckCircle2 size={15} className="text-accent-400 shrink-0" />}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="accent"><Building2 size={12} /> Company</Badge>
                    {c.location && <span className="text-xs text-slate-500">{c.location}</span>}
                  </div>
                  <div className="mt-1.5">
                    {stats[c.id]?.count ? <Rating value={stats[c.id].avg} count={stats[c.id].count} /> : <NoRating label="No reviews yet" />}
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-accent-300 transition-colors shrink-0" />
              </div>
              {c.bio && <p className="mt-4 text-sm text-slate-400 leading-relaxed line-clamp-3">{c.bio}</p>}
              {c.website_url && (
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent-300">
                  <Globe size={12} /> {c.website_url.replace(/^https?:\/\//, '')}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
