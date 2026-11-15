import type { ReactNode } from 'react';
import {
  Bell, UserPlus, CheckCircle2, XCircle, UserCheck, MessageSquare, Heart, ShieldAlert, AlertCircle,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';

/** Icon, text, destination and main-button label for each notification type
 * (payload keys: see the trigger functions in migrations 021/022). */

export const NOTIFICATION_ICONS: Record<NotificationType, ReactNode> = {
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

export const iconFor = (n: Notification): ReactNode => NOTIFICATION_ICONS[n.type] ?? <Bell size={15} />;

export function describe(n: Notification): string {
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

const isModeration = (n: Notification) =>
  n.type === 'post_removed' || n.type === 'post_restored' || n.type === 'post_verified' || n.type === 'warning';

/** Where the main button goes. `null` = no page; the row shows details inline instead. */
export function destinationFor(n: Notification, myHandle: string | null): string | null {
  const p = n.payload;
  switch (n.type) {
    case 'application_received':
      return myHandle ? `/creators/${myHandle}?tab=applications` : null;
    case 'application_accepted':
    case 'application_declined':
    case 'invitation_accepted':
      return p.project_slug ? `/projects/${p.project_slug}` : null;
    case 'post_comment':
      return p.post_id ? `/feed?post=${p.post_id}&reply=1` : '/feed';
    case 'post_like':
      return p.post_id ? `/feed?post=${p.post_id}` : '/feed';
    default:
      return null;
  }
}

/** Label of the main button. */
export function actionFor(n: Notification): string {
  switch (n.type) {
    case 'application_received': return 'Review';
    case 'application_accepted':
    case 'application_declined':
    case 'invitation_accepted': return 'Open project';
    case 'post_comment': return 'Reply';
    case 'post_like': return 'View post';
    default: return isModeration(n) ? 'View details' : 'Open';
  }
}

/** Inline detail text for moderation notifications (they have no page of their own). */
export function detailsFor(n: Notification): string | null {
  const p = n.payload;
  switch (n.type) {
    case 'post_removed':
      return `A moderator removed your post${p.reason ? `. Reason: ${p.reason}` : '.'} It is hidden from the feed; you can still see it on your profile.`;
    case 'post_restored':
      return 'A moderator reviewed your post again and restored it. It is visible in the feed.';
    case 'post_verified':
      return 'A moderator marked your post as verified. It now shows a verified badge.';
    case 'warning': {
      const count = typeof p.count === 'number' ? p.count : null;
      return `${p.reason ? `Reason: ${p.reason}. ` : ''}${count ? `This is warning ${count} of 3.` : ''}${p.paused ? ' Posting is paused on your account.' : ' After 3 warnings, posting is paused.'}`;
    }
    default:
      return null;
  }
}
