import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { COMPANIES, companyProjectCount } from '@/data/homeDemo';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';

const CompaniesCityScene = lazy(() => import('@/components/scenes/Companies-City/CompaniesCityScene').then((m) => ({ default: m.CompaniesCityScene })));
const LOGOS = ['GreenLeaf', 'Fennel', 'NovaAI', 'CloudSync', 'Arcade', 'PixelForge', 'Rivermouth', 'Stellar Uni'];
const initials = (n: string) => n.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

/**
 * 8 · Companies: the demo's logo marquee, header and Baselayer-style cards,
 * with the existing 3D city kept above the cards. Same company data the
 * homepage already used (homeDemo); hovering a card highlights its building.
 */
export function HomeCompanies() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const city = COMPANIES.map((c) => ({ id: c.id, handle: c.id, display_name: c.name, avatar_url: null, bio: c.desc }));
  const open = (handle: string) => navigate(`/creators/${handle}`);
  // performance: only boot the 3D city once it is within ~a screen of the viewport
  const cityRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = cityRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const cityFallback = <div style={{ height: '40vh', display: 'grid', placeItems: 'center' }}><LoopLoader size={24} /></div>;

  return (
    <section className="gh-co" id="companies">
      <div className="gh-marq"><div className="gh-marq-t">{[...LOGOS, ...LOGOS].map((l, i) => <span key={i} aria-hidden={i >= LOGOS.length}><i />{l}</span>)}</div></div>
      <div className="gh-wrap">
        <div className="gh-sec-hd"><span className="gh-mono">For companies</span><h2 className="gh-h-display" style={{ marginTop: 14 }}>Post a brief. <span className="gh-acc">Meet the people</span> who ship it.</h2><p className="gh-lead">Verified companies publish real work. Students apply as teams, and you review what they deliver.</p></div>
        <div className="gh-city" ref={cityRef}>
          {near ? (
            <Suspense fallback={cityFallback}>
              <CompaniesCityScene companies={city} onOpen={open} hoveredId={hoverId} onHoverId={setHoverId} />
            </Suspense>
          ) : cityFallback}
        </div>
        <div className="gh-co-grid">
          {COMPANIES.map((c) => (
            <Link key={c.id} to={`/creators/${c.id}`} className="gh-cocard gh-reveal" onPointerEnter={() => setHoverId(c.id)} onPointerLeave={() => setHoverId(null)} style={hoverId === c.id ? { transform: 'translateY(-5px)' } : undefined}>
              <div className="gh-cohd">
                <span className="gh-cologo" style={{ background: `hsl(${c.hue} 62% 38%)` }}>{initials(c.name)}</span>
                <div>
                  <b>{c.name} <span className="gh-vf" title="Verified company"><svg width="9" height="9" aria-hidden="true"><use href="#check" /></svg></span></b>
                  <small>{c.industry} · {c.location}</small>
                </div>
              </div>
              <p>{c.desc}</p>
              <div className="gh-cometa">{[c.remote ? 'Remote' : c.location.split(',')[0], c.size, c.tag].filter(Boolean).map((t) => <span key={t}>{t}</span>)}</div>
              <div className="gh-cofoot"><span><b>{companyProjectCount(c.id)}</b> open briefs</span><span>View briefs →</span></div>
            </Link>
          ))}
        </div>
        <p className="gh-sample">Sample companies · verification badges are demo UI</p>
      </div>
    </section>
  );
}
