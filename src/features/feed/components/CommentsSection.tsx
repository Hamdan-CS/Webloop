import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/shared/ui/Avatar';
import { Button } from '@/components/shared/ui/Button';
import { relativeDate } from '@/utils/labels';
import { addComment, deleteComment, fetchComments } from '../services/feedApi';
import type { Comment, Post } from '../types';

interface CommentsSectionProps {
  post: Post;
  viewerProfileId: string | null;
  isGuest: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRequireAuth: () => void;
  onCommentCountChange: (delta: number) => void;
}

export function CommentsSection({ post, viewerProfileId, isGuest, expanded, onToggle, onRequireAuth, onCommentCountChange }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function expand() {
    onToggle();
    if (expanded) return;
    if (comments === null) {
      setLoading(true);
      try {
        setComments(await fetchComments(post.id));
      } finally {
        setLoading(false);
      }
    }
  }

  async function send() {
    if (isGuest) return onRequireAuth();
    if (!viewerProfileId || !draft.trim()) return;
    setSending(true);
    try {
      const created = await addComment(post.id, viewerProfileId, draft.trim());
      setComments((prev) => [...(prev ?? []), created]);
      setDraft('');
      onCommentCountChange(1);
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    await deleteComment(id);
    setComments((prev) => (prev ?? []).filter((c) => c.id !== id));
    onCommentCountChange(-1);
  }

  return (
    <div className="border-t border-white/5 px-5 py-3">
      {!expanded && post.top_comment && (
        <button type="button" onClick={expand} className="flex w-full items-start gap-2 text-left text-sm">
          <Avatar src={post.top_comment.author?.avatar_url} name={post.top_comment.author?.display_name ?? '?'} size="xs" />
          <span className="text-slate-300">
            <span className="font-medium text-white">{post.top_comment.author?.display_name}</span>{' '}
            {post.top_comment.body}
          </span>
        </button>
      )}
      {post.comment_count > 0 && (
        <button type="button" onClick={expand} className="mt-1.5 text-xs font-medium text-slate-500 hover:text-slate-300">
          {expanded ? 'Hide comments' : `View all ${post.comment_count} comment${post.comment_count === 1 ? '' : 's'}`}
        </button>
      )}

      {expanded && (
        <div className="mt-3 animate-fade-in-up space-y-3">
          {loading && <p className="text-xs text-slate-500">Loading comments…</p>}
          {comments?.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? '?'} size="xs" />
              <div className="flex-1">
                <p className="text-slate-300">
                  <span className="font-medium text-white">{c.author?.display_name}</span> {c.body}
                </p>
                <p className="text-[11px] text-slate-500">
                  {relativeDate(c.created_at)}
                  {c.edited_at && ' · Edited'}
                </p>
              </div>
              {c.author_id === viewerProfileId && (
                <button type="button" onClick={() => remove(c.id)} className="text-slate-500 hover:text-signal-rose" aria-label="Delete comment">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          {isGuest ? (
            <Button size="sm" variant="secondary" onClick={onRequireAuth} className="w-full">
              Join to comment
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Add a comment…"
                className="flex-1 rounded-full border border-white/10 bg-ink-900/60 px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
              />
              <Button size="sm" disabled={sending || !draft.trim()} onClick={send} aria-label="Send comment">
                <Send size={14} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
