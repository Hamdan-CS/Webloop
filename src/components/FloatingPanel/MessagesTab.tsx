import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, ArrowLeft, Plus, Inbox, AlertCircle } from 'lucide-react';
import { useMessages, type Conversation } from '@/hooks/useMessages';
import { fetchConversation, fetchProfileProjects, fetchProjectMembers } from '@/lib/api';
import type { Message, Profile, Project } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { relativeDate } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface Props {
  profileId: string;
  myProfile: Profile;
}

export function MessagesTab({ profileId, myProfile }: Props) {
  const { conversations, loading, error, markRead, send, refresh } = useMessages(profileId);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [composing, setComposing] = useState(false);

  const openConversation = (c: Conversation) => {
    if (c.lastMessage.recipient_id === profileId && !c.lastMessage.is_read) {
      markRead(c.lastMessage.id);
    }
    setSelected(c);
  };

  if (selected) {
    return (
      <ConversationThread
        myProfile={myProfile}
        otherProfile={selected.other}
        projectId={selected.projectId}
        projectTitle={selected.projectTitle}
        onBack={() => {
          setSelected(null);
          refresh();
        }}
        onSend={send}
      />
    );
  }

  if (composing) {
    return (
      <ComposePicker
        profileId={profileId}
        onBack={() => setComposing(false)}
        onPick={(otherProfile, projectId, projectTitle) => {
          setComposing(false);
          setSelected({
            other: otherProfile,
            lastMessage: {
              id: '',
              sender_id: profileId,
              recipient_id: otherProfile.id,
              project_id: projectId ?? null,
              body: '',
              is_read: true,
              created_at: new Date().toISOString(),
            },
            unreadCount: 0,
            projectId,
            projectTitle,
          });
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="label-overline">Conversations</p>
        <button
          onClick={() => setComposing(true)}
          aria-label="New message"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-accent-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-signal-rose">
            <AlertCircle size={20} />
            {error}
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
          conversations.map((c) => (
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
              {c.lastMessage.body && (
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">{c.lastMessage.body}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ConversationThread({
  myProfile,
  otherProfile,
  projectId,
  projectTitle,
  onBack,
  onSend,
}: {
  myProfile: Profile;
  otherProfile: Profile;
  projectId?: string;
  projectTitle?: string;
  onBack: () => void;
  onSend: (recipientId: string, body: string, projectId?: string) => Promise<Message>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        setMessages(await fetchConversation(myProfile.id, otherProfile.id, projectId));
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, [myProfile.id, otherProfile.id, projectId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const msg = await onSend(otherProfile.id, body.trim(), projectId);
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } catch {
      // ignore
    }
    setSending(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-3">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <Avatar src={otherProfile.avatar_url} name={otherProfile.display_name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{otherProfile.display_name}</p>
          {projectTitle && <p className="truncate text-[10px] text-slate-500">re: {projectTitle}</p>}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-accent-400" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === myProfile.id;
            return (
              <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-xs',
                    isMine
                      ? 'bg-accent-500/20 text-slate-100 border border-accent-400/20'
                      : 'bg-white/[0.04] text-slate-300 border border-white/8',
                  )}
                >
                  <p className="leading-relaxed">{m.body}</p>
                  <p className="mt-1 text-[9px] text-slate-500">{relativeDate(m.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2 border-t border-white/8 p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a reply..."
          className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-accent-400/40 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          aria-label="Send message"
          className="btn-primary px-3 py-2 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
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
            <Loader2 size={18} className="animate-spin text-accent-400" />
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
