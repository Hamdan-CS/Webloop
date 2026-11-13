import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Send, Star, XCircle } from 'lucide-react';
import type { TaskSubmission } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { ReviewStatus } from './taskStatus';

/** Review one submission (moved unchanged from TaskManagementPanel). */
export function SubmissionReview({
  submission,
  taskId,
  onReview,
  busy,
}: {
  submission: TaskSubmission;
  taskId: string;
  onReview: (submission: TaskSubmission, taskId: string, status: ReviewStatus, feedback: string, rating: number) => void;
  busy: boolean;
}) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(4);
  const subStatus: Record<string, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
    pending: { tone: 'accent', label: 'Pending Review' },
    approved: { tone: 'green', label: 'Approved' },
    changes_requested: { tone: 'amber', label: 'Changes Requested' },
    not_completed: { tone: 'amber', label: 'Not Completed' },
    rejected: { tone: 'rose', label: 'Rejected' },
  };
  const ss = subStatus[submission.status] ?? subStatus.pending;
  const isPending = submission.status === 'pending';

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar src={submission.submitter?.avatar_url} name={submission.submitter?.display_name ?? ''} size="xs" />
          <span className="text-xs font-medium text-white">{submission.submitter?.display_name}</span>
        </div>
        <Badge tone={ss.tone}>{ss.label}</Badge>
      </div>

      {submission.notes && <p className="text-sm text-slate-300">{submission.notes}</p>}
      {submission.evidence_url && (
        <a href={submission.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-300 hover:text-accent-200">
          <Send size={11} /> View evidence
        </a>
      )}

      {submission.reviewer_feedback && (
        <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
          <span className="text-slate-500">Feedback: </span>{submission.reviewer_feedback}
          {submission.rating && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-signal-amber">
              <Star size={10} fill="currentColor" /> {submission.rating}
            </span>
          )}
        </div>
      )}

      {isPending && (
        <div className="space-y-2 pt-1">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (optional for approve, recommended for changes/reject)"
            className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={cn('transition-colors', n <= rating ? 'text-signal-amber' : 'text-slate-600 hover:text-slate-400')}
              >
                <Star size={14} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => onReview(submission, taskId, 'approved', feedback, rating)}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Approve
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReview(submission, taskId, 'changes_requested', feedback, 0)}>
              <RotateCcw size={13} /> Request Changes
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReview(submission, taskId, 'not_completed', feedback, 0)}>
              <AlertCircle size={13} /> Not Completed
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => onReview(submission, taskId, 'rejected', feedback, 0)}>
              <XCircle size={13} /> Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
