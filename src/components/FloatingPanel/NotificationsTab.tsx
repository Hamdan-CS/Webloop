import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  UserPlus,
  CheckCircle2,
  XCircle,
  UserCheck,
  MessageSquare,
  Heart,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { fetchNotifications, markNotificationRead } from '@/services/api';
import type { Notification, NotificationType } from '@/types';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { relativeDate } from '@/utils/labels';
import { useFloatingPanel } from './FloatingPanelContext';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  profileId: string;
}

const ICONS: Record<NotificationType, React.ReactNode> = {
  application_received: <UserPlus size={15} />,
  application_accepted: <CheckCircle2 size={15} />,
  application_declined: <XCircle size={15} />,
  invitation_accepted: <UserCheck size={15} />,
  post_comment: <MessageSquare size={15} />,
  post_like: <Heart size={15} />,
  post_removed: <ShieldAlert size={15} />,
  post_restored: <ShieldAlert size={15} />,
  post_verified: <ShieldAlert size={15} />,
  warning: <AlertCircle size={15} />,
};

function describe(n: Notification): string {
  const p = n.payload;
  switch (n.type) {
    case 'application_received':
      return `${p.applicant_name ?? 'Someone'} requested to join ${p.project_title ?? 'your project'}`;
    case 'application_accepted':
      return `Your request to join ${p.project_title ?? 'the project'} was accepted`;
    case 'application_declined':
      return `Your request to join ${p.project_title ?? 'the project'} was declined`;
    case 'invitation_accepted':
      return `${p.invitee_name ?? 'Someone'} accepted your invitation to ${p.project_title ?? 'the project'}`;
    case 'post_comment':
      return `${p.commenter_name ?? 'Someone'} commented on your post${p.post_title ? ` "${p.post_title}"` : ''}`;
    case 'post_like':
      return `${p.liker_name ?? 'Someone'} liked your post${p.post_title ? ` "${p.post_title}"` : ''}`;
    case 'post_removed':
      return 'Your post was removed by a moderator';
    case 'post_restored':
      return 'Your post was restored';
    case 'post_verified':
      return 'Your post was verified';
    case 'warning':
      return 'You received a moderation warning';
    default:
      return 'New notification';
  }
}

/** Where clicking a notification should take the user, given today's routes
 * (pre-Phase-3 reorg): join-request approval lives on the owner's own profile
 * page, applications/invitations deep-link to the project by slug, and posts
 * have no per-post route yet so they land on the Feed. */
function destinationFor(n: Notification, myHandle: string | null): string | null {
  const p = n.payload;
  switch (n.type) {
    case 'application_received':
      return myHandle ? `/creators/${myHandle}?tab=applications` : null;
    case 'application_accepted':
    case 'application_declined':
    case 'invitation_accepted':
      return p.project_slug ? `/projects/${p.project_slug}` : null;
    case 'post_comment':
    case 'post_like':
      return '/feed';
    default:
      return null;
  }
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
                  <span className="mt-0.5 shrink-0 text-accent-300">{ICONS[n.type] ?? <Bell size={15} />}</span>
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
