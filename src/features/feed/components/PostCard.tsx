import { VerifiedBadge, WebLoopMark } from '@/components/shared/ui/VerifiedBadge';
import { useIsOfficial } from '@/hooks/useOfficialIds';
import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Check,
  Flag,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Shield,
  ShieldCheck,
  ShieldOff,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CreatorType } from '@/types';
import { creatorTypeLabel, relativeDate } from '@/utils/labels';
import { GuidePlayer } from './GuidePlayer';
import { PictureCarousel } from './PictureCarousel';
import { CommentsSection } from './CommentsSection';
import { ReportMenuItem } from './ReportSheet';
import { adminRemovePost, adminRestorePost, adminUnpinPost, adminVerifyPost, adminWarnUser, isActivePin, recordGuideView, recordTry, setBookmark, setReaction } from '../services/feedApi';
import { PinPostDialog } from './PinPostDialog';
import type { Post } from '../types';

/* Card styled after Abbas's design demo (webloop-posts-demo.html: .post,
   .acts). Colours are the feed-only --feed-* variables in index.css. */

/** Avatar colour by role (demo values). The official WebLoop account shows the WebLoop mark. */
const ROLE_COLOR: Record<CreatorType, string> = {
  student: '#6d5bd0',
  company: '#2563eb',
  university: '#b45309',
  independent: '#475569',
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

interface PostCardProps {
  post: Post;
  viewerProfileId: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  playingGuideId: string | null;
  onPlayGuide: (id: string | null) => void;
  onRequireAuth: () => void;
  onChange: (postId: string, patch: Partial<Post>) => void;
  onTagClick?: (tag: string) => void;
  /** Profile-page context: show Edit/Delete instead of Report/admin items. */
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  /** Opened from a notification: open the comments and focus the comment box. */
  focusComment?: boolean;
}

export function PostCard({
  post,
  viewerProfileId,
  isGuest,
  isAdmin,
  playingGuideId,
  onPlayGuide,
  onRequireAuth,
  onChange,
  onTagClick,
  onEdit,
  onDelete,
  focusComment = false,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(focusComment);

  // comments load async: wait for the box, then focus it
  useEffect(() => {
    if (!focusComment) return;
    setCommentsOpen(true);
    let tries = 0;
    const t = setInterval(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-post-id="${post.id}"] input[placeholder^="Add a comment"]`);
      if (input) { input.focus({ preventScroll: true }); clearInterval(t); } else if (++tries > 30) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, [focusComment, post.id]);
  const menuRef = useRef<HTMLDivElement>(null);
  const author = post.author;
  const isPlaying = playingGuideId === post.id;
  const isOfficial = useIsOfficial();
  const official = isOfficial(author?.id);
  // the guest feed (get_guest_feed) doesn't send every counter: default to 0
  const likes = post.like_count ?? 0;
  const comments = post.comment_count ?? 0;
  const tries = post.try_count ?? 0;
  const views = post.view_count ?? 0;
  const roleLine = official ? 'WebLoop team' : author ? creatorTypeLabel[author.creator_type] : '';
  const avatarBg = official ? 'var(--feed-teal)' : author ? ROLE_COLOR[author.creator_type] : 'var(--feed-faint)';
  const [trying, setTrying] = useState(false);

  // close the ⋯ menu on an outside click
  useEffect(() => {
    if (!menuOpen) return;
    const down = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [menuOpen]);

  function requireAuth(): boolean {
    if (isGuest) {
      onRequireAuth();
      return true;
    }
    return false;
  }

  async function toggleLike() {
    if (requireAuth() || !viewerProfileId) return;
    const next = !post.viewer_liked;
    onChange(post.id, { viewer_liked: next, like_count: likes + (next ? 1 : -1) });
    await setReaction(post.id, viewerProfileId, 'like', next);
  }

  async function toggleBookmark() {
    if (requireAuth() || !viewerProfileId) return;
    const next = !post.viewer_bookmarked;
    onChange(post.id, { viewer_bookmarked: next, bookmark_count: (post.bookmark_count ?? 0) + (next ? 1 : -1) });
    await setBookmark(post.id, viewerProfileId, next);
  }

  async function playGuide() {
    if (requireAuth()) return;
    onPlayGuide(post.id);
    if (viewerProfileId) {
      onChange(post.id, { view_count: views + 1 });
      await recordGuideView(post.id, viewerProfileId);
    }
  }

  async function markTried() {
    if (requireAuth() || !viewerProfileId || post.viewer_tried || trying) return;
    setTrying(true);
    try {
      await recordTry(post.id, viewerProfileId, null);
      onChange(post.id, { viewer_tried: true, try_count: tries + 1 });
    } finally {
      setTrying(false);
    }
  }

  async function markVerified(verified: boolean) {
    await adminVerifyPost(post.id, verified);
    onChange(post.id, { is_verified: verified });
    setMenuOpen(false);
  }

  async function removeOrRestore() {
    if (post.removed_at) {
      await adminRestorePost(post.id);
      onChange(post.id, { removed_at: null, removed_reason: null });
    } else {
      const reason = window.prompt('Reason for removing this post?') ?? '';
      await adminRemovePost(post.id, reason);
      onChange(post.id, { removed_at: new Date().toISOString(), removed_reason: reason });
    }
    setMenuOpen(false);
  }

  async function unpin() {
    await adminUnpinPost(post.id);
    onChange(post.id, { pinned_rank: null, pinned_until: null });
    setMenuOpen(false);
  }

  async function warnAuthor() {
    const reason = window.prompt(`Reason for warning ${author?.display_name ?? 'this user'}?`);
    if (!reason) return;
    await adminWarnUser(post.author_id, reason);
    setMenuOpen(false);
  }

  return (
    <article className={cn('fp', post.removed_at && 'dim')} data-post-id={post.id}>
      {post.removed_at && (
        <div className="fp-flag">Removed by admin{post.removed_reason ? `: ${post.removed_reason}` : ''}</div>
      )}

      <div className="fp-ph">
        <div className="fp-av" style={{ background: avatarBg }} aria-hidden="true">
          {official ? <WebLoopMark /> : author?.avatar_url ? <img src={author.avatar_url} alt="" /> : initials(author?.display_name ?? '?')}
        </div>
        <div className="min-w-0">
          <div className="fp-name">
            <span>{author?.display_name}</span>
            {official ? <VerifiedBadge size={15} label /> : post.is_verified && <BadgeCheck aria-label="Verified" />}
          </div>
          <div className="fp-sub">
            {roleLine} · {relativeDate(post.created_at)}
            {post.edited_at && ' · Edited'}
          </div>
        </div>
        {post.pinned_shown && isActivePin(post) && (
          <span className="fp-pill pin"><Pin size={11} /> Pinned</span>
        )}
        {post.visibility === 'students_only' && (
          <span className="fp-pill lock"><Lock size={11} /> Students only</span>
        )}
      </div>

      <div className="fp-pb">
        <h3>{post.title}</h3>
        {post.body && <p>{post.body}</p>}
      </div>

      {post.tags.length > 0 ? (
        <div className="fp-tags">
          {post.tags.map((t) => (
            <button key={t} type="button" onClick={() => onTagClick?.(t)} className="fp-tag">
              #{t}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ height: 12 }} />
      )}

      {(post.post_type === 'guide' || (post.post_type === 'pictures' && post.images)) && (
        <div className="fp-media">
          {post.post_type === 'guide' && (
            <GuidePlayer
              post={post}
              isActive={isPlaying}
              onOpen={playGuide}
              onClose={() => onPlayGuide(null)}
              viewerProfileId={viewerProfileId}
              liked={!!post.viewer_liked}
              onLikeToggle={toggleLike}
              tried={!!post.viewer_tried}
              onTried={() => onChange(post.id, { viewer_tried: true, try_count: tries + 1 })}
            />
          )}
          {post.post_type === 'pictures' && post.images && (
            <PictureCarousel images={post.images} liked={!!post.viewer_liked} onDoubleTapLike={toggleLike} />
          )}
        </div>
      )}

      <div className="fp-acts">
        <ActionButton
          icon={<ThumbsUp fill={post.viewer_liked ? 'currentColor' : 'none'} />}
          label={likes}
          active={post.viewer_liked}
          onClick={toggleLike}
          ariaLabel={post.viewer_liked ? 'Unlike' : 'Like'}
        />
        <ActionButton icon={<MessageCircle />} label={comments} onClick={() => setCommentsOpen((v) => !v)} ariaLabel="Comments" />
        <ActionButton
          icon={<Bookmark fill={post.viewer_bookmarked ? 'currentColor' : 'none'} />}
          label=""
          active={post.viewer_bookmarked}
          onClick={toggleBookmark}
          ariaLabel={post.viewer_bookmarked ? 'Remove from saved' : 'Save'}
        />
        {post.post_type === 'guide' ? (
          <>
            <button type="button" className={cn('fp-tried', post.viewer_tried && 'on')} onClick={markTried} disabled={trying} aria-pressed={!!post.viewer_tried}>
              <Check size={14} /> <span className="lbl">{post.viewer_tried ? 'Tried' : 'I tried this'} · </span>{tries}
            </button>
            <span className="fp-views">{views.toLocaleString('en')} views</span>
          </>
        ) : (
          <span className="fp-sp" />
        )}
        <div className="fp-mw" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="fp-a"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal />
          </button>
          {menuOpen && (
            <div className="fp-menu" role="menu">
              {onEdit || onDelete ? (
                <>
                  {onEdit && <MenuItem icon={<Pencil size={14} />} label="Edit" onClick={() => { onEdit(post); setMenuOpen(false); }} />}
                  {onDelete && (
                    <MenuItem icon={<Trash2 size={14} />} label="Delete" danger onClick={() => { onDelete(post); setMenuOpen(false); }} />
                  )}
                </>
              ) : (
                <>
                  <MenuItem
                    icon={<ThumbsDown size={14} />}
                    label={post.viewer_not_helpful ? 'Marked not helpful' : 'Not helpful'}
                    onClick={async () => {
                      if (requireAuth() || !viewerProfileId) return;
                      const next = !post.viewer_not_helpful;
                      onChange(post.id, { viewer_not_helpful: next });
                      await setReaction(post.id, viewerProfileId, 'not_helpful', next);
                      setMenuOpen(false);
                    }}
                  />
                  <ReportMenuItem postId={post.id} viewerProfileId={viewerProfileId} isGuest={isGuest} onRequireAuth={onRequireAuth} onDone={() => setMenuOpen(false)} icon={<Flag size={14} />} />
                  {isAdmin && (
                    <>
                      <hr />
                      {!post.is_verified ? (
                        <MenuItem icon={<ShieldCheck size={14} />} label="Mark as verified" onClick={() => markVerified(true)} />
                      ) : (
                        <MenuItem icon={<ShieldOff size={14} />} label="Unverify" onClick={() => markVerified(false)} />
                      )}
                      {!post.removed_at && (
                        <MenuItem icon={<Pin size={14} />} label={isActivePin(post) ? 'Change pin…' : 'Pin to top…'} onClick={() => { setPinOpen(true); setMenuOpen(false); }} />
                      )}
                      {isActivePin(post) && <MenuItem icon={<PinOff size={14} />} label="Unpin" onClick={unpin} />}
                      <MenuItem
                        icon={<Shield size={14} />}
                        label={post.removed_at ? 'Restore post' : 'Remove post'}
                        danger={!post.removed_at}
                        onClick={removeOrRestore}
                      />
                      <MenuItem icon={<ShieldOff size={14} />} label={`Warn ${author?.display_name ?? 'user'}`} danger onClick={warnAuthor} />
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {pinOpen && <PinPostDialog post={post} onClose={() => setPinOpen(false)} onPinned={(patch) => onChange(post.id, patch)} />}

      <CommentsSection
        post={post}
        viewerProfileId={viewerProfileId}
        isGuest={isGuest}
        expanded={commentsOpen}
        onToggle={() => setCommentsOpen((v) => !v)}
        onRequireAuth={onRequireAuth}
        onCommentCountChange={(delta) => onChange(post.id, { comment_count: comments + delta })}
      />
    </article>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string | number;
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const [bump, setBump] = useState(0);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={() => {
        setBump((b) => b + 1);
        onClick();
      }}
      className={cn('fp-a', active && 'on')}
    >
      <span key={bump} className={bump > 0 ? 'feed-bump inline-flex' : 'inline-flex'}>
        {icon}
      </span>
      {label !== '' && label}
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cn(danger && 'red')}>
      {icon}
      {label}
    </button>
  );
}
