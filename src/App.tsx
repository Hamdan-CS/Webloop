import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthPromptProvider } from '@/components/auth/AuthPrompt';
import { AuthProvider, useAuth } from '@/components/auth/AuthContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { FloatingPanelProvider, FloatingButtons, FloatingPanel } from '@/components/FloatingPanel';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { GalleryPage } from '@/pages/GalleryPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { JoinPage } from '@/pages/JoinPage';
import { SignInPage } from '@/pages/SignInPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { CreatorProfilePage } from '@/pages/CreatorProfilePage';
import { PublishProjectPage } from '@/pages/PublishProjectPage';
import { MyApplicationsPage } from '@/pages/MyApplicationsPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { BuildProfilePage } from '@/pages/BuildProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { GuestOnlyRoute } from '@/components/auth/GuestOnlyRoute';
import { StudentDashboard } from '@/pages/dashboards/StudentDashboard';
import { CompanyDashboard } from '@/pages/dashboards/CompanyDashboard';
import { UniversityDashboard } from '@/pages/dashboards/UniversityDashboard';

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

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthPromptProvider>
          <FloatingPanelProvider>
          <NewStudentOnboardingRedirect />
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/how-it-works" element={<GuestOnlyRoute><HowItWorksPage /></GuestOnlyRoute>} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/projects/:slug" element={<ProjectDetailPage />} />
                <Route path="/creators/:handle" element={<CreatorProfilePage />} />
                <Route path="/publish" element={<PublishProjectPage />} />
                <Route path="/my-applications" element={<MyApplicationsPage />} />
                <Route path="/settings" element={<EditProfilePage />} />
                <Route path="/build-profile" element={<BuildProfilePage />} />
                <Route path="/dashboard/student" element={<RoleRoute allowed={['student', 'team']}><StudentDashboard /></RoleRoute>} />
                <Route path="/dashboard/company" element={<RoleRoute allowed={['company']}><CompanyDashboard /></RoleRoute>} />
                <Route path="/dashboard/university" element={<RoleRoute allowed={['university']}><UniversityDashboard /></RoleRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
            <FloatingButtons />
            <FloatingPanel />
          </div>
          </FloatingPanelProvider>
          </AuthPromptProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
