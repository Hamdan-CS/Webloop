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
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { getDashboardPath } from '@/lib/roles';

type Role = 'student' | 'company' | 'university';

const roleCards: { role: Role; icon: React.ReactNode; title: string; desc: string; benefits: string[] }[] = [
  {
    role: 'student',
    icon: <Users size={20} />,
    title: 'Join as a Student',
    desc: 'Build real projects, find teammates, and create a portfolio backed by verified contributions.',
    benefits: ['Publish your own project ideas', 'Apply to company and student projects', 'Collect verified contributions', 'Get discovered by companies hiring'],
  },
  {
    role: 'company',
    icon: <Building2 size={20} />,
    title: 'Join as a Company',
    desc: 'Publish scoped projects, recruit student contributors, and hire from demonstrated work.',
    benefits: ['Publish paid or educational projects', 'Review applications and portfolios', 'Assign tasks and verify contributions', 'Hire from proven contributors'],
  },
  {
    role: 'university',
    icon: <GraduationCap size={20} />,
    title: 'Join as a University',
    desc: 'Run capstone programs, form student teams, and connect coursework with real industry projects.',
    benefits: ['Run mentored capstone programs', 'Form and track student teams', 'Connect with sponsoring companies', 'Showcase educational outcomes'],
  },
];

export function JoinPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Role>('student');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err, profile } = await signUp(email, password, displayName, selected);
    setLoading(false);
    if (err) {
      setError(err);
    } else if (profile) {
      navigate(getDashboardPath(profile.creator_type), { replace: true });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <span className="label-overline">Join the Platform</span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white">Choose how you want to participate.</h1>
        <p className="mt-3 text-slate-400">
          Accounts are free. Guests can browse everything without signing in — you only need an account to contribute, apply, or publish.
        </p>
      </div>

      {/* Role selection */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {roleCards.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelected(r.role)}
            className={cn(
              'text-left rounded-lg border p-5 transition-all',
              selected === r.role
                ? 'border-accent-400/50 bg-accent-500/5 shadow-glow'
                : 'border-white/8 bg-ink-900/60 hover:border-white/15',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">{r.icon}</div>
              {selected === r.role && <CheckCircle2 size={18} className="text-accent-400" />}
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-white">{r.title}</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Benefits + form */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="surface p-6">
          <h3 className="label-overline mb-4">What you get</h3>
          <ul className="space-y-3">
            {roleCards.find((r) => r.role === selected)!.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2 size={15} className="text-accent-400 mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="green">Free</Badge>
            <Badge>Verified contributions</Badge>
            <Badge tone="accent">Real projects</Badge>
          </div>
        </div>

        <div className="surface-raised p-6">
          <h3 className="font-display text-lg font-bold text-white">Create your account</h3>
          <p className="mt-1 text-xs text-slate-500">It's free. Your profile is created automatically when you sign up.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" required />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required />

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create account'}
            </Button>
          </form>

          <p className="mt-3 text-center text-xs text-slate-500">
            Already have an account? <Link to="/signin" className="link-accent">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link to="/explore" className="link-accent text-sm">
          Continue as a guest — browse projects <ArrowRight size={13} className="inline" />
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors"
      />
    </label>
  );
}
