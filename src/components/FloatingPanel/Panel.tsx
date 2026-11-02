import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFloatingPanel } from './FloatingPanelContext';
import { useAuth } from '@/components/auth/AuthContext';
import { cn } from '@/lib/utils';
import { MessagesTab } from './MessagesTab';
import { TasksTab } from './TasksTab';

export function Panel() {
  const { user, profile, unreadMessages, pendingReviews } = useAuth();
  const { isOpen, activeTab, setActiveTab, closePanel } = useFloatingPanel();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 200);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mounted, closePanel]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      if (target.closest('[data-floating-trigger]')) return;
      closePanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mounted, closePanel]);

  useEffect(() => {
    if (!mounted || !visible) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', handler);
    return () => panel.removeEventListener('keydown', handler);
  }, [mounted, visible, activeTab]);

  if (!user || !profile || !mounted) return null;

  return (
    <>
      <div
        className={cn('fp-backdrop', visible && 'show')}
        onClick={closePanel}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={activeTab === 'messages' ? 'Messages' : 'Tasks'}
        className={cn('fp-drawer pf', visible && 'show')}
      >
        <div className="fp-head">
          <div className="d-tabs pf-tabs" role="tablist">
            <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} label="Messages" count={unreadMessages} />
            <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Tasks to review" count={pendingReviews} />
          </div>
          <button type="button" onClick={closePanel} aria-label="Close panel" className="fp-close">
            <X size={18} />
          </button>
        </div>
        <div className="fp-body">
          {activeTab === 'messages' ? (
            <MessagesTab profileId={profile.id} myProfile={profile} />
          ) : (
            <TasksTab profileId={profile.id} />
          )}
        </div>
      </aside>
    </>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn('pf-tab', active && 'on')}>
      {label}
      {!!count && <span className="pf-count amber">{count > 9 ? '9+' : count}</span>}
    </button>
  );
}
