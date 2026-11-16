import { useState } from 'react';
import { Check, Link2, SlidersHorizontal, Terminal, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { FEED_TAGS, MAX_POST_TAGS, type FeedTag } from '../constants';
import { getPostImageUrl, updatePost, updatePostImage } from '../services/feedApi';
import type { Post, PostImage, PostVisibility } from '../types';
import { cleanImageDetails, hasDetails, linkError, type ImageDetailsDraft } from '../imageDetails';
import { ImageDetailsEditor } from './ImageDetailsEditor';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSaved: (patch: Partial<Post>) => void;
}

/** Scoped to the fields that don't require re-uploading media (title,
 * description, topics, visibility, and each picture's caption / command /
 * link). Steps and the image files themselves are set at publish time. */
export function EditPostModal({ post, onClose, onSaved }: EditPostModalProps) {
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? '');
  const [tags, setTags] = useState<FeedTag[]>(post.tags);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
  const images = post.post_type === 'pictures' ? post.images ?? [] : [];
  const toDraft = (img: PostImage): ImageDetailsDraft => ({
    caption: img.caption ?? '', command: img.command ?? '', link_url: img.link_url ?? '', link_label: img.link_label ?? '',
  });
  const [details, setDetails] = useState<Record<string, ImageDetailsDraft>>(() => Object.fromEntries(images.map((img) => [img.id, toDraft(img)])));
  const [openImg, setOpenImg] = useState<string | null>(null);
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
    const bad = images.findIndex((img) => linkError(details[img.id]?.link_url ?? ''));
    if (bad >= 0) {
      setOpenImg(images[bad].id);
      return setError(`Image ${bad + 1}: ${linkError(details[images[bad].id].link_url)}`);
    }
    setSaving(true);
    try {
      await updatePost(post.id, { title: title.trim(), body: body.trim() || null, tags, visibility });
      // only images whose details changed
      const nextImages: PostImage[] = [];
      for (const img of images) {
        const clean = cleanImageDetails(details[img.id]);
        const before = cleanImageDetails(toDraft(img));
        if (JSON.stringify(clean) !== JSON.stringify(before)) await updatePostImage(img.id, clean);
        nextImages.push({ ...img, ...clean });
      }
      onSaved({
        title: title.trim(), body: body.trim() || null, tags, visibility, edited_at: new Date().toISOString(),
        ...(images.length ? { images: nextImages } : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="surface-raised max-h-[92vh] w-full max-w-md overflow-y-auto p-6 shadow-card animate-fade-in-up">
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
        {images.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-slate-400">Pictures: caption, terminal command and link</p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => {
                const has = hasDetails(details[img.id] ?? {});
                const on = openImg === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setOpenImg(on ? null : img.id)}
                    aria-expanded={on}
                    aria-label={`${has.command || has.link ? 'Edit' : 'Add'} details for image ${i + 1}`}
                    className={cn('relative h-16 w-16 overflow-hidden rounded-lg border-2', on ? 'border-accent-400' : 'border-transparent')}
                  >
                    <img src={getPostImageUrl(img.path)} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink-950/70 py-0.5 text-white">
                      {has.command && <Terminal size={11} />}
                      {has.link && <Link2 size={11} />}
                      {!has.command && !has.link && <SlidersHorizontal size={11} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {openImg && details[openImg] && (
              <div className="mt-2">
                <ImageDetailsEditor
                  index={images.findIndex((x) => x.id === openImg)}
                  previewUrl={getPostImageUrl(images.find((x) => x.id === openImg)!.path)}
                  value={details[openImg]}
                  showLinkError
                  onChange={(d) => setDetails((prev) => ({ ...prev, [openImg]: d }))}
                />
              </div>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-signal-rose">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}
