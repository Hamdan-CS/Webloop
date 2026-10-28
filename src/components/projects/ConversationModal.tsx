import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Send, Loader2, ArrowLeft } from 'lucide-react';
import { fetchConversation, sendMessage, markMessageRead } from '@/lib/api';
import type { Message, Profile } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { relativeDate } from '@/lib/labels';
import { cn } from '@/lib/utils';

interface Props {
  myProfile: Profile;
  otherProfile: Profile;
  projectId?: string;
  projectTitle?: string;
  onClose: () => void;
}

export function ConversationModal({ myProfile, otherProfile, projectId, projectTitle, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await fetchConversation(myProfile.id, otherProfile.id, projectId);
      setMessages(msgs);
      const unread = msgs.filter((m) => m.recipient_id === myProfile.id && !m.is_read);
      unread.forEach((m) => markMessageRead(m.id));
    } catch {
      // ignore
    }
    setLoading(false);
  }, [myProfile.id, otherProfile.id, projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(myProfile.id, otherProfile.id, body.trim(), projectId);
      setMessages([...messages, msg]);
      setBody('');
    } catch {
      // ignore
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in-up">
      <div className="surface-raised shadow-card w-full max-w-lg p-0 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <Avatar src={otherProfile.avatar_url} name={otherProfile.display_name} size="md" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">{otherProfile.display_name}</h2>
              {projectTitle && <p className="text-xs text-slate-500">re: {projectTitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-accent-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === myProfile.id;
              return (
                <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm',
                    isMine ? 'bg-accent-500/20 text-slate-100 border border-accent-400/20' : 'bg-white/[0.04] text-slate-300 border border-white/8',
                  )}>
                    <p className="leading-relaxed">{m.body}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{relativeDate(m.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 border-t border-white/8 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a reply..."
            className="flex-1 rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-400/40 transition-colors"
          />
          <Button onClick={handleSend} disabled={sending || !body.trim()} className="px-4">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
