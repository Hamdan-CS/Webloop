import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Inbox, AlertCircle } from 'lucide-react';
import type { Conversation } from '@/hooks/useMessages';
import { useMessagesData } from './messagesContext';
import type { Profile } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { ConversationThread } from './ConversationThread';
import { ComposePicker } from './ComposePicker';
import { GroupAvatar, GroupThread } from './GroupThread';
import { groupChatId, parseGroupChatId, type GroupConversation } from '@/services/api';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';

interface Props {
  profileId: string;
  myProfile: Profile;
  /** Chat to show first (null = the list). */
  initialChatId?: string | null;
  /** Told whenever the open chat changes (null = back to the list). */
  onChatChange?: (otherId: string | null) => void;
}

type View = 'list' | 'thread' | 'compose';

const viewVariants = {
  initial: (dir: 1 | -1) => ({ opacity: 0, x: dir * 16 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -16 }),
};

/**
 * The whole Messages section in a small space — conversation list, open chat,
 * new message. Used by the picture-in-picture window (it was the side panel's
 * Messages tab).
 */
export function MessagesPane({ profileId, myProfile, initialChatId = null, onChatChange }: Props) {
  const { conversations, groups, loading, error, markConversationRead, refresh, pendingChatId, requestChat } = useMessagesData();
  // group chats (Part E) open here too; their chat id is g:<conversation id>
  const [groupId, setGroupId] = useState<string | null>(parseGroupChatId(initialChatId));
  const selectedGroup = groupId ? groups.find((g) => g.conversation_id === groupId) ?? null : null;
  const openGroup = (g: GroupConversation | null) => { setGroupId(g?.conversation_id ?? null); setSelectedState(null); onChatChange?.(g ? groupChatId(g.conversation_id) : null); };
  const [selected, setSelectedState] = useState<Conversation | null>(null);
  const [composing, setComposing] = useState(false);
  const setSelected = (c: Conversation | null) => { setSelectedState(c); onChatChange?.(c ? c.other.id : null); };

  // open the initial chat once the inbox has loaded
  const [initialDone, setInitialDone] = useState(!initialChatId);
  useEffect(() => {
    if (initialDone || loading) return;
    setInitialDone(true);
    const c = conversations.find((x) => x.other.id === initialChatId);
    if (c) setSelectedState(c);
  }, [initialDone, loading, conversations, initialChatId]);

  // a chat requested from elsewhere (bell → Reply) opens straight away
  useEffect(() => {
    if (!pendingChatId || loading) return;
    const gid = parseGroupChatId(pendingChatId);
    if (gid) { requestChat(null); setComposing(false); setSelectedState(null); setGroupId(gid); onChatChange?.(pendingChatId); return; }
    const c = conversations.find((x) => x.other.id === pendingChatId);
    requestChat(null);
    if (c) { setComposing(false); setSelectedState(c); onChatChange?.(c.other.id); }
  }, [pendingChatId, loading, conversations, requestChat, onChatChange]);

  const view: View | 'group' = selectedGroup ? 'group' : selected ? 'thread' : composing ? 'compose' : 'list';
  type PaneRow = { kind: 'dm'; c: Conversation; at: number } | { kind: 'group'; g: GroupConversation; at: number };
  const rows: PaneRow[] = [
    ...conversations.map((c) => ({ kind: 'dm' as const, c, at: +new Date(c.lastMessage.created_at) })),
    ...groups.map((g) => ({ kind: 'group' as const, g, at: +new Date(g.last_at ?? 0) })),
  ].sort((a, b) => b.at - a.at);
  const dir: 1 | -1 = view === 'list' ? -1 : 1;

  const openConversation = (c: Conversation) => {
    if (c.unreadCount > 0) void markConversationRead(c.other.id);
    setSelected(c);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {view === 'group' && selectedGroup ? (
          <motion.div
            key="group"
            custom={dir}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex h-full flex-col"
          >
            <GroupThread myProfile={myProfile} group={selectedGroup} variant="panel" onBack={() => openGroup(null)} />
          </motion.div>
        ) : view === 'thread' && selected ? (
          <motion.div
            key="thread"
            custom={dir}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex h-full flex-col"
          >
            <ConversationThread
              myProfile={myProfile}
              otherProfile={selected.other}
              projectId={selected.projectId}
              projectTitle={selected.projectTitle}
              variant="panel"
              onBack={() => {
                setSelected(null);
                refresh();
              }}
            />
          </motion.div>
        ) : view === 'compose' ? (
          <motion.div
            key="compose"
            custom={dir}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex h-full flex-col"
          >
            <ComposePicker
              profileId={profileId}
              onBack={() => setComposing(false)}
              onPick={(otherProfile, pId, pTitle) => {
                setComposing(false);
                setSelected({
                  other: otherProfile,
                  lastMessage: {
                    id: '',
                    sender_id: profileId,
                    recipient_id: otherProfile.id,
                    project_id: pId ?? null,
                    body: '',
                    is_read: true,
                    created_at: new Date().toISOString(),
                    task_id: null,
                    reply_to_id: null,
                  },
                  unreadCount: 0,
                  projectId: pId,
                  projectTitle: pTitle,
                });
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            custom={dir}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex h-full flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="label-overline">Conversations</p>
              <button
                onClick={() => setComposing(true)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Plus size={14} /> New message
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              <div className={loading ? undefined : 'reveal'}>
{loading ? (
                <div className="flex justify-center py-10">
                  <LoopLoader size={22} />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-signal-rose">
                  <AlertCircle size={20} />
                  {error}
                  <button onClick={refresh} className="text-xs text-accent-300 hover:text-accent-200">Try again</button>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-400">No messages yet.</p>
                  <button onClick={() => setComposing(true)} className="text-xs text-accent-300 hover:text-accent-200">
                    Start a conversation
                  </button>
                </div>
              ) : (
                rows.map((r) => {
                  if (r.kind === 'group') {
                    const g = r.g;
                    const unread = g.unread > 0 && !g.left_at;
                    return (
                      <button
                        key={g.conversation_id}
                        onClick={() => openGroup(g)}
                        className={cn(
                          'wl-thr w-full text-left rounded-xl border p-3 transition-colors',
                          unread && 'unread',
                          unread ? 'border-accent-400/20 bg-accent-500/5 hover:border-accent-400/40' : 'border-white/5 bg-white/[0.02] hover:border-white/15',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <GroupAvatar group={g} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-medium text-white">{g.name}</span>
                              {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
                            </div>
                            <p className="text-[10px] text-slate-500">{g.member_count} members{g.last_at ? ` · ${relativeDate(g.last_at)}` : ''}</p>
                          </div>
                        </div>
                        {g.last_body && (
                          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                            <span className="text-slate-500">{g.last_sender_name ?? 'Someone'}: </span>{g.last_body}
                          </p>
                        )}
                      </button>
                    );
                  }
                  const c = r.c;
                  const lastMine = c.lastMessage.sender_id === profileId;
                  const preview = c.lastMessage.task_id
                    ? `📋 ${c.lastMessage.task?.title ?? 'Task'}`
                    : c.lastMessage.body;
                  return (
                    <button
                      key={c.other.id}
                      onClick={() => openConversation(c)}
                      className={cn(
                        'wl-thr w-full text-left rounded-xl border p-3 transition-colors',
                        c.unreadCount > 0 && 'unread',
                        c.unreadCount > 0
                          ? 'border-accent-400/20 bg-accent-500/5 hover:border-accent-400/40'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/15',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar src={c.other.avatar_url} name={c.other.display_name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-white">{c.other.display_name}</span>
                            {c.unreadCount > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500">{relativeDate(c.lastMessage.created_at)}</p>
                        </div>
                      </div>
                      {preview && (
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {lastMine && !c.lastMessage.task_id && <span className="text-slate-500">You: </span>}
                          {preview}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

