import { useRef, useState } from 'react';
import { Check, Code2, FileText, Image as ImageIcon, Lock, Plus, Terminal, Trash2, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { FEED_TAGS, MAX_POST_IMAGES, MAX_POST_TAGS, MIN_GUIDE_STEPS, type FeedTag } from '../constants';
import { cropToSquareWebp, pointToPercent, resizeToWebp } from '../utils/image';
import { parseWriteIt } from '../utils/writeItParser';
import { addPostImages, createPost, getPostImageUrl, updatePost, uploadPostImage } from '../services/feedApi';
import type { GuideStep, Post, PostType, PostVisibility } from '../types';

type ComposerMode = 'steps' | 'write' | 'pictures' | 'text';

interface DraftStep {
  localId: string;
  type: GuideStep['type'];
  title: string;
  cmd: string;
  code: string;
  text: string;
  file: File | null;
  previewUrl: string | null;
  hotspot: { x: number; y: number } | null;
  callout: string;
}

function newDraftStep(type: GuideStep['type']): DraftStep {
  return { localId: `${Date.now()}-${Math.random()}`, type, title: '', cmd: '', code: '', text: '', file: null, previewUrl: null, hotspot: null, callout: '' };
}

interface DraftPic {
  localId: string;
  file: File;
  previewUrl: string;
  caption: string;
}

interface PostComposerProps {
  onClose: () => void;
  onPublished: (post: Post) => void;
}

export function PostComposer({ onClose, onPublished }: PostComposerProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<ComposerMode>('steps');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<FeedTag[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>('everyone');
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([newDraftStep('terminal')]);
  const [writeText, setWriteText] = useState('');
  const [pics, setPics] = useState<DraftPic[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picInputRef = useRef<HTMLInputElement>(null);

  function toggleTag(tag: FeedTag) {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_POST_TAGS) {
        setError(`Up to ${MAX_POST_TAGS} topics`);
        return prev;
      }
      return [...prev, tag];
    });
  }

  function addStep(type: GuideStep['type']) {
    setDraftSteps((prev) => [...prev, newDraftStep(type)]);
  }
  function removeStep(localId: string) {
    setDraftSteps((prev) => prev.filter((s) => s.localId !== localId));
  }
  function patchStep(localId: string, patch: Partial<DraftStep>) {
    setDraftSteps((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  }

  function onPicsSelected(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_POST_IMAGES - pics.length;
    const toAdd = Array.from(files).slice(0, remaining);
    toAdd.forEach((file) => {
      setPics((prev) => [...prev, { localId: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), caption: '' }]);
    });
  }

  function buildStepsFromDrafts(): GuideStep[] {
    return draftSteps.map((s): GuideStep => {
      if (s.type === 'terminal') return { type: 'terminal', title: s.title || 'Run this', cmd: s.cmd, out: ['✓ done'] };
      if (s.type === 'code') return { type: 'code', title: s.title || 'Code', code: s.code };
      if (s.type === 'screenshot') return { type: 'screenshot', title: s.title || 'Screenshot', imagePath: '', hotspot: s.hotspot ?? undefined, callout: s.callout || undefined };
      return { type: 'tip', title: s.title || 'Tip', text: s.text };
    });
  }

  async function publish() {
    setError(null);
    if (!profile || !user) return;
    if (!title.trim()) return setError('Title is required');
    if (tags.length === 0) return setError('Pick at least 1 topic');

    let post_type: PostType = 'text';
    let steps: GuideStep[] = [];
    if (mode === 'steps' || mode === 'write') {
      post_type = 'guide';
      steps = mode === 'write' ? parseWriteIt(writeText) : buildStepsFromDrafts();
      if (steps.length < MIN_GUIDE_STEPS) return setError(`Guides need at least ${MIN_GUIDE_STEPS} steps`);
    } else if (mode === 'pictures') {
      post_type = 'pictures';
      if (pics.length === 0) return setError('Add at least 1 picture');
    }

    setPublishing(true);
    try {
      const post = await createPost({
        author_id: profile.id,
        post_type,
        visibility,
        title: title.trim(),
        body: body.trim() || null,
        steps,
        tags,
      });

      if (post_type === 'guide' && mode === 'steps') {
        const screenshotSteps = draftSteps.filter((s) => s.type === 'screenshot' && s.file);
        if (screenshotSteps.length > 0) {
          const finalSteps = [...steps];
          for (let i = 0; i < draftSteps.length; i++) {
            const d = draftSteps[i];
            if (d.type === 'screenshot' && d.file) {
              const blob = await resizeToWebp(d.file);
              const path = await uploadPostImage(user.id, post.id, i, blob);
              finalSteps[i] = { ...(finalSteps[i] as Extract<GuideStep, { type: 'screenshot' }>), imagePath: getPostImageUrl(path) };
            }
          }
          await updatePost(post.id, { steps: finalSteps });
          post.steps = finalSteps;
        }
      }

      if (post_type === 'pictures') {
        const images = [];
        for (let i = 0; i < pics.length; i++) {
          const blob = await cropToSquareWebp(pics[i].file);
          const path = await uploadPostImage(user.id, post.id, i, blob);
          images.push({ path, position: i, caption: pics[i].caption || null });
        }
        await addPostImages(post.id, images);
        post.images = images.map((img, i) => ({ id: `${i}`, post_id: post.id, ...img, created_at: new Date().toISOString() }));
      }

      post.author = profile;
      onPublished(post);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again');
    } finally {
      setPublishing(false);
    }
  }

  const showVisibility = profile?.creator_type === 'student' || profile?.creator_type === 'team';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="surface-raised flex max-h-[90vh] w-full max-w-xl flex-col shadow-card animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-white/5 p-5">
          <h3 className="heading text-lg">New post</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
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

          <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl bg-ink-900/60 p-1">
            {(
              [
                { value: 'steps', label: 'Steps', icon: Terminal },
                { value: 'write', label: 'Write it', icon: FileText },
                { value: 'pictures', label: 'Pictures', icon: ImageIcon },
                { value: 'text', label: 'Text', icon: FileText },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
                  mode === m.value ? 'bg-accent-500/15 text-accent-200' : 'text-slate-400 hover:text-slate-200',
                )}
              >
                <m.icon size={15} />
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {mode === 'steps' && (
              <div className="flex flex-col gap-3">
                {draftSteps.map((step) => (
                  <StepEditorCard key={step.localId} step={step} onPatch={(p) => patchStep(step.localId, p)} onRemove={() => removeStep(step.localId)} />
                ))}
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => addStep('terminal')} className="chip"><Plus size={11} /> Terminal</button>
                  <button type="button" onClick={() => addStep('code')} className="chip"><Plus size={11} /> Code</button>
                  <button type="button" onClick={() => addStep('screenshot')} className="chip"><Plus size={11} /> Screenshot</button>
                  <button type="button" onClick={() => addStep('tip')} className="chip"><Plus size={11} /> Tip</button>
                </div>
              </div>
            )}

            {mode === 'write' && (
              <div>
                <textarea
                  value={writeText}
                  onChange={(e) => setWriteText(e.target.value)}
                  rows={8}
                  placeholder={'Install the CLI:\n$ npm install -g webloop\nThen start it:\n$ webloop start'}
                  className="w-full resize-none rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-accent-400/40 focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-slate-500">Lines starting with $ become terminal steps; other lines become tips.</p>
              </div>
            )}

            {mode === 'pictures' && (
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {pics.map((p) => (
                    <div key={p.localId} className="relative">
                      <img src={p.previewUrl} className="aspect-square w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setPics((prev) => prev.filter((x) => x.localId !== p.localId))}
                        className="absolute right-1 top-1 rounded-full bg-ink-950/80 p-1 text-white"
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                      <input
                        value={p.caption}
                        onChange={(e) => setPics((prev) => prev.map((x) => (x.localId === p.localId ? { ...x, caption: e.target.value } : x)))}
                        placeholder="Caption"
                        className="mt-1 w-full rounded-md border border-white/10 bg-ink-900/60 px-2 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  {pics.length < MAX_POST_IMAGES && (
                    <button
                      type="button"
                      onClick={() => picInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/15 text-slate-500 hover:border-white/30 hover:text-slate-300"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
                <input ref={picInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPicsSelected(e.target.files)} />
                <p className="mt-1.5 text-xs text-slate-500">Up to {MAX_POST_IMAGES} images, cropped to square automatically.</p>
              </div>
            )}
          </div>

          {showVisibility && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('everyone')}
                className={cn('rounded-lg border p-3 text-left text-sm', visibility === 'everyone' ? 'border-accent-400/50 bg-accent-500/10 text-white' : 'border-white/10 text-slate-400')}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setVisibility('students_only')}
                className={cn('rounded-lg border p-3 text-left text-sm', visibility === 'students_only' ? 'border-accent-400/50 bg-accent-500/10 text-white' : 'border-white/10 text-slate-400')}
              >
                <Lock size={13} className="mb-1" /> Students only
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-signal-rose">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-white/5 p-5">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={publish} disabled={publishing} className="flex-1">
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepEditorCard({ step, onPatch, onRemove }: { step: DraftStep; onPatch: (p: Partial<DraftStep>) => void; onRemove: () => void }) {
  const shotRef = useRef<HTMLDivElement>(null);

  function onShotClick(e: React.MouseEvent) {
    if (!shotRef.current) return;
    onPatch({ hotspot: pointToPercent({ clientX: e.clientX, clientY: e.clientY }, shotRef.current.getBoundingClientRect()) });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-ink-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {step.type === 'terminal' && <Terminal size={12} />}
          {step.type === 'code' && <Code2 size={12} />}
          {step.type === 'screenshot' && <ImageIcon size={12} />}
          {step.type}
        </span>
        <button type="button" onClick={onRemove} className="text-xs text-slate-500 hover:text-signal-rose">
          <Trash2 size={13} />
        </button>
      </div>

      {step.type !== 'screenshot' && (
        <input
          value={step.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Step title"
          className="mb-2 w-full rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      )}

      {step.type === 'terminal' && (
        <input
          value={step.cmd}
          onChange={(e) => onPatch({ cmd: e.target.value })}
          placeholder="$ command"
          className="w-full rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      )}

      {step.type === 'code' && (
        <textarea
          value={step.code}
          onChange={(e) => onPatch({ code: e.target.value })}
          rows={4}
          placeholder="Paste code…"
          className="w-full resize-none rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 font-mono text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      )}

      {step.type === 'tip' && (
        <textarea
          value={step.text}
          onChange={(e) => onPatch({ text: e.target.value })}
          rows={2}
          placeholder="Tip text"
          className="w-full resize-none rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      )}

      {step.type === 'screenshot' && (
        <div>
          <input
            value={step.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Step title"
            className="mb-2 w-full rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          {!step.previewUrl ? (
            <label className="flex h-28 cursor-pointer items-center justify-center rounded-md border border-dashed border-white/15 text-xs text-slate-500 hover:border-white/30">
              Choose a screenshot
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPatch({ file, previewUrl: URL.createObjectURL(file) });
                }}
              />
            </label>
          ) : (
            <div ref={shotRef} onClick={onShotClick} className="relative cursor-crosshair overflow-hidden rounded-md">
              <img src={step.previewUrl} className="block w-full" />
              {step.hotspot && (
                <span
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400 ring-2 ring-white"
                  style={{ left: `${step.hotspot.x}%`, top: `${step.hotspot.y}%` }}
                />
              )}
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-500">Tap the screenshot to place the highlight.</p>
          <input
            value={step.callout}
            onChange={(e) => onPatch({ callout: e.target.value })}
            placeholder="Callout text (optional)"
            className="mt-2 w-full rounded-md border border-white/10 bg-ink-900/60 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
