/* Scene C — Live Projects, ported faithfully from the approved HTML
 * reference (section "C — LIVE PROJECTS (3D carousel)" + its "REVISION"
 * overrides). A perspective pedestal carries real WebLoop projects as
 * cards offset by index, tilted in 3D — CSS transforms, not WebGL. This
 * scene has no existing prior art in the codebase; it replaces the old
 * "browser + floating cards" showcase scene in the homepage flow. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ExternalLink, Users } from 'lucide-react';
import { fetchFeaturedProjects } from '@/services/api';
import type { Project } from '@/types';
import { Badge } from '@/components/shared/ui/Badge';
import { Avatar } from '@/components/shared/ui/Avatar';
import { statusLabel, statusTone, projectTypeLabel } from '@/utils/labels';

export function LiveProjectsScene() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [idx, setIdx] = useState(0);
  const carRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchFeaturedProjects(9).then((data) => {
      if (!active) return;
      setProjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [projects]);

  const list = useMemo(
    () => (cat === 'all' ? projects : projects.filter((p) => p.category === cat)),
    [projects, cat],
  );

  useEffect(() => { setIdx(0); }, [cat]);

  const go = (d: number) => {
    if (!list.length) return;
    setIdx((i) => (i + d + list.length) % list.length);
  };

  const onCardClick = (p: Project, i: number) => {
    if (i === idx) navigate(`/projects/${p.slug}`);
    else setIdx(i);
  };

  // swipe support
  useEffect(() => {
    const car = carRef.current;
    if (!car) return;
    let sx: number | null = null;
    const onDown = (e: PointerEvent) => { sx = e.clientX; };
    const onUp = (e: PointerEvent) => {
      if (sx == null) return;
      const d = e.clientX - sx;
      if (Math.abs(d) > 60) go(d < 0 ? 1 : -1);
      sx = null;
    };
    car.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    };
    car.addEventListener('keydown', onKey);
    return () => {
      car.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      car.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const N = list.length;
  const joinAvatars = list.slice(0, 4).flatMap((p) => p.owner ? [p.owner] : []);

  return (
    <section id="live" className="ws-scene ref-live" aria-labelledby="h-rlive" style={{ paddingTop: 96, paddingBottom: 96, scrollMarginTop: 80 }}>
      <div className="wrap wide">
        <div className="live-top">
          <div className="sec-hd">
            <h2 id="h-rlive" className="hr-h2" style={{ maxWidth: '20ch' }}>
              Real projects. Real people. Real <span className="hl" style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>opportunities.</span>
            </h2>
            <p className="hr-lead" style={{ marginTop: 14 }}>Join live projects from startups, companies, and universities. Build real solutions with real teams.</p>
            <div className="live-cta" style={{ marginTop: 18 }}>
              <Link to="/explore" className="btn btn-primary">Browse all projects <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="chips-3d" role="tablist" aria-label="Project categories">
            <button type="button" className={`chipc${cat === 'all' ? ' on' : ''}`} role="tab" aria-selected={cat === 'all'} onClick={() => setCat('all')}>All</button>
            {categories.map((c) => (
              <button key={c} type="button" className={`chipc${cat === c ? ' on' : ''}`} role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="carousel" ref={carRef} tabIndex={0} aria-roledescription="carousel" aria-label="Live projects">
          {!loading && joinAvatars.length > 0 && (
            <div className="join-chip" aria-hidden="true">
              <span className="ref-avs">{joinAvatars.map((o, i) => <Avatar key={i} src={o.avatar_url} name={o.display_name} size="sm" />)}</span>
              <span><b>Join real teams</b><small>Build real experience</small></span>
            </div>
          )}
          <div className="pedestal" aria-hidden="true"><i /><i /><i /></div>

          <div className="cards3d">
            {list.map((p, i) => {
              let o = i - idx;
              if (N > 3) { if (o > N / 2) o -= N; if (o < -N / 2) o += N; }
              const a = Math.abs(o);
              const gap = carRef.current ? Math.min(262, Math.max(150, carRef.current.clientWidth * 0.235)) : 220;
              const on = o === 0;
              return (
                <article
                  key={p.id}
                  className={`pcard3${on ? ' on' : ''}`}
                  style={{
                    transform: `translate3d(${o * gap}px, ${a * 18 - (on ? 10 : 0)}px, ${-a * 150 + (on ? 80 : 0)}px) rotateY(${-o * 24}deg) scale(${on ? 1.04 : 1})`,
                    opacity: a > 2 ? 0 : 1,
                    filter: a ? `brightness(${1 - a * 0.16}) saturate(${1 - a * 0.12})` : '',
                    zIndex: 10 - a,
                    pointerEvents: a > 2 ? 'none' : 'auto',
                  }}
                  aria-hidden={a > 2}
                  onClick={() => onCardClick(p, i)}
                >
                  <div className="in">
                    <div className="thumb" style={p.cover_image_url ? { backgroundImage: `url(${p.cover_image_url})` } : undefined}>
                      <div className="corner">
                        <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                        <Badge>{projectTypeLabel[p.project_type].split(' ')[0]}</Badge>
                      </div>
                    </div>
                    <span className="arrow"><ExternalLink size={16} /></span>
                    <div className="body">
                      <h3>{p.title}</h3>
                      <div className="tl">{p.category ?? 'Project'}</div>
                      <div className="ds">{p.summary}</div>
                      <div className="ref-tags">
                        {(p.skills ?? []).slice(0, 3).map((s) => <span key={s.id} className="ref-tag">{s.name}</span>)}
                      </div>
                      <div className="foot">
                        <span className="ref-avs">
                          {(p.members ?? []).slice(0, 4).map((m, k) => <Avatar key={k} src={m.profile?.avatar_url} name={m.profile?.display_name ?? 'Member'} size="sm" />)}
                          {p.team_size > 4 && <small style={{ marginLeft: 6 }}>+{p.team_size - 4}</small>}
                          {(p.members ?? []).length === 0 && <small style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={12} />{p.team_size}</small>}
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary join"
                          tabIndex={on ? 0 : -1}
                          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.slug}`); }}
                        >
                          {p.status === 'completed' ? 'View project' : 'Join Project'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="car-ctl">
            <button type="button" className="ref-icon-btn" onClick={() => go(-1)} aria-label="Previous project"><ChevronLeft size={18} /></button>
            <div className="dots">
              {list.map((_, i) => (
                <button key={i} type="button" className={i === idx ? 'on' : ''} aria-label={`Show project ${i + 1}`} onClick={() => setIdx(i)} />
              ))}
            </div>
            <button type="button" className="ref-icon-btn" onClick={() => go(1)} aria-label="Next project"><ChevronRight size={18} /></button>
          </div>

          {!loading && list.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>No live projects in this category yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default LiveProjectsScene;
