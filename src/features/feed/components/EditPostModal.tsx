import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { FEED_TAGS, MAX_POST_TAGS, type FeedTag } from '../constants';
import { updatePost } from '../services/feedApi';
import type { Post, PostVisibility } from '../types';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSaved: (patch: Partial<Post>) => void;
}

/** Scoped to the fields that don't require re-uploading media (title,
 * description, topics, visibility) — steps/images are set at publish time;
 * reworking a guide's steps or a carousel's images belongs in a future pass. */
export function EditPostModal({ post, onClose, onSaved }: EditPostModalProps) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? '');
  const [tags, setTags] = useState<FeedTag[]>(post.tags);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: FeedTag) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_POST_TAGS) return prev;
      return [...prev, tag];
    });
  }

  async function save() {
    if (!title.trim()) return setError('Title is required');
    if (tags.length === 0) return setError('Pick at least 1 topic');
    setSaving(true);
    try {
      await updatePost(post.id, { title: title.trim(), body: body.trim() || null, tags, visibility });
      onSaved({ title: title.trim(), body: body.trim() || null, tags, visibility, edited_at: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="surface-raised w-full max-w-md p-6 shadow-card animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h3 className="heading text-lg">Edit post</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-4 w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white focus:border-accent-400/40 focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white focus:border-accent-400/40 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FEED_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn('chip transition-colors', tags.includes(tag) && 'border-accent-400/50 bg-accent-500/15 text-accent-200')}
            >
              {tags.includes(tag) && <Check size={11} />}
              {tag}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility('everyone')}
            className={cn('rounded-lg border p-2.5 text-sm', visibility === 'everyone' ? 'border-accent-400/50 bg-accent-500/10 text-white' : 'border-white/10 text-slate-400')}
          >
            Everyone
          </button>
          <button
            type="button"
            onClick={() => setVisibility('students_only')}
            className={cn('rounded-lg border p-2.5 text-sm', visibility === 'students_only' ? 'border-accent-400/50 bg-accent-500/10 text-white' : 'border-white/10 text-slate-400')}
          >
            Students only
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-signal-rose">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}
