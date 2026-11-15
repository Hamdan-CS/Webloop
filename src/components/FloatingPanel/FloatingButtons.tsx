import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${profile.id}` }, () => refreshCounts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, refreshCounts]);
  return null;
}
