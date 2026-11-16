import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Play, RotateCcw, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Select } from '@/components/shared/ui/Select';
import { notify } from '@/utils/notify';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SWIPE_THRESHOLD_PX } from '../constants';
import type { GuideStep, Post } from '../types';
import { fetchProfileProjects } from '@/services/api';
import { linkTryToProject, recordTry } from '../services/feedApi';

/* Guide cover + inline player, styled after Abbas's design demo
   (webloop-posts-demo.html: .guide, .gp, .term, .code, .tip, .gend).
   Colours come from the feed-only --feed-* variables in index.css. */

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
  // bumping this remounts the current step, so "replay" restarts its animation
  const [replayKey, setReplayKey] = useState(0);
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
      <button type="button" onClick={onOpen} className="fp-guide" aria-label={`Play the guide: ${post.title}`}>
        <div className="gl">
          {steps.slice(0, 4).map((s, i) => (
            <div key={i}>
              <span>{i + 1}</span>{'  '}{s.title}
            </div>
          ))}
          {steps.length > 4 && <div style={{ opacity: 0.5 }}>{'   '}+ {steps.length - 4} more</div>}
        </div>
        <div className="gf">
          <span className="play" aria-hidden="true"><Play size={18} fill="currentColor" /></span>
          <span>
            <b>Play the guide</b>
            <small>{steps.length} animated step{steps.length === 1 ? '' : 's'}</small>
          </span>
        </div>
      </button>
    );
  }

  const atEnd = stepIndex >= steps.length;

  return (
    <div className="fp-gp" role="region" aria-label={`Guide: ${post.title}`}>
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
          key={`${stepIndex}-${replayKey}`}
          step={steps[stepIndex]}
          stepIndex={stepIndex}
          stepCount={steps.length}
          onClose={onClose}
          onJump={setStepIndex}
          onBack={() => setStepIndex((i) => Math.max(i - 1, 0))}
          onNext={() => setStepIndex((i) => Math.min(i + 1, steps.length))}
          onReplay={() => setReplayKey((k) => k + 1)}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close guide" className="fp-gp-x">
      <X size={16} />
    </button>
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
  onReplay,
  reducedMotion,
}: {
  step: GuideStep;
  stepIndex: number;
  stepCount: number;
  onClose: () => void;
  onJump: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
  onReplay: () => void;
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
      <div className="fp-gp-top">
        <div className="fp-gp-dots">
          {Array.from({ length: stepCount }).map((_, i) => (
            <span key={i} style={{ display: 'contents' }}>
              {i > 0 && <i className={i <= stepIndex ? 'd' : ''} />}
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === stepIndex ? 'step' : undefined}
                className={i < stepIndex ? 'd' : i === stepIndex ? 'c' : ''}
              >
                {i < stepIndex ? '✓' : i + 1}
              </button>
            </span>
          ))}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <div className="fp-gp-t">
        <b>{step.title}</b>
        <small>
          Step {stepIndex + 1} of {stepCount}
          {step.sub ? ` · ${step.sub}` : ''}
        </small>
      </div>

      <div className="fp-gp-s" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <StepContent step={step} reducedMotion={reducedMotion} />
      </div>

      <div className="fp-gp-n">
        <button type="button" className="fp-btn fp-btn-g" onClick={onBack} disabled={stepIndex === 0}>
          Back
        </button>
        <span className="grow" />
        <button type="button" className="rp" onClick={onReplay} aria-label="Replay this step">
          <RotateCcw size={17} />
        </button>
        <button type="button" className="fp-btn fp-btn-p" onClick={onNext}>
          {stepIndex === stepCount - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </>
  );
}

function StepContent({ step, reducedMotion }: { step: GuideStep; reducedMotion: boolean }) {
  if (step.type === 'terminal') return <TerminalStepContent step={step} reducedMotion={reducedMotion} />;
  if (step.type === 'code') return <CodeStepContent step={step} reducedMotion={reducedMotion} />;
  if (step.type === 'screenshot') return <ScreenshotStepContent step={step} reducedMotion={reducedMotion} />;
  const warn = step.tone === 'warn';
  return (
    <div className={cn('fp-tip', warn && 'w')}>
      <span aria-hidden="true">{warn ? '⚠️' : '💡'}</span>
      <div>{step.text}</div>
    </div>
  );
}

function TerminalStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'terminal' }>; reducedMotion: boolean }) {
  const [typed, setTyped] = useState(reducedMotion ? step.cmd : '');
  const [visibleOut, setVisibleOut] = useState(reducedMotion ? step.out.length : 0);
  const [copied, setCopied] = useState(false);
  const cmdRef = useRef<HTMLSpanElement>(null);
  // the typing animation's timers, so Copy's fallback can stop it and show the whole command
  const stopAnim = useRef<() => void>(() => {});

  useEffect(() => {
    if (reducedMotion) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(step.cmd.slice(0, i));
      if (i >= step.cmd.length) {
        clearInterval(interval);
        step.out.forEach((_, idx) => {
          timers.push(setTimeout(() => setVisibleOut((v) => Math.max(v, idx + 1)), 400 + idx * 350));
        });
      }
    }, 30);
    const stop = () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
    stopAnim.current = stop;
    return stop;
  }, [step, reducedMotion]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(step.cmd);
      setCopied(true);
      notify.success('Copied');
    } catch {
      // copying blocked (http, iframe, permissions): show the full command selected instead
      stopAnim.current();
      setTyped(step.cmd);
      setVisibleOut(step.out.length);
      requestAnimationFrame(() => {
        const node = cmdRef.current;
        if (!node) return;
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      });
      notify.info('Copy is blocked here. The command is selected: press Ctrl+C (⌘C on Mac).');
    }
  }

  const done = typed.length >= step.cmd.length;
  return (
    <div className="fp-term">
      <button type="button" className="fp-copy" onClick={copy} aria-label={`Copy command: ${step.cmd}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <div className="cl">
        <span className="ps">$ </span>
        <span ref={cmdRef}>{typed}</span>
        {!done && !reducedMotion && <span className="fp-caret" aria-hidden="true" />}
      </div>
      {step.out.map((line, i) => (
        <div key={i} className={cn('o', i < visibleOut && 's')}>
          {line}
        </div>
      ))}
    </div>
  );
}

function CodeStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'code' }>; reducedMotion: boolean }) {
  const lines = useMemo(() => step.code.split('\n'), [step.code]);
  const highlightLines = useMemo(() => step.highlightLines ?? [], [step.highlightLines]);
  // demo: each line lights up one after another (or only the chosen lines, when given)
  const order = useMemo(() => (highlightLines.length ? highlightLines : lines.map((_, i) => i)), [highlightLines, lines]);
  const [active, setActive] = useState<number | null>(reducedMotion ? null : order[0] ?? null);

  useEffect(() => {
    if (reducedMotion || order.length === 0) return;
    let k = 0;
    const interval = setInterval(() => {
      k += 1;
      if (k >= order.length) {
        clearInterval(interval);
        setActive(null);
        return;
      }
      setActive(order[k]);
    }, 650);
    return () => clearInterval(interval);
  }, [order, reducedMotion]);

  return (
    <div className="fp-code">
      {lines.map((line, i) => (
        <div key={i} className={cn((reducedMotion ? highlightLines.includes(i) : active === i) && 'h')}>
          {line || ' '}
        </div>
      ))}
    </div>
  );
}

function ScreenshotStepContent({ step, reducedMotion }: { step: Extract<GuideStep, { type: 'screenshot' }>; reducedMotion: boolean }) {
  const [show, setShow] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  const hotspot = step.hotspot ?? { x: 50, y: 50 };

  return (
    <div className="fp-shot">
      <img src={step.imagePath} alt={step.title} />
      <div className={cn('fp-hot', show && 's')} style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }} />
      {step.callout && (
        <div
          className={cn('fp-bub', show && 's')}
          style={{ left: `${Math.max(4, Math.min(hotspot.x - 10, 50))}%`, top: `calc(${hotspot.y}% + 30px)` }}
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
    <>
      <div className="fp-gp-top">
        <span style={{ flex: 1 }} />
        <CloseButton onClose={onClose} />
      </div>
      <div className="fp-gend">
        <span className="ok"><Check size={24} /></span>
        <b>You finished the guide</b>
        <p>
          {post.try_count} {post.try_count === 1 ? 'person' : 'people'} tried this. Did you?
        </p>
        {!linking ? (
          <div className="row">
            <button type="button" className={cn('fp-btn', tried ? 'fp-btn-g' : 'fp-btn-p')} disabled={busy || tried} onClick={handleTry}>
              ✓ {tried ? 'You tried this' : 'I tried this'}
            </button>
            {tried && (
              <button type="button" className="fp-btn fp-btn-g" onClick={openLinkPicker}>
                Link to a project
              </button>
            )}
            <button type="button" className="fp-btn fp-btn-g" onClick={onLikeToggle} aria-pressed={liked}>
              👍 {liked ? 'Helpful' : 'Helpful?'}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
            <Select
              value={projectId}
              onChange={setProjectId}
              size="sm"
              options={[{ value: '', label: 'Choose a project…' }, ...projects]}
            />
            <div className="row">
              <button type="button" className="fp-btn fp-btn-g" onClick={() => setLinking(false)}>Cancel</button>
              <button type="button" className="fp-btn fp-btn-p" disabled={!projectId} onClick={confirmLink}>Save</button>
            </div>
          </div>
        )}
        <button type="button" onClick={onReplay} className="again">
          Watch again
        </button>
      </div>
    </>
  );
}
