import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Briefcase, Users, Zap } from 'lucide-react';
import { createCityEngine, buildCityCompanies, type CityCompany } from './engine';
import { supportsWebGL } from '@/components/contributions/webgl';

/** Minimal shape this scene actually reads — satisfied by both a real Supabase
 * Profile (the /companies page) and demonstration data (the home page). */
export interface CityCompanyInput {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export function CompaniesCityScene({ companies, onOpen }: { companies: CityCompanyInput[]; onOpen: (handle: string) => void }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported] = useState(() => supportsWebGL());
  const [hover, setHover] = useState<CityCompany | null>(null);
  const [tip, setTip] = useState({ x: 0, y: 0 });

  const cityCompanies = buildCityCompanies(companies.map((c) => ({ id: c.id, display_name: c.display_name, avatar_url: c.avatar_url, bio: c.bio })));
  const byId = new Map(companies.map((c) => [c.id, c]));

  useEffect(() => {
    const view = viewRef.current, canvas = canvasRef.current;
    if (!view || !canvas || !supported || cityCompanies.length === 0) return;
    const handle = createCityEngine(view, canvas, cityCompanies, {
      onHoverChange: (id) => setHover(id ? cityCompanies.find((c) => c.id === id) ?? null : null),
      onOpen: (id) => { const p = byId.get(id); if (p) onOpen(p.handle); },
      onTipPosition: (x, y) => setTip({ x, y }),
    });
    return () => handle.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, companies.map((c) => c.id).join(',')]);

  if (cityCompanies.length === 0) return null;

  return (
    <div className="co-hero">
      <div className="sec-hd">
        <span className="eyebrow-link"><span className="dot" />Companies</span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white" style={{ maxWidth: '14ch' }}>Discover <span className="hl">companies</span></h2>
        <p className="lead mt-2.5">Startups and studios publishing real projects, recruiting student contributors, and hiring from verified work.</p>
      </div>

      <div className="co-scene" ref={viewRef}>
        {supported ? (
          <>
            <canvas ref={canvasRef} aria-label="Interactive 3D business district. Each glass building is a company." role="img" />
            {hover && (
              <div className="co-tip show" style={{ left: tip.x, top: tip.y }}>
                <b>{hover.name} <CheckCircle2 size={16} style={{ display: 'inline-block', color: 'var(--blue)' }} /></b>
                <small>{hover.industry}</small>
              </div>
            )}
            <div className="card benefits">
              <div><span className="ic"><Briefcase size={18} /></span><span><b>Real opportunities</b><small>Internships, freelance and full-time</small></span></div>
              <div><span className="ic"><Users size={18} /></span><span><b>Verified companies</b><small>Checked before they can post</small></span></div>
              <div><span className="ic"><Zap size={18} /></span><span><b>Build your future</b><small>Connect, contribute, get hired</small></span></div>
            </div>
            <div className="co-legend">
              {cityCompanies.map((c) => (
                <button key={c.id} type="button" className={hover?.id === c.id ? 'on' : ''} aria-label={`Open ${c.name}`} onClick={() => { const p = byId.get(c.id); if (p) onOpen(p.handle); }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: c.tintCss, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#07131f' }}>{c.initial}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="co-fallback" style={{ position: 'static', minHeight: 200 }}>3D scene unavailable. Use the company cards below.</div>
        )}
      </div>
    </div>
  );
}

export default CompaniesCityScene;
