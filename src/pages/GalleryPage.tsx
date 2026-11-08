import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Images } from 'lucide-react';
import { fetchPortfolioGallery } from '@/services/api';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import type { PortfolioItem } from '@/types';
import { WorkCard } from '@/components/gallery/WorkCard';
import { WorkDetail, StudentDetail } from '@/components/gallery/GalleryOverlays';
import { Select } from '@/components/shared/ui/Select';
import { GalleryHero, matchesGalleryChip, type GalleryChipId } from '@/components/gallery/GalleryHero';

const SORT_OPTIONS = [
  { value: 'act', label: 'Most active' },
  { value: 'new', label: 'Newest' },
  { value: 'az', label: 'A to Z' },
];

type Sort = 'act' | 'new' | 'az';

export function GalleryPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chip, setChip] = useState<GalleryChipId>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('act');
  const [work, setWork] = useState<PortfolioItem | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetchPortfolioGallery(60)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const l = items.filter(
      (w) =>
        matchesGalleryChip(w, chip) &&
        (!n || `${w.title} ${w.description ?? ''} ${(w.tech ?? []).join(' ')} ${w.profile?.display_name ?? ''}`.toLowerCase().includes(n)),
    );
    const by = {
      act: (a: PortfolioItem, b: PortfolioItem) => (b.activity ?? 0) - (a.activity ?? 0),
      new: (a: PortfolioItem, b: PortfolioItem) => b.created_at.localeCompare(a.created_at),
      az: (a: PortfolioItem, b: PortfolioItem) => a.title.localeCompare(b.title),
    }[sort];
    return [...l].sort(by);
  }, [items, chip, q, sort]);

  return (
    <div className="container-page py-8">
      <GalleryHero
        activeChip={chip}
        onSelectChip={setChip}
        items={items}
        loading={loading}
        onOpenItem={setWork}
      />

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <LoopLoader size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="gal-empty">
          <Images size={28} style={{ margin: '0 auto 12px' }} />
          <p>No portfolio items yet. Student work will appear here once published.</p>
        </div>
      ) : (
        <>
          <div className="gal-bar">
            <div className="gal-tools">
              <input className="gal-input" type="search" placeholder="Search work, tech or student" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search student work" />
              <Select
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                options={SORT_OPTIONS}
                className="w-44 shrink-0"
              />
            </div>
            <span className="gal-count">{list.length} work{list.length === 1 ? '' : 's'}</span>
          </div>

          {list.length === 0 ? (
            <div className="gal-empty">No student work matches this category or search.</div>
          ) : (
            <div className="grid3">
              <AnimatePresence mode="popLayout" initial={false}>
                {list.map((w, i) => (
                  <motion.div
                    key={w.id}
                    layout
                    initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <WorkCard item={w} onOpen={setWork} onOpenStudent={setStudentId} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {work && !studentId && (
        <WorkDetail item={work} onClose={() => setWork(null)} onOpenStudent={(id) => setStudentId(id)} />
      )}
      {studentId && (
        <StudentDetail
          profileId={studentId}
          items={items}
          onClose={() => setStudentId(null)}
          onOpenWork={(w) => { setStudentId(null); setWork(w); }}
        />
      )}
    </div>
  );
}
