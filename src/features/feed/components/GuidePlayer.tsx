import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Play, RotateCcw, ThumbsUp, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { MEDIA_BOX_HEIGHT, SWIPE_THRESHOLD_PX } from '../constants';
import type { GuideStep, Post } from '../types';
import { fetchProfileProjects } from '@/services/api';
import { linkTryToProject, recordTry } from '../services/feedApi';

interface GuidePlayerProps {
  post: Post;
  isActive: boolean;
  onOpen: () => void;
  onClose: () => void;
  viewerProfileId: string | null;
  liked: boolean;
  onLikeToggle: () => void;
  tried: boolean;
  onTried: () => void;
}

export function GuidePlayer({ post, isActive, onOpen, onClose, viewerProfileId, liked, onLikeToggle, tried, onTried }: GuidePlayerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const steps = post.steps;

  useEffect(() => {
    if (isActive) setStepIndex(0);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, steps.length));
      else if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isActive, steps.length, onClose]);

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="feed-terminal group relative flex w-full flex-col justify-between rounded-xl p-5 text-left transition-transform active:scale-[0.99]"
        style={{ height: MEDIA_BOX_HEIGHT }}
      >
        <ol className="space-y-1.5 text-sm text-white/70">
          {steps.slice(0, 4).map((s, i) => (
            <li key={i} className="truncate">
              <span className="text-white/40">{i + 1}.</span> {s.title}
            </li>
          ))}
          {steps.length > 4 && <li className="text-white/40">+{steps.length - 4} more</li>}
        </ol>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-500 text-ink-950 shadow-glow transition-transform group-hover:scale-105">
            <Play size={20} fill="currentColor" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Play the guide</p>
            <p className="text-xs text-white/50">{steps.length} steps</p>
          </div>
        </div>
      </button>
    );
  }

  const atEnd = stepIndex >= steps.length;

  return (
    <div
      className="feed-terminal relative flex flex-col justify-between overflow-hidden rounded-xl p-4"
      style={{ height: MEDIA_BOX_HEIGHT }}
    >
      {atEnd ? (
        <FinishScreen
          post={post}
          liked={liked}
          onLikeToggle={onLikeToggle}
          tried={tried}
          onTried={onTried}
          onClose={onClose}
          onReplay={() => setStepIndex(0)}
          viewerProfileId={viewerProfileId}
        />
      ) : (
        <StepView
          key={stepIndex}
          step={steps[stepIndex]}
          stepIndex={stepIndex}
          stepCount={steps.length}
          onClose={onClose}
          onJump={setStepIndex}
          onBack={() => setStepIndex((i) => Math.max(i - 1, 0))}
          onNext={() => setStepIndex((i) => Math.min(i + 1, steps.length))}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

function StepView({
  step,
  stepIndex,
  stepCount,
  onClose,
  onJump,
  onBack,
  onNext,
  reducedMotion,
}: {
  step: GuideStep;
  stepIndex: number;
  stepCount: number;
  onClose: () => void;
  onJump: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
  reducedMotion: boolean;
}) {
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onNext();
      else onBack();
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="feed-dots flex flex-1 items-center gap-1.5 overflow-x-auto">
          {Array.from({ length: stepCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
                i < stepIndex && 'border-accent-400 bg-accent-500 text-ink-950',
                i === stepIndex && 'border-accent-400 text-accent-300',
                i > stepIndex && 'border-white/15 text-white/40',
              )}
            >
              {i < stepIndex ? <Check size={12} /> : i + 1}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close guide" className="rounded-full p-1.5 text-white/50 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-white">{step.title}</p>
        <p className="text-xs text-white/40">
          Step {stepIndex + 1} of {stepCount}
        </p>
      </div>

      <div
        className="mt-3 flex-1 touch-pan-y overflow-auto"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <StepContent step={step} reducedMotion={reducedMotion} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onBack} disabled={stepIndex === 0}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => onJump(stepIndex)} aria-label="Replay this step">
          <RotateCcw size={14} />
        </Button>
        <Button size="sm" onClick={onNext}>
          {stepIndex === stepCount - 1 ? 'Finish' : 'Next'} <ArrowRight size={14} />
        </Button>
      </div>
    </>
  );
}

function StepContent({ step, reducedMotion }: { step: GuideStep; reducedMotion: boolean }) {
  if (step.type === 'terminal') return <TerminalStepContent step={step} reducedMotion={reducedMotion} />;
  if (step.type === 'code') return <CodeStepContent step={step} reducedMotion={reducedMotion} />;
  if (step.type === 'screenshot') return <ScreenshotStepContent step={step} reducedMotion={reducedMotion} />;
  return <p className="text-sm leading-relaxed text-white/80">{step.text}</p>;
}

function TerminalStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'terminal' }>; reducedMotion: boolean }) {
  const [typed, setTyped] = useState(reducedMotion ? step.cmd : '');
  const [visibleOut, setVisibleOut] = useState(reducedMotion ? step.out.length : 0);

  useEffect(() => {
    if (reducedMotion) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(step.cmd.slice(0, i));
      if (i >= step.cmd.length) {
        clearInterval(interval);
        step.out.forEach((_, idx) => {
          setTimeout(() => setVisibleOut((v) => Math.max(v, idx + 1)), 400 + idx * 350);
        });
      }
    }, 30);
    return () => clearInterval(interval);
  }, [step, reducedMotion]);

  return (
    <div className="font-mono text-[13px] leading-relaxed text-[var(--feed-term-ink)]">
      <div>
        <span className="text-white/40">$</span> {typed}
        {typed.length < step.cmd.length && !reducedMotion && <span className="feed-caret">▍</span>}
      </div>
      {step.out.slice(0, visibleOut).map((line, i) => (
        <div key={i} className="opacity-70">
          {line}
        </div>
      ))}
    </div>
  );
}

function CodeStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'code' }>; reducedMotion: boolean }) {
  const lines = step.code.split('\n');
  const highlightLines = useMemo(() => step.highlightLines ?? [], [step.highlightLines]);
  const [active, setActive] = useState<number | null>(reducedMotion ? null : highlightLines[0] ?? null);

  useEffect(() => {
    if (reducedMotion || highlightLines.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % highlightLines.length;
      setActive(highlightLines[i]);
    }, 650);
    return () => clearInterval(interval);
  }, [highlightLines, reducedMotion]);

  return (
    <pre className="feed-code overflow-auto rounded-lg p-3 text-[12.5px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={cn('feed-code-line px-1', (reducedMotion ? highlightLines.includes(i) : active === i) && 'hl')}>
          {line || ' '}
        </div>
      ))}
    </pre>
  );
}

function ScreenshotStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'screenshot' }>; reducedMotion: boolean }) {
  const [moved, setMoved] = useState(reducedMotion);
  const [showCallout, setShowCallout] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const t1 = setTimeout(() => setMoved(true), 250);
    const t2 = setTimeout(() => setShowCallout(true), 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reducedMotion]);

  const hotspot = step.hotspot ?? { x: 50, y: 50 };

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <img src={step.imagePath} alt={step.title} className="block w-full" />
      <div
        className="feed-hotspot absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400"
        style={{
          left: `${moved ? hotspot.x : 50}%`,
          top: `${moved ? hotspot.y : 50}%`,
          transition: reducedMotion ? 'none' : 'left 1.2s cubic-bezier(.4,0,.2,1), top 1.2s cubic-bezier(.4,0,.2,1)',
        }}
      />
      {step.callout && (
        <div
          className="absolute max-w-[70%] rounded-lg bg-ink-950/90 px-3 py-2 text-xs text-white shadow-card transition-all duration-300"
          style={{
            left: `${hotspot.x}%`,
            top: `calc(${hotspot.y}% + 16px)`,
            opacity: showCallout ? 1 : 0,
            transform: showCallout ? 'translateY(0)' : 'translateY(6px)',
          }}
        >
          {step.callout}
        </div>
      )}
    </div>
  );
}

function FinishScreen({
  post,
  liked,
  onLikeToggle,
  tried,
  onTried,
  onClose,
  onReplay,
  viewerProfileId,
}: {
  post: Post;
  liked: boolean;
  onLikeToggle: () => void;
  tried: boolean;
  onTried: () => void;
  onClose: () => void;
  onReplay: () => void;
  viewerProfileId: string | null;
}) {
  const [linking, setLinking] = useState(false);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleTry() {
    if (!viewerProfileId || tried) return;
    setBusy(true);
    try {
      await recordTry(post.id, viewerProfileId, null);
      onTried();
    } finally {
      setBusy(false);
    }
  }

  async function openLinkPicker() {
    if (!viewerProfileId) return;
    setLinking(true);
    const mine = await fetchProfileProjects(viewerProfileId);
    setProjects(mine.map((p) => ({ value: p.id, label: p.title })));
  }

  async function confirmLink() {
    if (!viewerProfileId || !projectId) return;
    await linkTryToProject(post.id, viewerProfileId, projectId);
    setLinking(false);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <button type="button" onClick={onClose} aria-label="Close guide" className="absolute right-3 top-3 rounded-full p-1.5 text-white/50 hover:text-white">
        <X size={16} />
      </button>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-green/15 text-signal-green">
        <Check size={22} />
      </span>
      <div>
        <p className="font-semibold text-white">You finished the guide</p>
        <p className="text-sm text-white/50">
          {post.try_count} {post.try_count === 1 ? 'person' : 'people'} tried this. Did you?
        </p>
      </div>
      {!linking ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant={tried ? 'secondary' : 'primary'} disabled={busy || tried} onClick={handleTry}>
            <Check size={14} /> {tried ? 'You tried this' : 'I tried this'}
          </Button>
          {tried && (
            <Button size="sm" variant="ghost" onClick={openLinkPicker}>
              Link to a project
            </Button>
          )}
          <Button size="sm" variant={liked ? 'secondary' : 'ghost'} onClick={onLikeToggle}>
            <ThumbsUp size={14} /> Helpful?
          </Button>
        </div>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Select
            value={projectId}
            onChange={setProjectId}
            size="sm"
            options={[{ value: '', label: 'Choose a project…' }, ...projects]}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setLinking(false)}>Cancel</Button>
            <Button size="sm" disabled={!projectId} onClick={confirmLink}>Save</Button>
          </div>
        </div>
      )}
      <button type="button" onClick={onReplay} className="text-xs font-medium text-accent-300 hover:text-accent-200">
        Watch again
      </button>
    </div>
  );
}
