import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AuthPromptOptions {
  title: string;
  reason: string;
  cta?: string;
}

interface AuthPromptContextValue {
  prompt: (options: AuthPromptOptions) => void;
}

const AuthPromptContext = createContext<AuthPromptContextValue | null>(null);

export function useAuthPrompt() {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  return ctx;
}

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AuthPromptOptions | null>(null);
  const navigate = useNavigate();

  const prompt = useCallback((opts: AuthPromptOptions) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const goToSignup = useCallback(() => {
    close();
    navigate('/join');
  }, [close, navigate]);

  return (
    <AuthPromptContext.Provider value={{ prompt }}>
      {children}
      {open && options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="surface-raised shadow-card w-full max-w-md p-7 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300">
                  <Lock size={20} />
                </div>
                <h3 className="heading text-lg">{options.title}</h3>
              </div>
              <button
                onClick={close}
                className="text-slate-400 hover:text-white transition-colors rounded-lg p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">{options.reason}</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button onClick={goToSignup}>{options.cta ?? 'Create a free account'}</Button>
              <Button variant="ghost" onClick={close}>
                Maybe later
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              Guests can browse everything — an account is only needed to contribute.
            </p>
          </div>
        </div>
      )}
    </AuthPromptContext.Provider>
  );
}
