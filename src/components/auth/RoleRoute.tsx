import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/roles';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import type { CreatorType } from '@/types';

interface RoleRouteProps {
  allowed: CreatorType[];
  children: React.ReactNode;
}

export function RoleRoute({ allowed, children }: RoleRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoopLoader size={28} />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (!allowed.includes(profile.creator_type)) {
    // Redirect to the user's own dashboard — they cannot access another role's view
    return <Navigate to={getDashboardPath(profile.creator_type)} replace />;
  }

  return <>{children}</>;
}
