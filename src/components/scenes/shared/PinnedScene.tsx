import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/utils/cn';
import type { ProgressListener } from './useScrollEngine';

export interface SceneStep {
  title: string;
  body: string;
  from: number;
  to: number;
}

export function activeStepIndex(steps: SceneStep[], p: number) {
  for (let i = steps.length - 1; i >= 0; i--) if (p >= steps[i].from) return i;
  return 0;
}

interface PinnedSceneProps {
  outerRef: RefObject<HTMLDivElement>;
  stageRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  subscribeProgress: (fn: ProgressListener) => () => void;
  visible: boolean;
  eyebrow: string;
  title: string;
  sub: string;
  steps: SceneStep[];
  hint?: string;
  ariaLabel: string;
  supported: boolean;
  fallback: ReactNode;
  richFallback?: boolean;
  tip?: ReactNode;
  controls?: ReactNode;
  legend?: ReactNode;
  showMeter?: boolean;
  showCaption?: boolean;
  className?: string;
  lengthVh?: number;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll progress drives this UI imperatively (direct DOM writes from the
 * subscribeProgress callback), never via React state — a scene scrolling at
 * 60fps must not trigger a React re-render on every tick. The step <span>
 * bodies are always in the DOM; only a CSS class toggle shows/hides them. */
export function PinnedScene({
  outerRef, stageRef, canvasRef, subscribeProgress, visible, title, sub, steps, hint, ariaLabel,
  supported, fallback, richFallback, tip, controls, legend, showMeter = true, showCaption = true, className, lengthVh = 480,
}: PinnedSceneProps) {
  const trackRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const activeRef = useRef(-1);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const revealedRef = useRef(false);

  useEffect(() => {
    return subscribeProgress((p) => {
      if (trackRef.current) trackRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      const active = activeStepIndex(steps, p);
      if (active !== activeRef.current) {
        activeRef.current = active;
        stepRefs.current.forEach((el, i) => {
          if (!el) return;
          el.classList.toggle('on', i === active);
          el.classList.toggle('done', i < active);
        });
        if (captionRef.current) {
          captionRef.current.textContent = steps[active].body;
          captionRef.current.classList.remove('ws-caption-pop');
          void captionRef.current.offsetWidth;
          captionRef.current.classList.add('ws-caption-pop');
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeProgress]);

  // GSAP line-by-line headline reveal, once, the first time the scene is on screen
  useEffect(() => {
    if (!visible || revealedRef.current) return;
    revealedRef.current = true;
    const el = headlineRef.current;
    if (!el) return;
    if (reduceMotion()) return;
    const lines = title.split('\n');
    el.innerHTML = lines.map((l) => `<span class="ws-headline-line"><span class="ws-headline-line-inner">${l}</span></span>`).join('<br/>');
    gsap.fromTo(el.querySelectorAll('.ws-headline-line-inner'),
      { yPercent: 115, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
  }, [visible, title]);

  return (
    <section ref={outerRef} className={cn('ws-scene', className)} style={{ height: `${lengthVh}vh` }}>
      <div ref={stageRef} className="ws-pin">
        <div className="ws-copy">
          <h2 className="hr-h2 ws-headline" ref={headlineRef}>{title}</h2>
          <p className="hr-lead" style={{ marginTop: 14 }}>{sub}</p>
          <ol className="ws-steps">
            {steps.map((s, i) => (
              <li key={s.title} ref={(el) => { stepRefs.current[i] = el; }} className={i === 0 ? 'on' : undefined}>
                <b>{s.title}</b>
                <span>{s.body}</span>
              </li>
            ))}
          </ol>
          {hint && (
            <p className="ws-hint"><i aria-hidden="true" />{hint}</p>
          )}
        </div>
        <div className="ws-stage">
          {supported ? (
            <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
          ) : (
            <div className={cn('ws-fb', richFallback && 'ws-fb-rich')}>
              {!richFallback && <div className="deck" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
              <div className="ws-fb-content">{fallback}</div>
            </div>
          )}
          {tip}
          {legend && <div className="ws-legend">{legend}</div>}
          {supported && showCaption && (
            <p className="ws-caption" ref={captionRef}>{steps[0].body}</p>
          )}
          {supported && showMeter && (
            <div className="ws-meter" aria-hidden="true">
              <div className="track"><i ref={trackRef} /></div>
              <span className="pct" ref={pctRef}>0%</span>
            </div>
          )}
          {controls && <div className="ws-controls">{controls}</div>}
        </div>
      </div>
    </section>
  );
}
