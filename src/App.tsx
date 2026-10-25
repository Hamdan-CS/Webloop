import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthPromptProvider } from '@/components/auth/AuthPrompt';
import { AuthProvider } from '@/components/auth/AuthContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
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
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { StudentDashboard } from '@/pages/dashboards/StudentDashboard';
import { CompanyDashboard } from '@/pages/dashboards/CompanyDashboard';
import { UniversityDashboard } from '@/pages/dashboards/UniversityDashboard';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthPromptProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/projects/:slug" element={<ProjectDetailPage />} />
                <Route path="/creators/:handle" element={<CreatorProfilePage />} />
                <Route path="/publish" element={<PublishProjectPage />} />
                <Route path="/my-applications" element={<MyApplicationsPage />} />
                <Route path="/settings" element={<EditProfilePage />} />
                <Route path="/dashboard/student" element={<RoleRoute allowed={['student', 'team']}><StudentDashboard /></RoleRoute>} />
                <Route path="/dashboard/company" element={<RoleRoute allowed={['company']}><CompanyDashboard /></RoleRoute>} />
                <Route path="/dashboard/university" element={<RoleRoute allowed={['university']}><UniversityDashboard /></RoleRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          </AuthPromptProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
