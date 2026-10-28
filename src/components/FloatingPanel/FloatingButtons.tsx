import { useEffect, type ReactNode } from 'react';
import { Inbox, ListChecks } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { useFloatingPanel, type PanelTab } from './FloatingPanelContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function FloatingButtons() {
  const { user, profile, unreadMessages, pendingReviews, refreshCounts } = useAuth();
  const { isOpen, activeTab, openPanel, closePanel } = useFloatingPanel();

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

  if (!user || !profile) return null;

  const handleClick = (tab: PanelTab) => {
    if (isOpen && activeTab === tab) closePanel();
    else openPanel(tab);
  };

  return (
    <div data-floating-trigger className="fixed bottom-5 right-5 z-40 flex flex-col items-center gap-3 sm:bottom-6 sm:right-6">
      <FloatButton
        icon={<ListChecks size={20} />}
        label="Tasks"
        count={pendingReviews}
        active={isOpen && activeTab === 'tasks'}
        onClick={() => handleClick('tasks')}
      />
      <FloatButton
        icon={<Inbox size={20} />}
        label="Messages"
        count={unreadMessages}
        active={isOpen && activeTab === 'messages'}
        onClick={() => handleClick('messages')}
      />
    </div>
  );
}

function FloatButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      title={label}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-full border shadow-card transition-[background-color,border-color,transform] duration-150 active:scale-95',
        active
          ? 'border-accent-400/40 bg-accent-500 text-ink-950'
          : 'border-white/10 bg-ink-850/90 text-slate-200 hover:bg-ink-800 hover:border-white/20',
      )}
    >
      {icon}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-ink-950 bg-signal-rose px-1 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
