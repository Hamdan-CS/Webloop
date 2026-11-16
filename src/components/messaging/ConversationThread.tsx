import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Send, Loader2, UserPlus, Quote, Calendar } from 'lucide-react';
import { fetchConversation, markMessageRead, fetchSharedOwnedProjects, createTaskFromMessage, sendMessage as sendMessageApi } from '@/services/api';
import type { NewTaskInput } from '@/components/projects/tasks/CreateTaskForm';
import type { Message, Profile, TaskStatus } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { AddTaskFromChatModal } from './AddTaskFromChatModal';
import { useMessagesData } from './messagesContext';

const taskStatusBadge: Record<TaskStatus, { tone: 'default' | 'accent' | 'green' | 'amber' | 'rose'; label: string }> = {
  open: { tone: 'default', label: 'Open' },
  in_progress: { tone: 'amber', label: 'In Progress' },
  submitted: { tone: 'accent', label: 'Submitted' },
  approved: { tone: 'green', label: 'Approved' },
  changes_requested: { tone: 'amber', label: 'Changes Requested' },
  rejected: { tone: 'rose', label: 'Rejected' },
};

interface MessageGroup {
  senderId: string;
  items: Message[];
}

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === m.sender_id) {
      last.items.push(m);
    } else {
      groups.push({ senderId: m.sender_id, items: [m] });
    }
  }
  return groups;
}

interface Props {
  myProfile: Profile;
  otherProfile: Profile;
  projectId?: string;
  projectTitle?: string;
  /** panel/pip = compact; modal and page = roomy. */
  variant: 'panel' | 'modal' | 'page';
  /** Extra header buttons (e.g. Pop out on the Messages page). */
  headerExtra?: ReactNode;
  /** Panel mode: shows a back arrow. */
  onBack?: () => void;
  /** Modal mode: shows a close button. */
  onClose?: () => void;
}

export function ConversationThread({ myProfile, otherProfile, projectId, projectTitle, variant, onBack, onClose, headerExtra }: Props) {
  // the shared inbox is live (realtime); when it gets a message from this person we don't have yet, reload the thread
  const { messages: inbox } = useMessagesData();
  const latestFromOther = useMemo(
    () => inbox.find((m) => m.sender_id === otherProfile.id && m.recipient_id === myProfile.id)?.id ?? null,
    [inbox, otherProfile.id, myProfile.id],
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  // projects I own that the other person is a member of: "Add task" shows when there is at least one
  const [sharedProjects, setSharedProjects] = useState<{ id: string; title: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (reloadKey === 0) setLoading(true); // live reloads keep the thread on screen
      try {
        const msgs = await fetchConversation(myProfile.id, otherProfile.id, projectId);
        if (cancelled) return;
        setMessages(msgs);
        const unread = msgs.filter((m) => m.recipient_id === myProfile.id && !m.is_read);
        unread.forEach((m) => markMessageRead(m.id));
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [myProfile.id, otherProfile.id, projectId, reloadKey]);

  useEffect(() => {
    if (latestFromOther && !messages.some((m) => m.id === latestFromOther)) setReloadKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a new incoming message
  }, [latestFromOther]);

  useEffect(() => {
    let cancelled = false;
    fetchSharedOwnedProjects(myProfile.id, otherProfile.id).then((list) => {
      if (!cancelled) setSharedProjects(list);
    });
    return () => {
      cancelled = true;
    };
  }, [myProfile.id, otherProfile.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const canAddTask = sharedProjects.length > 0;
  const groups = useMemo(() => groupMessages(messages), [messages]);
  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const compact = variant === 'panel';

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessageApi(myProfile.id, otherProfile.id, body.trim(), projectId, null, replyTo?.id ?? null);
      setMessages((prev) => [...prev, msg]);
      setBody('');
      setReplyTo(null);
    } catch {
      // ignore
    }
    setSending(false);
  };

  const handleCreateTask = async (taskProjectId: string, input: NewTaskInput) => {
    setTaskBusy(true);
    setTaskError(null);
    try {
      const { message } = await createTaskFromMessage(taskProjectId, myProfile.id, otherProfile.id, {
        title: input.title,
        description: input.description.trim() || undefined,
        acceptance_criteria: input.acceptance_criteria.trim() || undefined,
        due_date: input.due_date || null,
        assignee_id: input.assignee_id || null,
      });
      // the thread may be filtered to one project; only show the card here if it belongs
      if (!projectId || projectId === taskProjectId) setMessages((prev) => [...prev, message]);
      setShowAddTask(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to create task');
    }
    setTaskBusy(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-2 border-b border-white/8', compact ? 'px-3 py-3' : 'p-5')}>
        {onBack && (
          <button onClick={onBack} aria-label="Back to conversations" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
        )}
        <Avatar src={otherProfile.avatar_url} name={otherProfile.display_name} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-medium text-white', compact ? 'text-xs' : 'font-display text-lg font-bold')}>{otherProfile.display_name}</p>
          {projectTitle && <p className={cn('truncate text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>re: {projectTitle}</p>}
        </div>
        {canAddTask && (
          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent-400/30 bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-200 hover:bg-accent-500/20 transition-colors"
          >
            <UserPlus size={13} /> {compact ? 'Task' : 'Add Task'}
          </button>
        )}
        {headerExtra}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className={cn('flex-1 overflow-y-auto space-y-3', compact ? 'px-3 py-3' : 'p-5')}>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoopLoader size={compact ? 18 : 20} />
          </div>
        ) : messages.length === 0 ? (
          <p className={cn('text-center text-slate-500', compact ? 'py-8 text-xs' : 'py-8 text-sm')}>No messages yet. Start the conversation.</p>
        ) : (
          groups.map((group, gi) => {
            const isMine = group.senderId === myProfile.id;
            const sender = isMine ? myProfile : otherProfile;
            return (
              <div key={gi} className={cn('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-1.5 px-1">
                  <Avatar src={sender.avatar_url} name={sender.display_name} size="xs" />
                  <span className="text-[10px] text-slate-500">{relativeDate(group.items[group.items.length - 1].created_at)}</span>
                </div>
                <div className={cn('flex max-w-[85%] flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                  {group.items.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      quoted={m.reply_to_id ? messagesById.get(m.reply_to_id) : undefined}
                      isMine={isMine}
                      compact={compact}
                      otherName={otherProfile.display_name}
                      onQuote={() => setReplyTo(m)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {replyTo && (
        <div className={cn('flex items-center justify-between gap-2 border-t border-white/8 bg-white/[0.02]', compact ? 'px-3 py-1.5' : 'px-5 py-2')}>
          <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
            <Quote size={11} className="mr-1 inline text-accent-300" />
            Replying to {replyTo.sender_id === myProfile.id ? 'yourself' : otherProfile.display_name}: {replyTo.task_id ? `Task: ${replyTo.task?.title ?? ''}` : replyTo.body}
          </p>
          <button onClick={() => setReplyTo(null)} className="shrink-0 text-slate-500 hover:text-white transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      <div className={cn('flex gap-2 border-t border-white/8', compact ? 'p-3' : 'p-5')}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Type a reply… (Shift+Enter for a new line)"
          className={cn(
            'wl-chat-in flex-1 resize-none rounded-lg border border-white/10 bg-ink-900/60 placeholder:text-slate-600 focus:border-accent-400/40 transition-colors',
            compact ? 'px-3 py-2 text-xs text-white' : 'px-3.5 py-2.5 text-sm text-white',
          )}
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          aria-label="Send message"
          className="btn-primary self-end px-3 py-2 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>

      {showAddTask && canAddTask && (
        <AddTaskFromChatModal
          projects={sharedProjects}
          initialProjectId={projectId && sharedProjects.some((p) => p.id === projectId) ? projectId : undefined}
          assigneeId={otherProfile.id}
          busy={taskBusy}
          error={taskError}
          onClose={() => { setShowAddTask(false); setTaskError(null); }}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  quoted,
  isMine,
  compact,
  otherName,
  onQuote,
}: {
  message: Message;
  quoted?: Message;
  isMine: boolean;
  compact: boolean;
  otherName: string;
  onQuote: () => void;
}) {
  if (message.task) {
    const sb = taskStatusBadge[message.task.status] ?? taskStatusBadge.open;
    const cardClassName = cn(
      'block rounded-xl border p-3 transition-colors',
      isMine ? 'border-accent-400/30 bg-accent-500/10 hover:bg-accent-500/15' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.06]',
    );
    const cardContent = (
      <>
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="shrink-0 text-accent-300" />
          <p className="truncate text-sm font-medium text-white">{message.task.title}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={sb.tone}>{sb.label}</Badge>
          {message.task.assignee && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Avatar src={message.task.assignee.avatar_url} name={message.task.assignee.display_name} size="xs" /> {message.task.assignee.display_name}
            </span>
          )}
          {message.task.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar size={10} /> {message.task.due_date}
            </span>
          )}
        </div>
        {message.body && <p className="mt-1.5 text-xs text-slate-400">{message.body}</p>}
      </>
    );
    return (
      <div className="group relative w-full max-w-full">
        {message.project?.slug ? (
          <Link to={`/projects/${message.project.slug}`} className={cardClassName}>{cardContent}</Link>
        ) : (
          <div className={cardClassName}>{cardContent}</div>
        )}
        <QuoteButton onQuote={onQuote} isMine={isMine} />
      </div>
    );
  }

  return (
    <div className="group relative">
      {quoted && (
        <div className={cn('mb-0.5 max-w-full truncate rounded-md border-l-2 border-accent-400/40 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-500', isMine ? 'ml-auto' : '')}>
          {quoted.sender_id === message.sender_id ? 'Self' : otherName}: {quoted.task_id ? `Task: ${quoted.task?.title ?? ''}` : quoted.body}
        </div>
      )}
      <div
        className={cn(
          'wl-bub rounded-lg px-3 py-2',
          isMine && 'me',
          compact ? 'text-xs' : 'text-sm',
          isMine ? 'bg-accent-500/20 text-slate-100 border border-accent-400/20' : 'bg-white/[0.04] text-slate-300 border border-white/8',
        )}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
      </div>
      <QuoteButton onQuote={onQuote} isMine={isMine} />
    </div>
  );
}

function QuoteButton({ onQuote, isMine }: { onQuote: () => void; isMine: boolean }) {
  return (
    <button
      type="button"
      onClick={onQuote}
      aria-label="Quote this message"
      className={cn(
        'absolute top-0 flex h-6 w-6 items-center justify-center rounded-md bg-ink-900/80 text-slate-400 opacity-0 transition-opacity hover:text-white group-hover:opacity-100',
        isMine ? '-left-7' : '-right-7',
      )}
    >
      <Quote size={12} />
    </button>
  );
}
