import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Maximize2, MessageSquare, Minus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMessagesData } from './messagesContext';
import { usePip, type PipCorner } from './pipContext';
import { MessagesPane } from './MessagesPane';
import { cn } from '@/utils/cn';

const PHONE = '(max-width: 859px)'; // same breakpoint as the app's phone tab bar

function useIsPhone() {
  const [phone, setPhone] = useState(() => matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

/**
 * Messages picture-in-picture (Part 2): the whole Messages section in a small
 * window over any page of the app. Rendered once in AppShell, outside the
 * routed content, so it survives page and tab changes. Drag the header to move
 * it; it snaps to the nearest corner (kept in localStorage). On phones only the
 * minimised bubble shows; tapping it opens the Messages page.
 */
export function MessagesPip() {
  const pip = usePip();
  const { profile } = useAuth();
  const { unreadConversations } = useMessagesData();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const phone = useIsPhone();
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  if (!pip || !pip.open || !profile) return null;
  const { conversationId, minimised, corner } = pip;

  // already looking at the same thing on the Messages page: don't show it twice
  if (pathname === `/messages/${conversationId}` || (conversationId === null && pathname === '/messages')) return null;

  const expand = () => {
    navigate(conversationId ? `/messages/${conversationId}` : '/messages');
    pip.closePip();
  };

  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    start.current = { px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.px, y: e.clientY - start.current.py });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    const r = boxRef.current?.getBoundingClientRect();
    if (r) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const next = `${cy < innerHeight / 2 ? 't' : 'b'}${cx < innerWidth / 2 ? 'l' : 'r'}` as PipCorner;
      pip.setCorner(next);
    }
    setDrag(null);
  };

  const unread = unreadConversations > 0 ? (unreadConversations > 9 ? '9+' : String(unreadConversations)) : null;

  if (minimised || phone) {
    return (
      <button
        type="button"
        className={cn('w-pip-bubble', `w-pip-${phone ? 'br' : corner}`)}
        onClick={() => (phone ? expand() : pip.setMinimised(false))}
        aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
      >
        <MessageSquare size={20} />
        {unread && <span className="w-pip-badge">{unread}</span>}
      </button>
    );
  }

  return (
    <div
      ref={boxRef}
      className={cn('w-pip', `w-pip-${corner}`, drag && 'w-pip-drag')}
      style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}
      role="dialog"
      aria-label="Messages (mini window)"
    >
      <div className="w-pip-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <MessageSquare size={14} />
        <b>Messages</b>
        {unread && <span className="w-pip-badge static">{unread}</span>}
        <span className="w-pip-sp" />
        <button type="button" onClick={expand} aria-label="Open the full Messages page" title="Expand"><Maximize2 size={14} /></button>
        <button type="button" onClick={() => pip.setMinimised(true)} aria-label="Minimise" title="Minimise"><Minus size={14} /></button>
        <button type="button" onClick={pip.closePip} aria-label="Close" title="Close"><X size={14} /></button>
      </div>
      <div className="w-pip-body pf">
        <MessagesPane profileId={profile.id} myProfile={profile} initialChatId={conversationId} onChatChange={pip.setConversation} />
      </div>
    </div>
  );
}
