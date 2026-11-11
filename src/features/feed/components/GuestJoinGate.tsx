import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/shared/ui/Button';

/** Wraps the last visible guest post with a bottom fade into the page
 * background, then shows the join CTA below the fade (not clipped by it). */
export function GuestFadeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: 'linear-gradient(to top, var(--body-bg), transparent)' }}
      />
    </div>
  );
}

export function GuestJoinGate() {
  const navigate = useNavigate();
  return (
    <div className="-mt-10 flex flex-col items-center gap-4 px-4 py-10 text-center">
      <h3 className="heading text-xl">There's more where that came from</h3>
      <p className="max-w-sm text-sm text-slate-400">
        Create a free account to see every guide, like and save posts, and share what you're building.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => navigate('/join')}>Join the Platform</Button>
        <Button variant="secondary" onClick={() => navigate('/signin')}>
          Sign In
        </Button>
      </div>
    </div>
  );
}
