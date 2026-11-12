import { useEffect, useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { fetchPortfolioGallery } from '@/services/api';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import type { PortfolioItem } from '@/types';
import { WorkCard } from '@/components/gallery/WorkCard';
import { WorkDetail, StudentDetail } from '@/components/gallery/GalleryOverlays';
import { Select } from '@/components/shared/ui/Select';
import { WPageHeader } from '@/components/app/ui';
import { useWorkspaceMaybe } from '@/components/app/workspaceContext';

const SORT_OPTIONS = [
  { value: 'act', label: 'Most active' },
  { value: 'new', label: 'Newest' },
  { value: 'az', label: 'A to Z' },
];

type Sort = 'act' | 'new' | 'az';
const ALL = 'All works';

export function GalleryPage() {
  const ws = useWorkspaceMaybe();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('act');
  const [work, setWork] = useState<PortfolioItem | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioGallery(60)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const cats = useMemo(() => [ALL, ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))], [items]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const l = items.filter(
      (w) =>
        (cat === ALL || w.category === cat) &&
        (!n || `${w.title} ${w.description ?? ''} ${(w.tech ?? []).join(' ')} ${w.profile?.display_name ?? ''}`.toLowerCase().includes(n)),
    );
    const by = {
      act: (a: PortfolioItem, b: PortfolioItem) => (b.activity ?? 0) - (a.activity ?? 0),
      new: (a: PortfolioItem, b: PortfolioItem) => b.created_at.localeCompare(a.created_at),
      az: (a: PortfolioItem, b: PortfolioItem) => a.title.localeCompare(b.title),
    }[sort];
    return [...l].sort(by);
  }, [items, cat, q, sort]);

  return (
    <div className="container-page py-8">
      {ws ? (
        <WPageHeader title="Student work" subtitle="Every finished task is reviewed by a project owner and becomes verified career evidence." />
      ) : (
      <div className="sec-hd" style={{ marginBottom: 28 }}>
        <h1 className="gal-title">Student work <span className="hl">gallery</span></h1>
        <p className="gal-sub">
          Every task you finish is reviewed by a project owner and becomes verified career evidence.
          Companies hire from demonstrated work, not self-reported skills.
        </p>
      </div>
      )}

      <div className={loading ? undefined : 'reveal'}>
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
            <div className="gal-pills" role="group" aria-label="Filter by category">
              {cats.map((c) => (
                <button key={c} type="button" className={`pill ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            <div className="gal-tools">
              <input className="gal-input" type="search" placeholder="Search work, tech or student" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search student work" />
              <Select
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                options={SORT_OPTIONS}
                size="sm"
                className="w-44 shrink-0"
              />
            </div>
          </div>

          {list.length === 0 ? (
            <div className="gal-empty">No student work matches your search.</div>
          ) : (
            <div className="grid3">
              {list.map((w) => (
                <WorkCard key={w.id} item={w} onOpen={setWork} onOpenStudent={setStudentId} />
              ))}
            </div>
          )}
        </>
      )}
</div>

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
