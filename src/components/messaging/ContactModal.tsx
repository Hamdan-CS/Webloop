import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send, X } from 'lucide-react';
import { sendMessage } from '@/services/api';
import type { Profile } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Button } from '@/components/shared/ui/Button';

export function ContactModal({
  from,
  to,
  projectId,
  onClose,
  onSent,
}: {
  from: Profile;
  to: Profile;
  projectId?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) {
      setError('Please write a message.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendMessage(from.id, to.id, body.trim(), projectId);
      setSent(true);
      setTimeout(onSent, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar src={to.avatar_url} name={to.display_name} size="md" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Message {to.display_name}</h2>
              <p className="text-xs text-slate-500">@{to.handle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-signal-green/15 text-signal-green">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">Message sent!</h3>
            <p className="mt-2 text-sm text-slate-400">{to.display_name} will see your message in their inbox.</p>
          </div>
        ) : (
          <>
            <label className="block mb-4">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Your message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={`Hi ${to.display_name}, I'd like to connect about...`}
                className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 focus:bg-ink-900 transition-colors resize-y"
              />
            </label>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2.5 text-sm text-signal-rose mb-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSend} disabled={sending} className="flex-1">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button variant="ghost" onClick={onClose} className="px-5">Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
