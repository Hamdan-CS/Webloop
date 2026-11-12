import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CompaniesCityScene } from '@/components/scenes/Companies-City/CompaniesCityScene';
import { CompaniesGrid } from '@/components/scenes/Companies-City/CompaniesGrid';
import { COMPANIES } from '@/data/homeDemo';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { FrozenStack } from '@/components/home/FrozenStack';

const EcosystemScene = lazy(() => import('@/components/scenes/Home-Ecosystem/EcosystemScene'));
const LiveDashboardScene = lazy(() => import('@/components/scenes/C-LiveDashboard/LiveDashboardScene'));
const ProjectShowcaseScene = lazy(() => import('@/components/scenes/F-ProjectShowcase/ProjectShowcaseScene'));
const ExplorePreview = lazy(() => import('@/components/scenes/H-ExplorePreview/ExplorePreview'));

function SceneLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoopLoader size={24} />
    </div>
  );
}

/** Section 7 — Discover Companies. Kept exactly as the /companies page's
 * city scene (same component, same building animation); fed demonstration
 * data here instead of a live Supabase fetch. These demo companies have
 * real seeded profiles under the same handle, so "Open" goes straight to
 * their /creators/:handle page like the real companies list does. */
function CompaniesPreview() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const demoCompanies = COMPANIES.map((c) => ({
    id: c.id,
    handle: c.id,
    display_name: c.name,
    avatar_url: null,
    bio: c.desc,
  }));
  const openCompany = (handle: string) => navigate(`/creators/${handle}`);

  return (
    <section id="companies" className="ws-scene home-sec" aria-labelledby="h-co">
      <div className="wrap">
        <CompaniesCityScene companies={demoCompanies} onOpen={openCompany} hoveredId={hoverId} onHoverId={setHoverId} />
        <CompaniesGrid hoveredId={hoverId} onHover={setHoverId} onOpen={openCompany} />
      </div>
    </section>
  );
}

/** Section 8 — closing band, linking to the real sign-up page. */
function ClosingBand() {
  return (
    <section id="cta" className="ws-scene home-sec" aria-labelledby="h-cta">
      <div className="wrap">
        <div className="cta-card">
          <div>
            <h2 id="h-cta" className="hr-h2" style={{ maxWidth: 'none' }}>Ready to build something <span className="hl">real?</span></h2>
            <p>Join as a student, company or university and start turning ideas into verified work.</p>
          </div>
          <div className="cta-btns">
            <Link to="/join" className="hr-btn primary">Join the Platform <ArrowRight size={15} /></Link>
            <Link to="/explore" className="hr-btn">Browse projects</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="home-page home-redesign">
      {/* 1 — Ecosystem hero */}
      <Suspense fallback={<SceneLoading />}>
        <EcosystemScene />
      </Suspense>

      {/* 2 — Project Stack (3D on desktop, timeline at ≤ 900px) */}
      <FrozenStack />

      {/* 3 — Live Dashboard */}
      <Suspense fallback={<SceneLoading />}>
        <LiveDashboardScene />
      </Suspense>

      {/* 4 — Project Showcase */}
      <Suspense fallback={<SceneLoading />}>
        <ProjectShowcaseScene />
      </Suspense>

      {/* 6 — Explore Projects preview */}
      <Suspense fallback={<SceneLoading />}>
        <ExplorePreview />
      </Suspense>

      {/* 7 — Discover Companies (city) */}
      <CompaniesPreview />

      {/* 8 — Closing band */}
      <ClosingBand />
    </div>
  );
}

export default HomePage;
