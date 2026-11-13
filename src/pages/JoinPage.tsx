import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Laptop,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/shared/ui/Button';
import { GoogleIcon } from '@/components/shared/ui/GoogleIcon';
import { cn } from '@/utils/cn';
import { getDashboardPath } from '@/utils/roles';
import { AuthLayout } from '@/components/layout/AuthLayout';

type Role = 'student' | 'company' | 'university';

const roleCards: { role: Role; tint: string; icon: React.ReactNode; title: string; desc: string; benefits: string[] }[] = [
  {
    role: 'student',
    tint: 'r-s',
    icon: <Users />,
    title: 'Student',
    desc: 'Build real projects, find teammates, and create a portfolio backed by verified contributions.',
    benefits: ['Publish your own project ideas', 'Apply to company and student projects', 'Collect verified contributions', 'Get discovered by companies hiring'],
  },
  {
    role: 'company',
    tint: 'r-c',
    icon: <Building2 />,
    title: 'Company',
    desc: 'Publish scoped projects, recruit student contributors, and hire from demonstrated work.',
    benefits: ['Publish paid or educational projects', 'Review applications and portfolios', 'Assign tasks and verify contributions', 'Hire from proven contributors'],
  },
  {
    role: 'university',
    tint: 'r-u',
    icon: <GraduationCap />,
    title: 'University',
    desc: 'Run capstone programs, form student teams, and connect coursework with real industry projects.',
    benefits: ['Run mentored capstone programs', 'Form and track student teams', 'Connect with sponsoring companies', 'Showcase educational outcomes'],
  },
];

export function JoinPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const active = roleCards.find((r) => r.role === selected)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err, profile } = await signUp(email, password, displayName, selected);
    setLoading(false);
    if (err) {
      setError(err);
    } else if (profile) {
      if (profile.creator_type === 'student') {
        sessionStorage.setItem(`wl_build_profile_seen_${profile.user_id}`, '1');
        navigate('/build-profile', { replace: true });
      } else {
        navigate(getDashboardPath(profile.creator_type), { replace: true });
      }
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
    <AuthLayout wide>
      <div className="join-hd max-w-3xl">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Choose how you want to participate.</h1>
        <p className="lead mt-3">
          Accounts are free. Guests can browse everything without signing in — you only need an account to contribute, apply, or publish.
        </p>
      </div>

      <div className="auth2 mt-8">
        {/* Role selection */}
        <div className="roles" role="radiogroup" aria-label="Choose your role">
          {roleCards.map((r) => (
            <button
              key={r.role}
              type="button"
              role="radio"
              aria-checked={selected === r.role}
              onClick={() => setSelected(r.role)}
              className={cn('role-card', r.tint, selected === r.role && 'on')}
            >
              <span className="ri">{r.icon}</span>
              <b>{r.title}</b>
              <span className="role-desc">{r.desc}</span>
              <span className="rad" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* Benefits + mockup / form */}
        <div className="auth-cols">
          <div className="card-g auth-get">
            <h3>What you get</h3>
            <ul className="auth-chk">
              {active.benefits.map((b, i) => (
                <li key={i}>
                  <CheckCircle2 /> {b}
                </li>
              ))}
            </ul>
            <div className="auth-chips">
              <span className="auth-chip ach-1">Free</span>
              <span className="auth-chip ach-2">Verified contributions</span>
              <span className="auth-chip ach-3">Real projects</span>
            </div>

            <div className="mock" aria-hidden="true">
              <div className="mk-in">
                <div className="mk-glow" />
                <div className="lap">
                  <div className="lid">
                    <div className="scr">
                      <div className="sb">
                        <span className="wdm">WebL∞p</span>
                        <i className="on" /><i /><i /><i />
                      </div>
                      <div className="mn">
                        <div className="tp"><span /><span style={{ width: 18 }} /></div>
                        <div className="th">
                          <div className="pc"><i /><b>Project</b></div>
                          <div className="pc"><i /><b>Project</b></div>
                          <div className="pc"><i /><b>Project</b></div>
                        </div>
                        <div className="rw"><span /><span /><span /></div>
                      </div>
                    </div>
                  </div>
                  <div className="base"><i /></div>
                  <div className="shd" />
                </div>
                <div className="ft t1"><CheckCircle2 /></div>
                <div className="ft t2"><Users /></div>
                <div className="ft t4"><Building2 /></div>
                <div className="ft t5"><Laptop /></div>
              </div>
            </div>
          </div>

          <div className="card-g auth-fm">
            <h3>Create your account</h3>
            <p className="text-xs" style={{ color: 'var(--text-2)', marginTop: '-8px' }}>
              It's free. Your profile is created automatically when you sign up.
            </p>

            <form onSubmit={handleSubmit} className="auth-fm" style={{ gap: 14 }}>
              <div className="auth-fld">
                <label htmlFor="join-name">{selected === 'student' ? 'Display name' : `${active.title} name`}</label>
                <div className="inp">
                  <User />
                  <input
                    id="join-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={selected === 'student' ? 'Your name' : `Your ${selected} name`}
                    required
                  />
                </div>
              </div>
              <div className="auth-fld">
                <label htmlFor="join-email">Email</label>
                <div className="inp">
                  <Mail />
                  <input
                    id="join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="auth-fld">
                <label htmlFor="join-password">Password</label>
                <div className="inp">
                  <Lock />
                  <input
                    id="join-password"
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

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
              </Button>

              {/* Google sign-up can only create student accounts, so it's offered only for that role. */}
              {selected === 'student' ? (
                <>
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
                </>
              ) : (
                <p className="fine">
                  {active.title} accounts are created with email and password.
                </p>
              )}

              <p className="fine">
                Already have an account? <Link to="/signin" className="link-accent">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link to="/explore" className="link-accent text-sm">
          Continue as a guest — browse projects <ArrowRight size={13} className="inline" />
        </Link>
      </div>
    </AuthLayout>
  );
}
