import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Reply } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingPanel } from '@/components/FloatingPanel';
import { useMessagesData } from '@/components/messaging/messagesContext';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/api';
import type { Notification } from '@/types';
import type { Conversation } from '@/hooks/useMessages';
import { relativeDate } from '@/utils/labels';
import { cn } from '@/utils/cn';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import { actionFor, describe, destinationFor, detailsFor, iconFor } from '@/components/notifications/notificationMeta';
import { WAvatar } from './ui';

const REFRESH_MS = 30_000; // notifications aren't in the realtime publication: refresh while open
const WIDTH = 380;

type Row =
  | { kind: 'n'; at: number; n: Notification }
  | { kind: 'm'; at: number; c: Conversation; unread: boolean };

/**
 * The bell's dropdown (Part 3): notifications + one row per conversation with
 * unread messages, newest first. Fixed-positioned next to the bell so the
 * sidebar's overflow can't clip it; opens upward when there's no room below.
 */
export function NotificationsMenu({ anchorRef, onClose }: { anchorRef: RefObject<HTMLElement | null>; onClose: () => void }) {
  const { profile, refreshCounts } = useAuth();
  const { openPanel } = useFloatingPanel();
  const { conversations, markConversationRead, requestChat } = useMessagesData();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [openDetails, setOpenDetails] = useState<string | null>(null);
  // conversations marked read while the menu is open keep their row (minus the dot)
  const [readHere, setReadHere] = useState<Map<string, Conversation>>(new Map());
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' });
  const profileId = profile?.id;

  const load = useCallback(async () => {
    if (!profileId) return;
    try { setItems(await fetchNotifications(profileId, 50)); } catch { setItems((x) => x ?? []); }
  }, [profileId]);

  useEffect(() => {
    void load();
    void refreshCounts();
    const t = setInterval(() => { void load(); void refreshCounts(); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [load, refreshCounts]);

  // place beside the bell: below if it fits, otherwise above
  useLayoutEffect(() => {
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      const m = menuRef.current;
      if (!a || !m) return;
      const w = Math.min(WIDTH, innerWidth - 24);
      const h = m.offsetHeight;
      const left = Math.max(12, Math.min(a.left, innerWidth - w - 12));
      const below = innerHeight - a.bottom - 8;
      setPos(below >= h + 12
        ? { left, width: w, top: a.bottom + 8 }
        : { left, width: w, bottom: Math.max(12, innerHeight - a.top + 8) });
    };
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [anchorRef, items]);

  // close on outside click / Escape
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [anchorRef, onClose]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const n of items ?? []) {
      if (filter === 'unread' && n.read_at) continue;
      out.push({ kind: 'n', at: +new Date(n.created_at), n });
    }
    const seen = new Set<string>();
    for (const c of conversations) {
      if (c.unreadCount > 0) { out.push({ kind: 'm', at: +new Date(c.lastMessage.created_at), c, unread: true }); seen.add(c.other.id); }
    }
    if (filter === 'all') {
      for (const [id, c] of readHere) if (!seen.has(id)) out.push({ kind: 'm', at: +new Date(c.lastMessage.created_at), c, unread: false });
    }
    return out.sort((a, b) => b.at - a.at);
  }, [items, conversations, readHere, filter]);

  const anyUnread = rows.some((r) => (r.kind === 'n' ? !r.n.read_at : r.unread));

  const markRead = async (n: Notification) => {
    if (n.read_at) return;
    const now = new Date().toISOString();
    setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)) ?? xs);
    try { await markNotificationRead(n.id); } catch { /* the next refresh shows the truth */ }
    void refreshCounts();
  };

  const markConvo = async (c: Conversation) => {
    setReadHere((m) => new Map(m).set(c.other.id, { ...c, unreadCount: 0 }));
    await markConversationRead(c.other.id);
  };

  const markAll = async () => {
    if (!profileId) return;
    const now = new Date().toISOString();
    setItems((xs) => xs?.map((x) => (x.read_at ? x : { ...x, read_at: now })) ?? xs);
    const unreadConvos = conversations.filter((c) => c.unreadCount > 0);
    setReadHere((m) => { const next = new Map(m); unreadConvos.forEach((c) => next.set(c.other.id, { ...c, unreadCount: 0 })); return next; });
    await Promise.all([
      markAllNotificationsRead(profileId).catch(() => {}),
      ...unreadConvos.map((c) => markConversationRead(c.other.id)),
    ]);
    void refreshCounts();
  };

  const main = (n: Notification) => {
    void markRead(n);
    const dest = destinationFor(n, profile?.handle ?? null);
    if (dest) { onClose(); navigate(dest); return; }
    setOpenDetails((id) => (id === n.id ? null : n.id));
  };

  const reply = (c: Conversation) => {
    void markConvo(c);
    requestChat(c.other.id);
    openPanel('messages');
    onClose();
  };

  return (
    <div ref={menuRef} className="w-nt-menu" role="dialog" aria-label="Notifications" style={pos}>
      <div className="w-nt-head">
        <b>Notifications</b>
        <button type="button" className="w-nt-all" onClick={markAll} disabled={!anyUnread}><CheckCheck size={14} /> Mark all as read</button>
      </div>
      <div className="w-nt-filter" role="tablist" aria-label="Show">
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={cn(filter === f && 'on')} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>
      <div className="w-nt-list">
        {items === null ? (
          <div className="w-nt-empty"><LoopLoader size={20} /></div>
        ) : rows.length === 0 ? (
          <div className="w-nt-empty"><Bell size={20} /><span>{filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}</span></div>
        ) : rows.map((r) => r.kind === 'n' ? (
          <div key={r.n.id} className={cn('w-nt-row', !r.n.read_at && 'unread')}>
            <span className="w-nt-ic">{iconFor(r.n)}</span>
            <div className="w-nt-body">
              <p>{describe(r.n)}</p>
              <small>{relativeDate(r.n.created_at)}{!r.n.read_at && <i className="w-nt-dot" aria-label="Unread" />}</small>
              {openDetails === r.n.id && detailsFor(r.n) && <p className="w-nt-detail">{detailsFor(r.n)}</p>}
              <div className="w-nt-acts">
                <button type="button" className="w-nt-main" onClick={() => main(r.n)} aria-expanded={destinationFor(r.n, profile?.handle ?? null) ? undefined : openDetails === r.n.id}>
                  {openDetails === r.n.id ? 'Hide details' : actionFor(r.n)}
                </button>
              </div>
            </div>
            {!r.n.read_at && (
              <button type="button" className="w-nt-check" onClick={() => markRead(r.n)} aria-label="Mark as read" title="Mark as read"><Check size={14} /></button>
            )}
          </div>
        ) : (
          <div key={`m-${r.c.other.id}`} className={cn('w-nt-row w-nt-msg', r.unread && 'unread')}>
            <WAvatar name={r.c.other.display_name} src={r.c.other.avatar_url} size={28} />
            <div className="w-nt-body">
              <p>
                <b>{r.c.other.display_name}</b>{' '}
                {r.unread ? `sent you ${r.c.unreadCount} message${r.c.unreadCount === 1 ? '' : 's'}` : 'messages read'}
              </p>
              {r.c.lastMessage.body && <p className="w-nt-prev">{r.c.lastMessage.body}</p>}
              <small>{relativeDate(r.c.lastMessage.created_at)}{r.unread && <i className="w-nt-dot" aria-label="Unread" />}</small>
            </div>
            <div className="w-nt-side">
              {r.unread && (
                <button type="button" className="w-nt-check" onClick={() => markConvo(r.c)} aria-label="Mark as read" title="Mark as read"><Check size={14} /></button>
              )}
              <button type="button" className="w-nt-reply" onClick={() => reply(r.c)}><Reply size={13} /> Reply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
