import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, ExternalLink, Loader2, Quote, Send, UserPlus, X } from 'lucide-react';
import type { Message, Profile } from '@/types';
import {
  createTaskInGroup, fetchGroupMembers, fetchGroupMessages, sendGroupMessage, setGroupMuted,
  type GroupConversation,
} from '@/services/api';
import type { NewTaskInput } from '@/components/projects/tasks/CreateTaskForm';
import { Avatar } from '@/components/shared/ui/Avatar';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { projectDot } from '@/components/app/workspaceContext';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { notify } from '@/utils/notify';
import { AddTaskFromChatModal } from './AddTaskFromChatModal';
import { MessageBubble } from './ConversationThread';
import { useMessagesData } from './messagesContext';

/** Group avatar: the team logo, or the project's colour dot. */
export function GroupAvatar({ group, size = 36 }: { group: GroupConversation; size?: number }) {
  if (group.kind === 'team' && group.logo_url) {
    return <img src={group.logo_url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white" style={{ width: size, height: size, background: projectDot(group.project_id ?? group.team_id ?? group.name) }} aria-hidden="true">
      {group.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** A project or team group chat: header (members, link, Add task for the owner, Mute) and messages with sender names. */
export function GroupThread({ myProfile, group, variant, onBack, headerExtra }: {
  myProfile: Profile;
  group: GroupConversation;
  variant: 'panel' | 'page';
  onBack?: () => void;
  headerExtra?: ReactNode;
}) {
  const { groupTick, refreshGroups, markGroupConversationRead } = useMessagesData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const compact = variant === 'panel';
  const left = !!group.left_at;
  const id = group.conversation_id;

  useEffect(() => {
    let cancelled = false;
    fetchGroupMembers(id).then((m) => { if (!cancelled) setMembers(m); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // load on open and whenever a new group message arrives (realtime)
  const [first, setFirst] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (first) setLoading(true);
    fetchGroupMessages(id)
      .then((m) => { if (!cancelled) { setMessages(m); setLoading(false); setFirst(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    void markGroupConversationRead(id);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open + on each new group message
  }, [id, groupTick]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const isOwner = group.kind === 'project' && group.owner_id === myProfile.id;

  const send = async () => {
    if (!body.trim() || left) return;
    setSending(true);
    try {
      const msg = await sendGroupMessage(myProfile.id, id, body.trim(), { replyToId: replyTo?.id ?? null });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setBody('');
      setReplyTo(null);
      void refreshGroups();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not send');
    }
    setSending(false);
  };

  const toggleMute = async () => {
    try { await setGroupMuted(id, !group.muted); await refreshGroups(); } catch { notify.error('Could not change mute'); }
  };

  const createTask = async (projectId: string, input: NewTaskInput) => {
    setTaskBusy(true);
    setTaskError(null);
    try {
      const msg = await createTaskInGroup(projectId, myProfile.id, id, {
        title: input.title,
        description: input.description.trim() || undefined,
        acceptance_criteria: input.acceptance_criteria.trim() || undefined,
        due_date: input.due_date || null,
        assignee_id: input.assignee_id || null,
      });
      setMessages((prev) => [...prev, msg]);
      setShowAddTask(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to create task');
    }
    setTaskBusy(false);
  };

  const pageLink = group.kind === 'project' ? `/projects/${group.slug}` : `/teams/${group.slug}`;

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex flex-wrap items-center gap-2 border-b border-white/8', compact ? 'px-3 py-3' : 'p-5')}>
        {onBack && (
          <button onClick={onBack} aria-label="Back to conversations" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
        )}
        <GroupAvatar group={group} size={compact ? 28 : 36} />
        <div className="min-w-[8rem] flex-1 overflow-hidden">
          <Link to={pageLink} className={cn('flex items-center gap-1 truncate font-medium text-white hover:underline', compact ? 'text-xs' : 'font-display text-lg font-bold')}>
            {group.name} <ExternalLink size={compact ? 10 : 13} className="shrink-0 text-slate-500" />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="ref-avs" aria-hidden="true">
              {members.slice(0, 5).map((p) => (p.avatar_url
                ? <img key={p.id} src={p.avatar_url} alt="" style={{ width: 18, height: 18 }} />
                : <span key={p.id} style={{ width: 18, height: 18, fontSize: 9, display: 'grid', placeItems: 'center' }}>{p.display_name.charAt(0)}</span>))}
            </span>
            <span className={cn('text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>
              {group.kind === 'project' ? 'Project' : 'Team'} group · {group.member_count} member{group.member_count === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        {isOwner && !left && group.project_id && (
          <button type="button" onClick={() => setShowAddTask(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent-400/30 bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-200 hover:bg-accent-500/20 transition-colors">
            <UserPlus size={13} /> {compact ? 'Task' : 'Add Task'}
          </button>
        )}
        {!left && (
          <button type="button" onClick={toggleMute} aria-pressed={group.muted} title={group.muted ? 'Unmute' : 'Mute'}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
            {group.muted ? <BellOff size={15} /> : <Bell size={15} />}
            <span className="sr-only">{group.muted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}
        {headerExtra}
      </div>

      <div ref={scrollRef} className={cn('flex-1 overflow-y-auto space-y-3', compact ? 'px-3 py-3' : 'p-5')}>
        {loading ? (
          <div className="flex justify-center py-8"><LoopLoader size={compact ? 18 : 20} /></div>
        ) : messages.length === 0 ? (
          <p className={cn('text-center text-slate-500', compact ? 'py-8 text-xs' : 'py-8 text-sm')}>No messages yet. Say hi to the {group.kind}.</p>
        ) : (
          messages.map((m, i) => {
            const isMine = m.sender_id === myProfile.id;
            const showHead = i === 0 || messages[i - 1].sender_id !== m.sender_id;
            const sender = isMine ? myProfile : m.sender;
            const quoted = m.reply_to_id ? byId.get(m.reply_to_id) : undefined;
            return (
              <div key={m.id} className={cn('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                {showHead && (
                  <div className="flex items-center gap-1.5 px-1">
                    <Avatar src={sender?.avatar_url} name={sender?.display_name ?? '?'} size="xs" />
                    <span className="text-[11px] font-medium text-slate-300">{isMine ? 'You' : sender?.display_name}</span>
                    <span className="text-[10px] text-slate-500">{relativeDate(m.created_at)}</span>
                  </div>
                )}
                <div className={cn('flex max-w-[85%] flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                  <MessageBubble
                    message={m}
                    quoted={quoted}
                    isMine={isMine}
                    compact={compact}
                    otherName={quoted?.sender?.display_name ?? 'Member'}
                    onQuote={() => setReplyTo(m)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {left ? (
        <p className={cn('border-t border-white/8 text-center text-slate-500', compact ? 'p-3 text-xs' : 'p-5 text-sm')}>
          You're no longer in this {group.kind}, so you can't send or see new messages here.
        </p>
      ) : (
        <>
          {replyTo && (
            <div className={cn('flex items-center justify-between gap-2 border-t border-white/8 bg-white/[0.02]', compact ? 'px-3 py-1.5' : 'px-5 py-2')}>
              <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                <Quote size={11} className="mr-1 inline text-accent-300" />
                Replying to {replyTo.sender_id === myProfile.id ? 'yourself' : replyTo.sender?.display_name}: {replyTo.task_id ? `Task: ${replyTo.task?.title ?? ''}` : replyTo.body}
              </p>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="shrink-0 text-slate-500 hover:text-white transition-colors"><X size={13} /></button>
            </div>
          )}
          <div className={cn('flex gap-2 border-t border-white/8', compact ? 'p-3' : 'p-5')}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              placeholder={`Message ${group.name}… (Shift+Enter for a new line)`}
              aria-label="Message"
              className={cn('wl-chat-in flex-1 resize-none rounded-lg border border-white/10 bg-ink-900/60 placeholder:text-slate-600 focus:border-accent-400/40 transition-colors',
                compact ? 'px-3 py-2 text-xs text-white' : 'px-3.5 py-2.5 text-sm text-white')}
            />
            <button onClick={send} disabled={sending || !body.trim()} aria-label="Send message" className="btn-primary self-end px-3 py-2 disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </>
      )}

      {showAddTask && group.project_id && (
        <AddTaskFromChatModal
          projects={[{ id: group.project_id, title: group.name }]}
          initialProjectId={group.project_id}
          assigneeId=""
          busy={taskBusy}
          error={taskError}
          onClose={() => { setShowAddTask(false); setTaskError(null); }}
          onCreate={createTask}
        />
      )}
    </div>
  );
}
