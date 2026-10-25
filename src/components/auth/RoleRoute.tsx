import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { getDashboardPath } from '@/lib/roles';
import type { CreatorType } from '@/lib/types';

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
        <Loader2 size={28} className="animate-spin text-accent-400" />
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
