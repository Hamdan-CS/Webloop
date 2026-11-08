import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AuthPromptProvider } from '@/components/auth/AuthPrompt';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DesignProvider } from '@/design-system/DesignProvider';
import { FloatingPanelProvider, PanelBadgeSync, FloatingPanel } from '@/components/FloatingPanel';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/layout/Footer';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { GuestOnlyRoute } from '@/components/auth/GuestOnlyRoute';
import { GlobalTip } from '@/components/shared/ui/GlobalTip';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';

// Route-level code splitting: each page ships as its own chunk instead of
// one ~1.3MB bundle, so a visitor only downloads the page they land on.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorePage = lazy(() => import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const GalleryPage = lazy(() => import('@/pages/GalleryPage').then((m) => ({ default: m.GalleryPage })));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const HowItWorksPage = lazy(() => import('@/pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const JoinPage = lazy(() => import('@/pages/JoinPage').then((m) => ({ default: m.JoinPage })));
const SignInPage = lazy(() => import('@/pages/SignInPage').then((m) => ({ default: m.SignInPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const CreatorProfilePage = lazy(() => import('@/pages/CreatorProfilePage').then((m) => ({ default: m.CreatorProfilePage })));
const PublishProjectPage = lazy(() => import('@/pages/PublishProjectPage').then((m) => ({ default: m.PublishProjectPage })));
const MyApplicationsPage = lazy(() => import('@/pages/MyApplicationsPage').then((m) => ({ default: m.MyApplicationsPage })));
const MyInvitationsPage = lazy(() => import('@/pages/MyInvitationsPage').then((m) => ({ default: m.MyInvitationsPage })));
const MyProjectsPage = lazy(() => import('@/pages/MyProjectsPage').then((m) => ({ default: m.MyProjectsPage })));
const EditProfilePage = lazy(() => import('@/pages/EditProfilePage').then((m) => ({ default: m.EditProfilePage })));
const BuildProfilePage = lazy(() => import('@/pages/BuildProfilePage').then((m) => ({ default: m.BuildProfilePage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const StudentDashboard = lazy(() => import('@/pages/dashboards/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const CompanyDashboard = lazy(() => import('@/pages/dashboards/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));
const UniversityDashboard = lazy(() => import('@/pages/dashboards/UniversityDashboard').then((m) => ({ default: m.UniversityDashboard })));

/**
 * Students get the same rich wizard used at signup (university/major/skills
 * fields the plain settings form doesn't have), reused in "edit" mode.
 * Company/university accounts have no use for those student-only fields, so
 * they keep the plain settings form.
 */
function SettingsRoute() {
  const { profile, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (profile?.creator_type === 'student') return <BuildProfilePage mode="edit" />;
  return <EditProfilePage />;
}

function RouteLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <LoopLoader size={24} />
    </div>
  );
}

/**
 * Google OAuth signs a brand-new user in the same way it signs a returning
 * one back in — there's no separate "signup" step to hook a redirect into.
 * A page reload that restores a persisted session fires 'INITIAL_SESSION',
 * not 'SIGNED_IN', so gating on a genuine 'SIGNED_IN' event first rules out
 * "just reopened the app" and leaves only an interactive sign-in just now.
 * Within that, comparing the auth user's created_at and last_sign_in_at
 * (near-identical only on that very first session ever) isolates a true
 * first-time signup from a returning user signing back in via Google.
 */
function NewStudentOnboardingRedirect() {
  const { user, profile, loading, authEvent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (authEvent !== 'SIGNED_IN') return;
    if (profile.creator_type !== 'student') return;
    if (location.pathname === '/build-profile') return;

    const seenKey = `wl_build_profile_seen_${user.id}`;
    if (sessionStorage.getItem(seenKey)) return;

    const createdAt = new Date(user.created_at).getTime();
    const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt;
    const isFreshSignup = Math.abs(lastSignInAt - createdAt) < 10_000;

    sessionStorage.setItem(seenKey, '1');
    if (isFreshSignup) navigate('/build-profile', { replace: true });
  }, [loading, user, profile, authEvent, location.pathname, navigate]);

  return null;
}

/** React Router doesn't reset scroll position on navigation (it's an SPA —
 * the browser never reloads), so without this, clicking a card from deep
 * down a long page (e.g. the scroll-heavy home page) lands on the new page
 * still scrolled to that same pixel offset, looking like it "opened at the
 * bottom". Skip it on same-page hash jumps so in-page anchors still work. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <DesignProvider>
        <AuthProvider>
          <AuthPromptProvider>
          <FloatingPanelProvider>
          <ScrollToTop />
          <NewStudentOnboardingRedirect />
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            {/* the header is now position:fixed (so it can hide on scroll), so push content below it */}
            <main className="flex-1 pt-16">
              <AuthErrorBanner />
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/how-it-works" element={<GuestOnlyRoute><HowItWorksPage /></GuestOnlyRoute>} />
                  <Route path="/join" element={<JoinPage />} />
                  <Route path="/signin" element={<SignInPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/projects/:slug" element={<ProjectDetailPage />} />
                  <Route path="/creators/:handle" element={<CreatorProfilePage />} />
                  <Route path="/publish" element={<PublishProjectPage />} />
                  <Route path="/my-applications" element={<MyApplicationsPage />} />
                  <Route path="/my-invitations" element={<MyInvitationsPage />} />
                  <Route path="/my-projects" element={<MyProjectsPage />} />
                  <Route path="/settings" element={<SettingsRoute />} />
                  <Route path="/build-profile" element={<BuildProfilePage />} />
                  <Route path="/dashboard/student" element={<RoleRoute allowed={['student', 'team']}><StudentDashboard /></RoleRoute>} />
                  <Route path="/dashboard/company" element={<RoleRoute allowed={['company']}><CompanyDashboard /></RoleRoute>} />
                  <Route path="/dashboard/university" element={<RoleRoute allowed={['university']}><UniversityDashboard /></RoleRoute>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <PanelBadgeSync />
            <FloatingPanel />
            <GlobalTip />
          </div>
          </FloatingPanelProvider>
          </AuthPromptProvider>
        </AuthProvider>
      </DesignProvider>
    </BrowserRouter>
  );
}

export default App;
