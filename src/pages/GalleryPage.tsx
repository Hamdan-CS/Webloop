import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Images, ArrowUpRight } from 'lucide-react';
import { fetchPortfolioGallery } from '@/lib/api';
import type { PortfolioItem } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

export function GalleryPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    fetchPortfolioGallery().then((d) => {
      setItems(d);
      setLoading(false);
    });
  }, []);

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <span className="label-overline">Student Work</span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">Student work gallery</h1>
        <p className="mt-2 text-slate-400 max-w-2xl">
          Public portfolio pieces from student builders — shipped projects, experiments, and coursework.
        </p>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface p-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-white/5 text-slate-500">
            <Images size={24} />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold text-white">No portfolio items yet</h3>
          <p className="mt-2 text-sm text-slate-400">Student work will appear here once published.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="group surface overflow-hidden text-left hover:border-accent-400/30 transition-all"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {item.cover_image_url ? (
                  <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                <span className="absolute left-2.5 top-2.5"><Badge tone="violet">{item.category}</Badge></span>
              </div>
              <div className="p-4">
                <p className="font-display text-base font-semibold text-white line-clamp-1">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">{item.description}</p>
                {item.profile && (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                    <Avatar src={item.profile.avatar_url} name={item.profile.display_name} size="sm" />
                    <span className="text-xs text-slate-400 truncate">{item.profile.display_name}</span>
                    <ArrowUpRight size={14} className="ml-auto text-slate-500 group-hover:text-accent-300 transition-colors" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4" onClick={() => setActive(null)} role="dialog" aria-modal="true">
          <div className="surface-raised w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
              {active.cover_image_url ? (
                <img src={active.cover_image_url} alt={active.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-850" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
              <span className="absolute left-4 top-4"><Badge tone="violet">{active.category}</Badge></span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-2xl font-bold text-white">{active.title}</h2>
                <Badge tone="green">{active.project_status}</Badge>
              </div>
              {active.profile && (
                <Link to={`/creators/${active.profile.handle}`} className="flex items-center gap-2.5">
                  <Avatar src={active.profile.avatar_url} name={active.profile.display_name} size="md" />
                  <div>
                    <p className="text-sm font-medium text-white">{active.profile.display_name}</p>
                    <p className="text-xs text-slate-500">{active.role}</p>
                  </div>
                </Link>
              )}
              {active.description && <p className="text-sm text-slate-300 leading-relaxed">{active.description}</p>}
              {active.contributions && (
                <div>
                  <h3 className="label-overline mb-1.5">Contributions</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{active.contributions}</p>
                </div>
              )}
              {active.lessons_learned && (
                <div>
                  <h3 className="label-overline mb-1.5">Lessons learned</h3>
                  <p className="text-sm text-slate-400 leading-relaxed italic">{active.lessons_learned}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge>Work type: {active.work_type}</Badge>
                {active.repo_url && (
                  <a href={active.repo_url} target="_blank" rel="noopener noreferrer" className="chip hover:border-accent-400/40 hover:text-accent-200">Repository</a>
                )}
                {active.demo_url && (
                  <a href={active.demo_url} target="_blank" rel="noopener noreferrer" className="chip hover:border-accent-400/40 hover:text-accent-200">Live demo</a>
                )}
              </div>
              {active.is_demo && (
                <div className="rounded-lg border border-signal-amber/20 bg-signal-amber/5 px-3 py-2 text-xs text-signal-amber/90">
                  Demo content — sample portfolio item for platform preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
