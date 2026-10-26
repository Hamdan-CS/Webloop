import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { getDashboardPath } from '@/lib/roles';

interface GuestOnlyRouteProps {
  children: React.ReactNode;
}

export function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent-400" />
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to={getDashboardPath(profile.creator_type)} replace />;
  }

  return <>{children}</>;
}
