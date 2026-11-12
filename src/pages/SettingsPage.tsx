import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, UserCircle2, Palette, Mail, KeyRound, LogOut, Pencil, ExternalLink, Copy, Check,
  Sun, Moon, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, DARK_MODE_ENABLED } from '@/design-system/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/shared/ui/Button';
import { cn } from '@/utils/cn';

type SectionKey = 'account' | 'profile' | 'appearance';

const SECTIONS = ([
  { key: 'account', label: 'Account & security', icon: <ShieldCheck size={16} /> },
  { key: 'profile', label: 'Profile', icon: <UserCircle2 size={16} /> },
  { key: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
] as { key: SectionKey; label: string; icon: React.ReactNode }[]).filter((s) => s.key !== 'appearance' || DARK_MODE_ENABLED); // hidden while dark mode is off

const inputClass =
  'w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:outline-none';

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [section, setSection] = useState<SectionKey>('account');

  if (!user || !profile) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Sign in to view your settings</h1>
        <Link to="/signin" className="mt-4 inline-block link-accent">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="container-page pf py-8 max-w-5xl w-forms">
      <div className="mb-6">
        <span className="label-overline">Settings</span>
        <h1 className="mt-2 font-display text-3xl font-bold pf-name">Your settings</h1>
        <p className="mt-2 text-slate-400">Manage your account, your profile and how WebLoop looks.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <nav className="surface-raised p-2 h-fit md:sticky md:top-24" aria-label="Settings sections">
          <ul className="flex md:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSection(s.key)}
                  aria-current={section === s.key ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    section === s.key ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-accent-500/10',
                  )}
                  style={section === s.key ? { background: 'var(--btn)', color: 'var(--btn-text)' } : undefined}
                >
                  {s.icon} {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {section === 'account' && <AccountSection />}
          {section === 'profile' && <ProfileSection />}
          {section === 'appearance' && DARK_MODE_ENABLED && <AppearanceSection />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="surface-raised p-6">
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Notice({ tone, children }: { tone: 'ok' | 'err'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'err' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
        tone === 'ok' ? 'border-signal-green/30 bg-signal-green/10 text-signal-green' : 'border-signal-rose/30 bg-signal-rose/10 text-signal-rose',
      )}
    >
      {tone === 'ok' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function AccountSection() {
  const { user, signIn, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [signingOut, setSigningOut] = useState<'here' | 'all' | null>(null);

  if (!user) return null;
  const providers: string[] = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider ?? 'email'];
  const hasPassword = providers.includes('email');
  const methodLabel = providers.map((p) => (p === 'email' ? 'Email & password' : p.charAt(0).toUpperCase() + p.slice(1))).join(' · ');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (next.length < 8) return setResult({ tone: 'err', text: 'The new password must be at least 8 characters.' });
    if (next !== confirm) return setResult({ tone: 'err', text: "The new passwords don't match." });
    if (next === current) return setResult({ tone: 'err', text: 'The new password must be different from the current one.' });
    setSaving(true);
    // Re-check the current password before changing it, so an unattended signed-in session can't be taken over.
    const check = await signIn(user.email ?? '', current);
    if (check.error) {
      setSaving(false);
      return setResult({ tone: 'err', text: 'Your current password is incorrect.' });
    }
    const { error } = await updatePassword(next);
    setSaving(false);
    if (error) return setResult({ tone: 'err', text: error });
    setCurrent(''); setNext(''); setConfirm('');
    setResult({ tone: 'ok', text: 'Your password was changed.' });
  };

  const doSignOut = async (scope: 'here' | 'all') => {
    setSigningOut(scope);
    if (scope === 'all') await supabase.auth.signOut({ scope: 'global' });
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Card title="Account" description="The email and sign-in method on your account.">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500"><Mail size={13} /> Email</dt>
            <dd className="mt-1 truncate text-sm font-medium text-white">{user.email}</dd>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500"><KeyRound size={13} /> Sign-in method</dt>
            <dd className="mt-1 text-sm font-medium text-white">{methodLabel}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Change password" description="Use at least 8 characters. You'll stay signed in on this device.">
        {hasPassword ? (
          <form onSubmit={changePassword} className="space-y-3 max-w-md">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Current password</span>
              <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">New password</span>
              <input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Confirm new password</span>
              <input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </label>
            {result && <Notice tone={result.tone}>{result.text}</Notice>}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Update password
            </Button>
          </form>
        ) : (
          <p className="text-sm text-slate-400">You sign in with {methodLabel}, so there's no WebLoop password to change.</p>
        )}
      </Card>

      <Card title="Sessions" description="Sign out here, or everywhere you're signed in (other browsers and phones too).">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => doSignOut('here')} disabled={signingOut !== null}>
            {signingOut === 'here' ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Sign out
          </Button>
          <Button variant="secondary" onClick={() => doSignOut('all')} disabled={signingOut !== null}>
            {signingOut === 'all' ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Sign out of all devices
          </Button>
        </div>
      </Card>
    </>
  );
}

function ProfileSection() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  if (!profile) return null;
  const url = `${window.location.origin}/creators/${profile.handle}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <Card title="Profile" description="What other people see about you on WebLoop.">
      <div className="flex flex-wrap gap-3">
        <Link to="/settings/profile" className="btn-primary"><Pencil size={15} /> Edit profile</Link>
        <Link to={`/creators/${profile.handle}`} className="btn-secondary"><ExternalLink size={15} /> View public profile</Link>
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Link copied' : 'Copy profile link'}
        </Button>
      </div>
      <p className="mt-4 truncate text-xs text-slate-500">{url}</p>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light' as const, label: 'Light', icon: <Sun size={18} /> },
    { value: 'dark' as const, label: 'Dark', icon: <Moon size={18} /> },
  ];
  return (
    <Card title="Appearance" description="Choose how WebLoop looks on this device.">
      <div className="grid max-w-md grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
        {options.map((o) => {
          const on = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(o.value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-4 py-4 text-sm font-semibold transition-colors',
                on ? 'border-accent-400 text-accent-300' : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white',
              )}
              style={on ? { boxShadow: '0 0 0 1px var(--accent) inset' } : undefined}
            >
              {o.icon} {o.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
