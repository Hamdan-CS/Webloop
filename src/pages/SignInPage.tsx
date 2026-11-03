import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { getDashboardPath } from '@/lib/roles';

export function SignInPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err, profile } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else if (profile) {
      navigate(getDashboardPath(profile.creator_type), { replace: true });
    } else {
      navigate('/');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <div className="card-g auth-fm">
          <div>
            <h3>Sign in to WebLoop</h3>
            <p className="text-xs" style={{ color: 'var(--text-2)', marginTop: 4 }}>
              Sign in to contribute and manage your projects.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-fm" style={{ gap: 14 }}>
            <div className="auth-fld">
              <label htmlFor="signin-email">Email</label>
              <div className="inp">
                <Mail />
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div className="auth-fld">
              <label htmlFor="signin-password">Password</label>
              <div className="inp">
                <Lock />
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="eye"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
            </Button>

            <div className="or">or</div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <p className="fine">
              No account? <Link to="/join" className="link-accent">Join the platform</Link>
            </p>

            <Link to="/explore" className="btn-secondary w-full text-sm">
              Continue as guest <ArrowRight size={14} />
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
