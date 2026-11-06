import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations', filter: `invitee_id=eq.${profile.id}` }, () => refreshCounts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, refreshCounts]);
  return null;
}

/** One header button for Messages, Tasks & Invitations: combined badge, opens the side drawer (or the invitations page when that's the only thing pending). */
export function NotificationBell() {
  const { user, profile, unreadMessages, pendingReviews, pendingInvites } = useAuth();
  const { isOpen, openPanel, closePanel } = useFloatingPanel();
  const navigate = useNavigate();
  if (!user || !profile) return null;
  const total = unreadMessages + pendingReviews + pendingInvites;
  const parts = [
    unreadMessages > 0 && `${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}`,
    pendingReviews > 0 && `${pendingReviews} task${pendingReviews !== 1 ? 's' : ''} to review`,
    pendingInvites > 0 && `${pendingInvites} project invitation${pendingInvites !== 1 ? 's' : ''}`,
  ].filter(Boolean);
  const handleClick = () => {
    if (isOpen) { closePanel(); return; }
    if (unreadMessages === 0 && pendingReviews === 0 && pendingInvites > 0) {
      navigate('/my-invitations');
      return;
    }
    openPanel(unreadMessages === 0 && pendingReviews > 0 ? 'tasks' : 'messages');
  };
  return (
    <button
      type="button"
      data-floating-trigger
      className={cn('hdr-theme hdr-bell', isOpen && 'on')}
      aria-label={parts.length ? `Notifications: ${parts.join(', ')}` : 'Notifications'}
      aria-expanded={isOpen}
      title="Messages, tasks & invitations"
      onClick={handleClick}
    >
      <Bell size={18} />
      {total > 0 && <span className="hdr-bell-n">{total > 9 ? '9+' : total}</span>}
    </button>
  );
}
