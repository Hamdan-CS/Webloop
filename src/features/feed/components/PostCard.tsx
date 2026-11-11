import { useRef, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Flag,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldOff,
  ThumbsDown,
  Trash2,
  Heart,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Badge } from '@/components/shared/ui/Badge';
import { GlassCard } from '@/design-system';
import { creatorTypeLabel, relativeDate } from '@/utils/labels';
import { GuidePlayer } from './GuidePlayer';
import { PictureCarousel } from './PictureCarousel';
import { CommentsSection } from './CommentsSection';
import { ReportMenuItem } from './ReportSheet';
import { adminRemovePost, adminRestorePost, adminVerifyPost, adminWarnUser, recordGuideView, setBookmark, setReaction } from '../services/feedApi';
import type { Post } from '../types';

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
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const author = post.author;
  const isPlaying = playingGuideId === post.id;

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
    onChange(post.id, { viewer_liked: next, like_count: post.like_count + (next ? 1 : -1) });
    await setReaction(post.id, viewerProfileId, 'like', next);
  }

  async function toggleBookmark() {
    if (requireAuth() || !viewerProfileId) return;
    const next = !post.viewer_bookmarked;
    onChange(post.id, { viewer_bookmarked: next, bookmark_count: post.bookmark_count + (next ? 1 : -1) });
    await setBookmark(post.id, viewerProfileId, next);
  }

  async function playGuide() {
    if (requireAuth()) return;
    onPlayGuide(post.id);
    if (viewerProfileId) {
      onChange(post.id, { view_count: post.view_count + 1 });
      await recordGuideView(post.id, viewerProfileId);
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

  async function warnAuthor() {
    const reason = window.prompt(`Reason for warning ${author?.display_name ?? 'this user'}?`);
    if (!reason) return;
    await adminWarnUser(post.author_id, reason);
    setMenuOpen(false);
  }

  return (
    <GlassCard raised className="overflow-hidden">
      {post.removed_at && (
        <div className="bg-signal-rose/10 px-5 py-2 text-xs font-medium text-signal-rose">
          Removed by admin{post.removed_reason ? `: ${post.removed_reason}` : ''}
        </div>
      )}

      <div className="flex items-center gap-3 p-5 pb-3">
        <Avatar src={author?.avatar_url} name={author?.display_name ?? '?'} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-white">{author?.display_name}</p>
            {post.is_verified && <CheckCircle2 size={14} className="shrink-0 text-accent-400" />}
          </div>
          <p className="text-xs text-slate-500">
            {author && creatorTypeLabel[author.creator_type]} · {relativeDate(post.created_at)}
            {post.edited_at && ' · Edited'}
          </p>
        </div>
        {post.visibility === 'students_only' && (
          <Badge tone="accent" className="shrink-0">
            <Lock size={11} /> Students only
          </Badge>
        )}
      </div>

      <div className="px-5 pb-3">
        <h3 className="text-base font-semibold text-white">{post.title}</h3>
        {post.body && <p className="mt-1 text-sm leading-relaxed text-slate-300">{post.body}</p>}
      </div>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
          {post.tags.map((t) => (
            <button key={t} type="button" onClick={() => onTagClick?.(t)} className="chip transition-colors hover:border-accent-400/40">
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 pb-4">
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
            onTried={() => onChange(post.id, { viewer_tried: true, try_count: post.try_count + 1 })}
          />
        )}
        {post.post_type === 'pictures' && post.images && (
          <PictureCarousel images={post.images} liked={!!post.viewer_liked} onDoubleTapLike={toggleLike} />
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-white/5 px-3 py-2">
        <FooterButton
          icon={<Heart size={16} className={post.viewer_liked ? 'fill-signal-rose text-signal-rose' : ''} />}
          label={post.like_count}
          active={post.viewer_liked}
          onClick={toggleLike}
        />
        <FooterButton icon={<MessageCircle size={16} />} label={post.comment_count} onClick={() => setCommentsOpen((v) => !v)} />
        <FooterButton
          icon={<Bookmark size={16} className={post.viewer_bookmarked ? 'fill-accent-400 text-accent-400' : ''} />}
          label={post.bookmark_count || ''}
          active={post.viewer_bookmarked}
          onClick={toggleBookmark}
        />
        {post.post_type === 'guide' && (
          <span className="ml-auto flex items-center gap-1 pr-1 text-xs text-slate-500">
            {post.try_count} tried · {post.view_count} views
          </span>
        )}
        <div className="relative ml-auto" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200"
            aria-label="More options"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute bottom-full right-0 z-10 mb-1 w-52 animate-fade-in-up rounded-xl border border-white/10 bg-ink-900/95 p-1.5 shadow-card backdrop-blur-md"
              onMouseLeave={() => setMenuOpen(false)}
            >
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
                    label="Not helpful"
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
                      <div className="my-1 h-px bg-white/10" />
                      {!post.is_verified ? (
                        <MenuItem icon={<ShieldCheck size={14} />} label="Mark as verified" onClick={() => markVerified(true)} />
                      ) : (
                        <MenuItem icon={<ShieldOff size={14} />} label="Unverify" onClick={() => markVerified(false)} />
                      )}
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

      <CommentsSection
        post={post}
        viewerProfileId={viewerProfileId}
        isGuest={isGuest}
        expanded={commentsOpen}
        onToggle={() => setCommentsOpen((v) => !v)}
        onRequireAuth={onRequireAuth}
        onCommentCountChange={(delta) => onChange(post.id, { comment_count: post.comment_count + delta })}
      />
    </GlassCard>
  );
}

function FooterButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string | number;
  active?: boolean;
  onClick: () => void;
}) {
  const [bump, setBump] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        setBump((b) => b + 1);
        onClick();
      }}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5',
        active ? 'text-white' : 'text-slate-400',
      )}
    >
      <span key={bump} className={bump > 0 ? 'feed-bump' : ''}>
        {icon}
      </span>
      {label !== '' && label}
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5',
        danger ? 'text-signal-rose' : 'text-slate-300',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
