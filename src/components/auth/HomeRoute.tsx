import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';

interface HomeRouteProps {
  children: React.ReactNode;
}

/** "/" is the marketing home page for guests, but a signed-in user has no use
 * for it — send them straight to their feed instead. */
export function HomeRoute({ children }: HomeRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoopLoader size={28} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}
