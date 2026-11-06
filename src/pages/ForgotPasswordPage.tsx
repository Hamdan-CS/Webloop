import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/shared/ui/Button';

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await resetPasswordForEmail(email);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-md">
        <div className="card-g auth-fm">
          <div>
            <h3>Reset your password</h3>
            <p className="text-xs" style={{ color: 'var(--text-2)', marginTop: 4 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div className="auth-fm" style={{ gap: 14 }}>
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>If an account exists for {email}, a password reset link is on its way. Check your inbox.</span>
              </div>
              <Link to="/signin" className="btn-secondary w-full text-sm">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-fm" style={{ gap: 14 }}>
              <div className="auth-fld">
                <label htmlFor="forgot-email">Email</label>
                <div className="inp">
                  <Mail />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send reset link'}
              </Button>

              <p className="fine">
                <Link to="/signin" className="link-accent">Back to sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
