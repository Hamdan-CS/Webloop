import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPANIES } from '@/data/homeDemo';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { Marquee } from '@/components/shared/ui/Marquee';
import { CompaniesGrid } from '@/components/scenes/Companies-City/CompaniesGrid';
import { LOGOS } from './homeContent';

const CompaniesCityScene = lazy(() => import('@/components/scenes/Companies-City/CompaniesCityScene').then((m) => ({ default: m.CompaniesCityScene })));

/**
 * 8 · Companies: logo marquee, Genie section header, then the existing 3D
 * Companies city (kept, per the blueprint) above the company cards. Same
 * demo data and hover/open wiring as before.
 */
export function HomeCompanies() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const demoCompanies = COMPANIES.map((c) => ({ id: c.id, handle: c.id, display_name: c.name, avatar_url: null, bio: c.desc }));
  const openCompany = (handle: string) => navigate(`/creators/${handle}`);

  return (
    <section className="gh-co" id="companies" aria-labelledby="gh-co-h">
      <Marquee speed={34}>
        {LOGOS.map((l) => <span key={l} className="gh-marq-logo"><i />{l}</span>)}
      </Marquee>
      <div className="gh-wrap">
        <div className="gh-sechd">
          <span className="gh-mono">For companies</span>
          <h2 id="gh-co-h" className="gh-display" style={{ marginTop: 14 }}>Post a brief. <span className="acc">Meet the people</span> who ship it.</h2>
          <p className="gh-lead">Verified companies publish real work. Students apply as teams, and you review what they deliver.</p>
        </div>
        <div className="gh-city">
          <Suspense fallback={<div className="flex h-[40vh] items-center justify-center"><LoopLoader size={24} /></div>}>
            <CompaniesCityScene companies={demoCompanies} onOpen={openCompany} hoveredId={hoverId} onHoverId={setHoverId} />
          </Suspense>
        </div>
        <CompaniesGrid hoveredId={hoverId} onHover={setHoverId} onOpen={openCompany} />
      </div>
    </section>
  );
}
