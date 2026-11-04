import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import type { PortfolioItem } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { MiniHeat } from './MiniHeat';
import { catColor } from './WorkCard';
import { hashS } from '@/utils/heat';

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', k);
    };
  }, [onClose]);
  return (
    <div className="gal-ovl" role="dialog" aria-modal="true">
      <div className="gal-ovl-in">
        <div className="gal-ovl-bar">
          <button type="button" className="gal-back" onClick={onClose}>
            <ArrowLeft size={16} /> Back to Student Work
          </button>
          <button type="button" className="gal-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function WorkDetail({ item, onClose, onOpenStudent }: { item: PortfolioItem; onClose: () => void; onOpenStudent: (id: string) => void }) {
  const p = item.profile;
  return (
    <Shell onClose={onClose}>
      <div className="gal-card-lg">
        <div className="gal-hero">{item.cover_image_url && <img src={item.cover_image_url} alt="" width={900} height={300} />}</div>
        <div className="gal-pad">
          {item.category && <span className="gal-tag" style={{ borderColor: `${catColor(item.category)}88` }}>{item.category}</span>}
          <h2 className="gal-h2">{item.title}</h2>
          <p className="gal-lead">{item.description}</p>
          {(item.tech ?? []).length > 0 && (
            <div className="ref-tags" style={{ margin: '16px 0' }}>
              {(item.tech ?? []).map((t) => <span key={t} className="ref-tag">{t}</span>)}
            </div>
          )}
          {p && (
            <button type="button" className="gal-who" onClick={() => onOpenStudent(p.id)}>
              <Avatar src={p.avatar_url} name={p.display_name} size="lg" />
              <span>
                <b>{p.display_name}</b>
                <small>{item.role ?? p.headline} · view profile</small>
              </span>
            </button>
          )}
          <h3 className="gal-h3">Activity over the last year</h3>
          <div className="gal-scroll"><MiniHeat seed={hashS(item.id) % 1000} intensity={item.activity ?? 0.5} weeks={52} rows={7} cell={13} /></div>
          <p className="gal-muted">Illustrative demo data. Published {fmtDate(item.created_at)}.</p>
          <div className="ref-tags" style={{ marginTop: 16 }}>
            {item.repo_url && <a className="ref-tag" href={item.repo_url} target="_blank" rel="noopener noreferrer">Repository</a>}
            {item.demo_url && <a className="ref-tag" href={item.demo_url} target="_blank" rel="noopener noreferrer">Live demo</a>}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function StudentDetail({
  profileId,
  items,
  onClose,
  onOpenWork,
}: {
  profileId: string;
  items: PortfolioItem[];
  onClose: () => void;
  onOpenWork: (item: PortfolioItem) => void;
}) {
  const mine = items.filter((i) => i.profile_id === profileId);
  const p = mine[0]?.profile;
  if (!p) return null;
  return (
    <Shell onClose={onClose}>
      <div className="gal-card-lg gal-pad">
        <div className="gal-person">
          <Avatar src={p.avatar_url} name={p.display_name} size="xl" />
          <div>
            <h2 className="gal-h2" style={{ margin: 0 }}>{p.display_name}</h2>
            <p className="gal-muted" style={{ margin: '4px 0 0' }}>{p.headline}</p>
            <Link to={`/creators/${p.handle}`} className="gal-link">View full profile</Link>
          </div>
        </div>
        <h3 className="gal-h3">Contribution activity</h3>
        <div className="gal-scroll"><MiniHeat seed={hashS(profileId) % 1000} intensity={0.7} weeks={52} rows={7} cell={13} /></div>
        <p className="gal-muted">Illustrative demo data. Hover a square for details.</p>
        <h3 className="gal-h3" style={{ marginTop: 28 }}>Work ({mine.length})</h3>
        <div className="grid3">
          {mine.map((w) => (
            <article key={w.id} className="gc" tabIndex={0} role="button" style={{ cursor: 'pointer' }} onClick={() => onOpenWork(w)} onKeyDown={(e) => e.key === 'Enter' && onOpenWork(w)}>
              <div className="thumb">
                {w.cover_image_url && <img src={w.cover_image_url} alt="" loading="lazy" />}
                {w.category && <span className="cat" style={{ background: `${catColor(w.category)}cc` }}>{w.category}</span>}
              </div>
              <div className="body"><h3>{w.title}</h3><p>{w.description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
}
