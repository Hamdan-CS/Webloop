import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingPanel } from './FloatingPanelContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/utils/cn';

/** Keeps the unread / pending counts live (realtime). Renders nothing. */
export function PanelBadgeSync() {
  const { profile, refreshCounts } = useAuth();
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`panel-badges-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${profile.id}` }, () => refreshCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => refreshCounts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, refreshCounts]);
  return null;
}

/** One header button for both Messages and Tasks: combined badge, opens the side drawer. */
export function NotificationBell() {
  const { user, profile, unreadMessages, pendingReviews } = useAuth();
  const { isOpen, openPanel, closePanel } = useFloatingPanel();
  if (!user || !profile) return null;
  const total = unreadMessages + pendingReviews;
  const parts = [unreadMessages > 0 && `${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}`, pendingReviews > 0 && `${pendingReviews} task${pendingReviews !== 1 ? 's' : ''} to review`].filter(Boolean);
  return (
    <button
      type="button"
      data-floating-trigger
      className={cn('hdr-theme hdr-bell', isOpen && 'on')}
      aria-label={parts.length ? `Notifications: ${parts.join(', ')}` : 'Notifications'}
      aria-expanded={isOpen}
      title="Messages & tasks"
      onClick={() => (isOpen ? closePanel() : openPanel(unreadMessages === 0 && pendingReviews > 0 ? 'tasks' : 'messages'))}
    >
      <Bell size={18} />
      {total > 0 && <span className="hdr-bell-n">{total > 9 ? '9+' : total}</span>}
    </button>
  );
}
