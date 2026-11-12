import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/shared/ui/Button';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { AuthLayout } from '@/components/layout/AuthLayout';

export function ResetPasswordPage() {
  const { session, loading: authLoading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: err } = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setDone(true);
    }
  };

  return (
    <AuthLayout>
      <div>
        <div className="card-g auth-fm">
          <div>
            <h3>Set a new password</h3>
            <p className="text-xs" style={{ color: 'var(--text-2)', marginTop: 4 }}>
              Choose a new password for your account.
            </p>
          </div>

          {authLoading ? (
            <div className="flex items-center justify-center py-6">
              <LoopLoader size={24} />
            </div>
          ) : !session ? (
            <div className="auth-fm" style={{ gap: 14 }}>
              <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>This reset link is invalid or has expired. Request a new one.</span>
              </div>
              <Link to="/forgot-password" className="btn-primary w-full text-sm">
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="auth-fm" style={{ gap: 14 }}>
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>Your password has been updated.</span>
              </div>
              <Button type="button" className="w-full" onClick={() => navigate('/', { replace: true })}>
                Continue
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-fm" style={{ gap: 14 }}>
              <div className="auth-fld">
                <label htmlFor="reset-password">New password</label>
                <div className="inp">
                  <Lock />
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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
              <div className="auth-fld">
                <label htmlFor="reset-confirm-password">Confirm new password</label>
                <div className="inp">
                  <Lock />
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
