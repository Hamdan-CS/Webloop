import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Send,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Star,
  RotateCcw,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { fetchAssignedTasks, createSubmission, reportCannotComplete } from '@/lib/api';
import type { Task } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { relativeDate } from '@/lib/labels';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const statusBadge: Record<string, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  open: { tone: 'default', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  submitted: { tone: 'accent', label: 'Submitted' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

interface Props {
  profileId: string;
}

export function MyTasksPanel({ profileId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const t = await fetchAssignedTasks(profileId);
      setTasks(t);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (taskId: string, evidenceUrl: string, notes: string) => {
    setSubmittingFor(taskId);
    try {
      await createSubmission(taskId, profileId, {
        evidence_url: evidenceUrl || undefined,
        notes: notes || undefined,
      });
      await loadData();
    } catch {
      // ignore
    }
    setSubmittingFor(null);
  };

  const handleCannotComplete = async (taskId: string, reason: string) => {
    setSubmittingFor(taskId);
    try {
      await reportCannotComplete(taskId, profileId, reason);
      await loadData();
    } catch {
      // ignore
    }
    setSubmittingFor(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-accent-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="surface p-8 text-center">
        <ClipboardList size={32} className="mx-auto text-slate-600" />
        <p className="mt-3 text-sm text-slate-400">No tasks assigned to you yet. Join a project to get tasks from the team owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <MyTaskRow
          key={task.id}
          task={task}
          onSubmit={handleSubmit}
          onCannotComplete={handleCannotComplete}
          submitting={submittingFor === task.id}
        />
      ))}
    </div>
  );
}

function MyTaskRow({
  task,
  onSubmit,
  onCannotComplete,
  submitting,
}: {
  task: Task;
  onSubmit: (taskId: string, evidenceUrl: string, notes: string) => void;
  onCannotComplete: (taskId: string, reason: string) => void;
  submitting: boolean;
}) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [showCannot, setShowCannot] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const sb = statusBadge[task.status] ?? statusBadge.open;
  const canSubmit = task.status === 'in_progress' || task.status === 'changes_requested' || task.status === 'open';
  const latestSub = task.submissions?.[task.submissions.length - 1];

  return (
    <div className="surface-raised overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white text-sm">{task.title}</p>
              <Badge tone={sb.tone}>{sb.label}</Badge>
            </div>
            {task.description && <p className="mt-1 text-xs text-slate-500">{task.description}</p>}
            {task.project && (
              <Link to={`/projects/${task.project.slug}`} className="mt-1.5 inline-block text-[11px] text-accent-300 hover:text-accent-200">
                {task.project.title}
              </Link>
            )}
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              {task.due_date && <span>Due {task.due_date}</span>}
              <span>{relativeDate(task.created_at)}</span>
            </div>
          </div>
        </div>

        {task.acceptance_criteria && (
          <div className="mt-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Acceptance Criteria</p>
            <p className="text-xs text-slate-400">{task.acceptance_criteria}</p>
          </div>
        )}

        {latestSub && latestSub.status !== 'pending' && latestSub.reviewer_feedback && (
          <div className={cn('mt-3 rounded-lg px-3 py-2 text-xs',
            latestSub.status === 'approved' ? 'bg-signal-green/5 text-signal-green/90 border border-signal-green/20' :
            latestSub.status === 'rejected' ? 'bg-signal-rose/5 text-signal-rose/90 border border-signal-rose/20' :
            'bg-signal-amber/5 text-signal-amber/90 border border-signal-amber/20'
          )}>
            <span className="font-medium">Owner feedback: </span>{latestSub.reviewer_feedback}
            {latestSub.rating && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                <Star size={10} fill="currentColor" /> {latestSub.rating}/5
              </span>
            )}
          </div>
        )}

        {canSubmit && !showSubmit && !showCannot && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowSubmit(true)}>
              <Send size={13} /> Submit Work
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCannot(true)}>
              <XCircle size={13} /> Cannot Complete
            </Button>
          </div>
        )}

        {showSubmit && (
          <div className="mt-3 space-y-2.5">
            <input
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="Evidence URL (PR, demo, document)"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe what you did and how to review it"
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={submitting || (!evidenceUrl.trim() && !notes.trim())} onClick={() => { onSubmit(task.id, evidenceUrl.trim(), notes.trim()); setShowSubmit(false); setEvidenceUrl(''); setNotes(''); }}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Submit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {showCannot && (
          <div className="mt-3 space-y-2.5">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why you cannot complete this task..."
              className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40 resize-y"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="danger" disabled={submitting || !reason.trim()} onClick={() => { onCannotComplete(task.id, reason.trim()); setShowCannot(false); setReason(''); }}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Report Cannot Complete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCannot(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {task.status === 'submitted' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-accent-300">
            <Loader2 size={12} className="animate-spin" /> Awaiting owner review
          </p>
        )}
        {task.status === 'approved' && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-signal-green">
            <CheckCircle2 size={14} /> Task approved — great work!
          </p>
        )}
      </div>
    </div>
  );
}
