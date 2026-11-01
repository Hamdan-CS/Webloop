import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { CompaniesCityScene } from '@/components/scenes/Companies-City/CompaniesCityScene';
import { CompaniesGrid } from '@/components/scenes/Companies-City/CompaniesGrid';
import { COMPANIES } from '@/data/homeDemo';

const EcosystemScene = lazy(() => import('@/components/scenes/Home-Ecosystem/EcosystemScene'));
const ProjectStackScene = lazy(() => import('@/components/scenes/A-ProjectStack/ProjectStackScene'));
const LiveDashboardScene = lazy(() => import('@/components/scenes/C-LiveDashboard/LiveDashboardScene'));
const ProjectShowcaseScene = lazy(() => import('@/components/scenes/F-ProjectShowcase/ProjectShowcaseScene'));
const StudentWorkPreview = lazy(() => import('@/components/scenes/G-StudentWorkPreview/StudentWorkPreview'));
const ExplorePreview = lazy(() => import('@/components/scenes/H-ExplorePreview/ExplorePreview'));

function SceneLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 size={24} className="animate-spin" style={{ color: 'var(--hr-accent)' }} />
    </div>
  );
}

/** Section 7 — Discover Companies. Kept exactly as the /companies page's
 * city scene (same component, same building animation); fed demonstration
 * data here instead of a live Supabase fetch, and "Open" just goes to the
 * real companies page since these fictional companies have no profile. */
function CompaniesPreview() {
  const demoCompanies = COMPANIES.map((c) => ({
    id: c.id,
    handle: c.id,
    display_name: c.name,
    avatar_url: null,
    bio: c.desc,
  }));

  return (
    <section id="companies" className="ws-scene home-sec" aria-labelledby="h-co">
      <div className="wrap">
        <CompaniesCityScene companies={demoCompanies} onOpen={() => { window.location.assign('/companies'); }} />
        <CompaniesGrid />
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

      {/* 2 — Project Stack */}
      <Suspense fallback={<SceneLoading />}>
        <ProjectStackScene />
      </Suspense>

      {/* 3 — Live Dashboard */}
      <Suspense fallback={<SceneLoading />}>
        <LiveDashboardScene />
      </Suspense>

      {/* 4 — Project Showcase */}
      <Suspense fallback={<SceneLoading />}>
        <ProjectShowcaseScene />
      </Suspense>

      {/* 5 — Student Work preview */}
      <Suspense fallback={<SceneLoading />}>
        <StudentWorkPreview />
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
