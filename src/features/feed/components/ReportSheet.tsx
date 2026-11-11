import { useState, type ReactNode } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { reportPost } from '../services/feedApi';

interface ReportMenuItemProps {
  postId: string;
  viewerProfileId: string | null;
  isGuest: boolean;
  icon: ReactNode;
  onRequireAuth: () => void;
  onDone: () => void;
}

const REASONS = ['Spam', 'Harassment or abuse', 'Misinformation', 'Inappropriate content', 'Other'];

export function ReportMenuItem({ postId, viewerProfileId, isGuest, icon, onRequireAuth, onDone }: ReportMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function start() {
    if (isGuest) {
      onRequireAuth();
      onDone();
      return;
    }
    setOpen(true);
  }

  async function submit() {
    if (!viewerProfileId || !reason) return;
    await reportPost(postId, viewerProfileId, reason);
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      onDone();
    }, 1000);
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5"
      >
        {icon}
        Report post
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="surface-raised w-full max-w-sm p-6 shadow-card animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <p className="text-sm text-slate-200">Thanks — we'll review this.</p>
            ) : (
              <>
                <h3 className="heading text-base">Why are you reporting this post?</h3>
                <div className="mt-3 flex flex-col gap-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        reason === r ? 'border-accent-400/50 bg-accent-500/10 text-white' : 'border-white/10 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button disabled={!reason} onClick={submit} className="flex-1">
                    Submit
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
