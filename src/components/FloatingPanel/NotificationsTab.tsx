import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { fetchNotifications, markNotificationRead } from '@/services/api';
import type { Notification } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { relativeDate } from '@/utils/labels';
import { useFloatingPanel } from './FloatingPanelContext';
import { useAuth } from '@/contexts/AuthContext';
import { describe, destinationFor, iconFor } from '@/components/notifications/notificationMeta';

interface Props {
  profileId: string;
}

export function NotificationsTab({ profileId }: Props) {
  const { profile } = useAuth();
  const { closePanel } = useFloatingPanel();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const n = await fetchNotifications(profileId);
      setNotifications(n);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClick = async (n: Notification) => {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    const dest = destinationFor(n, profile?.handle ?? null);
    if (dest) {
      closePanel();
      navigate(dest);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <LoopLoader size={22} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="px-4 py-3">
        <p className="label-overline">Notifications</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell size={28} className="text-slate-600" />
            <p className="text-sm text-slate-400">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const clickable = !!destinationFor(n, profile?.handle ?? null);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                disabled={!clickable}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  !n.read_at
                    ? 'border-accent-400/20 bg-accent-500/5 hover:border-accent-400/40'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                } ${!clickable ? 'cursor-default' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-accent-300">{iconFor(n)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-slate-200">{describe(n)}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <p className="text-[10px] text-slate-500">{relativeDate(n.created_at)}</p>
                      {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
