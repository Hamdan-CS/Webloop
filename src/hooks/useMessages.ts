import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchInboxMessages, markMessageRead, sendMessage } from '@/lib/api';
import type { Message, Profile } from '@/lib/types';

export interface Conversation {
  other: Profile;
  lastMessage: Message;
  unreadCount: number;
  projectId?: string;
  projectTitle?: string;
}

function buildConversations(messages: Message[], profileId: string): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const received = m.recipient_id === profileId;
    const other = received ? m.sender : m.recipient;
    if (!other) continue;
    const existing = map.get(other.id);
    if (!existing || new Date(m.created_at) > new Date(existing.lastMessage.created_at)) {
      map.set(other.id, {
        other,
        lastMessage: m,
        unreadCount: existing?.unreadCount ?? 0,
        projectId: m.project_id ?? undefined,
        projectTitle: m.project?.title,
      });
    }
    if (received && !m.is_read) {
      map.get(other.id)!.unreadCount += 1;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
  );
}

/** Fetches the signed-in profile's inbox, keeps it live via Supabase realtime, and exposes send/markRead actions. */
export function useMessages(profileId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      setMessages(await fetchInboxMessages(profileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`panel-messages-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${profileId}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${profileId}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, refresh]);

  const unreadCount = profileId ? messages.filter((m) => !m.is_read && m.recipient_id === profileId).length : 0;
  const conversations = profileId ? buildConversations(messages, profileId) : [];

  const markRead = useCallback(async (messageId: string) => {
    await markMessageRead(messageId);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m)));
  }, []);

  const send = useCallback(
    async (recipientId: string, body: string, projectId?: string) => {
      if (!profileId) throw new Error('Not signed in');
      const msg = await sendMessage(profileId, recipientId, body, projectId);
      setMessages((prev) => [msg, ...prev]);
      return msg;
    },
    [profileId],
  );

  return { messages, conversations, unreadCount, loading, error, refresh, markRead, send };
}
