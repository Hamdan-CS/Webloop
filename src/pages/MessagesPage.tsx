import { useEffect, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Inbox, PictureInPicture2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessagesData } from '@/components/messaging/messagesContext';
import { usePip } from '@/components/messaging/pipContext';
import { ConversationThread } from '@/components/messaging/ConversationThread';
import { ComposePicker } from '@/components/messaging/ComposePicker';
import { WAvatar, WPageHeader } from '@/components/app/ui';
import { useTabs } from '@/components/app/tabs/tabsContext';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { fetchProfileById } from '@/services/api';
import type { Profile } from '@/types';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';

type ChatState = { profile?: Profile; projectId?: string; projectTitle?: string } | null;

/**
 * Messages as a page (Part 2): conversation list + open chat, two columns on
 * desktop, list → chat on phones. The open chat is in the URL
 * (/messages/<other profile id>), so it can be bookmarked or opened in a tab.
 */
export function MessagesPage() {
  const { profile } = useAuth();
  const { conversationId = null } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { open: openTab } = useTabs();
  const pip = usePip();
  const { conversations, loading, error, refresh, markConversationRead } = useMessagesData();
  const [composing, setComposing] = useState(false);
  // undefined = still looking, null = no such person
  const [stranger, setStranger] = useState<Profile | null | undefined>(undefined);

  const selected = conversationId ? conversations.find((c) => c.other.id === conversationId) ?? null : null;
  const state = location.state as ChatState;
  // a chat with someone you haven't messaged yet: profile from the compose picker, or fetched by id
  useEffect(() => {
    if (!conversationId || selected || loading) { setStranger(undefined); return; }
    if (state?.profile?.id === conversationId) { setStranger(state.profile); return; }
    let alive = true;
    fetchProfileById(conversationId).then((p) => { if (alive) setStranger(p); }).catch(() => { if (alive) setStranger(null); });
    return () => { alive = false; };
  }, [conversationId, selected, loading, state]);

  // opening a chat reads it
  useEffect(() => {
    if (selected && selected.unreadCount > 0) void markConversationRead(selected.other.id);
  }, [selected, markConversationRead]);

  if (!profile) return null;

  const other = selected?.other ?? stranger;
  const projectId = selected?.projectId ?? state?.projectId;
  const projectTitle = selected?.projectTitle ?? state?.projectTitle;

  const openChat = (id: string) => (e: MouseEvent) => {
    const to = `/messages/${id}`;
    if (e.metaKey || e.ctrlKey || e.button === 1) { e.preventDefault(); openTab(to, { background: true }); return; }
    setComposing(false);
    navigate(to);
  };

  const popOut = () => {
    if (!pip) return;
    pip.openPip(conversationId);
    navigate(pip.returnPath);
  };

  return (
    <div className="container-page py-6 w-msgs-page">
      <WPageHeader
        title="Messages"
        subtitle="Your conversations with teammates and project owners."
        actions={<button type="button" className="w-btn-d" onClick={() => { setComposing(true); navigate('/messages'); }}><Plus size={16} /> New message</button>}
      />
      <div className={cn('w-msgs', (conversationId || composing) && 'w-msgs-chat-open')}>
        <aside className="w-msgs-list" aria-label="Conversations">
          {loading ? (
            <div className="w-msgs-empty"><LoopLoader size={22} /></div>
          ) : error ? (
            <div className="w-msgs-empty"><AlertCircle size={20} /><span>{error}</span><button type="button" className="w-btn-l w-btn-sm" onClick={refresh}>Try again</button></div>
          ) : conversations.length === 0 ? (
            <div className="w-msgs-empty"><Inbox size={24} /><span>No messages yet.</span><button type="button" className="w-btn-l w-btn-sm" onClick={() => setComposing(true)}>Start a conversation</button></div>
          ) : (
            conversations.map((c) => {
              const mine = c.lastMessage.sender_id === profile.id;
              const preview = c.lastMessage.task_id ? `📋 ${c.lastMessage.task?.title ?? 'Task'}` : c.lastMessage.body;
              return (
                <button
                  key={c.other.id}
                  type="button"
                  className={cn('w-msgs-row', c.other.id === conversationId && 'on', c.unreadCount > 0 && 'unread')}
                  aria-current={c.other.id === conversationId ? 'page' : undefined}
                  onClick={openChat(c.other.id)}
                  onAuxClick={(e) => { if (e.button === 1) openChat(c.other.id)(e); }}
                >
                  <WAvatar name={c.other.display_name} src={c.other.avatar_url} size={36} />
                  <span className="w-msgs-row-t">
                    <b>{c.other.display_name}{c.unreadCount > 0 && <i className="w-nt-dot" aria-label="Unread" />}</b>
                    <small>{mine && !c.lastMessage.task_id ? 'You: ' : ''}{preview}</small>
                  </span>
                  <time>{relativeDate(c.lastMessage.created_at)}</time>
                </button>
              );
            })
          )}
        </aside>

        <section className="w-msgs-chat" aria-label="Conversation">
          {composing && !conversationId ? (
            <ComposePicker
              profileId={profile.id}
              onBack={() => setComposing(false)}
              onPick={(p, pId, pTitle) => { setComposing(false); navigate(`/messages/${p.id}`, { state: { profile: p, projectId: pId, projectTitle: pTitle } }); }}
            />
          ) : other ? (
            <ConversationThread
              key={other.id}
              myProfile={profile}
              otherProfile={other}
              projectId={projectId}
              projectTitle={projectTitle}
              variant="page"
              onBack={() => navigate('/messages')}
              headerExtra={pip && (
                <button type="button" className="w-btn-l w-btn-sm w-msgs-pop" onClick={popOut} title="Keep this chat in a small window while you work">
                  <PictureInPicture2 size={14} /> Pop out
                </button>
              )}
            />
          ) : conversationId && (loading || stranger === undefined) ? (
            <div className="w-msgs-empty"><LoopLoader size={20} /></div>
          ) : conversationId ? (
            <div className="w-msgs-empty"><AlertCircle size={22} /><span>This conversation could not be found.</span></div>
          ) : (
            <div className="w-msgs-empty">
              <Inbox size={26} />
              <span>Pick a conversation, or start a new one.</span>
              {pip && <button type="button" className="w-btn-l w-btn-sm" onClick={popOut}><PictureInPicture2 size={14} /> Pop out Messages</button>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
