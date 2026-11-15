import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { markMessageRead } from '@/services/api';
import { MessagesContext, type MessagesContextValue } from './messagesContext';

/**
 * One inbox + one realtime channel for the whole app. Before this, every
 * consumer called useMessages() itself, which opened the same
 * `panel-messages-<id>` channel more than once.
 */
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { profile, refreshCounts } = useAuth();
  const data = useMessages(profile?.id);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const { messages, refresh } = data;

  const markConversationRead = useCallback(async (otherId: string) => {
    if (!profile?.id) return;
    const unread = messages.filter((m) => m.sender_id === otherId && m.recipient_id === profile.id && !m.is_read);
    await Promise.all(unread.map((m) => markMessageRead(m.id).catch(() => {})));
    await refresh();
    await refreshCounts();
  }, [messages, profile?.id, refresh, refreshCounts]);

  const value = useMemo<MessagesContextValue>(() => ({
    ...data,
    unreadConversations: data.conversations.filter((c) => c.unreadCount > 0).length,
    markConversationRead,
    pendingChatId,
    requestChat: setPendingChatId,
  }), [data, markConversationRead, pendingChatId]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}
