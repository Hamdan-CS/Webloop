import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { consumeAuthErrorFromUrl } from '@/utils/authRedirect';

export function AuthErrorBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const msg = consumeAuthErrorFromUrl();
    if (msg) setMessage(msg);
  }, []);

  if (!message) return null;

  return (
    <div className="container-page" style={{ paddingTop: 16 }}>
      <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Dismiss"
          className="shrink-0"
          style={{ color: 'inherit' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
