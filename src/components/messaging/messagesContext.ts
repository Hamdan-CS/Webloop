import { createContext, useContext } from 'react';
import type { useMessages } from '@/hooks/useMessages';

type MessagesData = ReturnType<typeof useMessages>;

export interface MessagesContextValue extends MessagesData {
  /** Conversations with at least one unread message (what the bell counts). */
  unreadConversations: number;
  /** Mark every unread message from this person as read. */
  markConversationRead: (otherId: string) => Promise<void>;
  /** A chat someone asked to open (e.g. Reply in the bell); the Messages view picks it up and clears it. */
  pendingChatId: string | null;
  requestChat: (otherId: string | null) => void;
}

export const MessagesContext = createContext<MessagesContextValue | null>(null);

export function useMessagesData(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessagesData must be used within MessagesProvider');
  return ctx;
}
