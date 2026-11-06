import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Plus, Inbox, AlertCircle } from 'lucide-react';
import { useMessages, type Conversation } from '@/hooks/useMessages';
import { fetchProfileProjects, fetchProjectMembers } from '@/services/api';
import type { Profile, Project } from '@/types';
import { Avatar } from '@/components/shared/ui/Avatar';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { ConversationThread } from '@/components/messaging/ConversationThread';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';

interface Props {
  profileId: string;
  myProfile: Profile;
}

type View = 'list' | 'thread' | 'compose';

const viewVariants = {
  initial: (dir: 1 | -1) => ({ opacity: 0, x: dir * 16 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -16 }),
};

export function MessagesTab({ profileId, myProfile }: Props) {
  const { conversations, loading, error, markRead, refresh } = useMessages(profileId);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [composing, setComposing] = useState(false);

  const view: View = selected ? 'thread' : composing ? 'compose' : 'list';
  const dir: 1 | -1 = view === 'list' ? -1 : 1;

  const openConversation = (c: Conversation) => {
    if (c.lastMessage.recipient_id === profileId && !c.lastMessage.is_read) {
      markRead(c.lastMessage.id);
    }
    setSelected(c);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {view === 'thread' && selected ? (
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
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-400">No messages yet.</p>
                  <button onClick={() => setComposing(true)} className="text-xs text-accent-300 hover:text-accent-200">
                    Start a conversation
                  </button>
                </div>
              ) : (
                conversations.map((c) => {
                  const lastMine = c.lastMessage.sender_id === profileId;
                  const preview = c.lastMessage.task_id
                    ? `📋 ${c.lastMessage.task?.title ?? 'Task'}`
                    : c.lastMessage.body;
                  return (
                    <button
                      key={c.other.id}
                      onClick={() => openConversation(c)}
                      className={cn(
                        'w-full text-left rounded-xl border p-3 transition-colors',
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComposePicker({
  profileId,
  onBack,
  onPick,
}: {
  profileId: string;
  onBack: () => void;
  onPick: (profile: Profile, projectId?: string, projectTitle?: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<string, { profile: Profile; role: string | null }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const prs = await fetchProfileProjects(profileId);
      setProjects(prs);
      const m: Record<string, { profile: Profile; role: string | null }[]> = {};
      await Promise.all(
        prs.map(async (p) => {
          const mem = await fetchProjectMembers(p.id);
          m[p.id] = mem
            .filter((x) => x.profile_id !== profileId && x.profile)
            .map((x) => ({ profile: x.profile as Profile, role: x.role }));
        }),
      );
      setMembers(m);
      setLoading(false);
    })();
  }, [profileId]);

  const hasMembers = Object.values(members).some((m) => m.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <p className="text-xs font-medium text-white">New message</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoopLoader size={18} />
          </div>
        ) : !hasMembers ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No team members yet. Accept join requests on your projects first.
          </p>
        ) : (
          projects.map((p) => {
            const m = members[p.id] ?? [];
            if (m.length === 0) return null;
            return (
              <div key={p.id}>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-slate-500">{p.title}</p>
                <div className="flex flex-wrap gap-2">
                  {m.map(({ profile, role }) => (
                    <button
                      key={profile.id}
                      onClick={() => onPick(profile, p.id, p.title)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 hover:border-accent-400/30 hover:text-white transition-colors"
                    >
                      <Avatar src={profile.avatar_url} name={profile.display_name} size="xs" />
                      {profile.display_name}
                      {role && <span className="text-slate-500">· {role}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
