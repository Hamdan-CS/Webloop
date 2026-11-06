import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roles';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';

interface GuestOnlyRouteProps {
  children: React.ReactNode;
}

export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoopLoader size={28} />
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={getDashboardPath(profile.creator_type)} replace />;
  }

  return <>{children}</>;
}
