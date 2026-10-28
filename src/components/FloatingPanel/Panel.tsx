import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFloatingPanel } from './FloatingPanelContext';
import { useAuth } from '@/components/auth/AuthContext';
import { cn } from '@/lib/utils';
import { MessagesTab } from './MessagesTab';
import { TasksTab } from './TasksTab';

export function Panel() {
  const { user, profile } = useAuth();
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
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'messages' ? 'Messages' : 'Tasks'}
      className={cn(
        'fixed z-40 flex flex-col overflow-hidden border border-white/10 bg-ink-900 shadow-card transition-[opacity,transform] duration-200 ease-out',
        'inset-x-0 bottom-0 h-[85vh] rounded-t-2xl',
        'sm:inset-x-auto sm:bottom-24 sm:right-5 sm:h-[520px] sm:w-[380px] sm:rounded-2xl',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 sm:translate-y-2',
      )}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex gap-1" role="tablist">
          <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} label="Messages" />
          <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} label="Tasks" />
        </div>
        <button
          onClick={closePanel}
          aria-label="Close panel"
          className="mb-3 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'messages' ? (
          <MessagesTab profileId={profile.id} myProfile={profile} />
        ) : (
          <TasksTab profileId={profile.id} />
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'px-3 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active ? 'border-accent-400 text-white' : 'border-transparent text-slate-400 hover:text-white',
      )}
    >
      {label}
    </button>
  );
}
