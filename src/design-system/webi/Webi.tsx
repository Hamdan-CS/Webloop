import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/design-system/motion/useReducedMotion';
import { WEBI, WEBI_MOODS } from './webi.config';
import { createWebiEngine, type WebiEngine } from './webiEngine';
import './webi.css';

const DEBUG = import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('webi-debug');

/**
 * Webi, the WebLoop character. Render once, on the home page only.
 * `ready` delays the intro (e.g. until the cloud curtain has finished);
 * until then Webi waits inside the solid nav logo.
 *
 * Layers are portalled to <body> so no transformed ancestor can break
 * `position: fixed`. Everything is aria-hidden and pointer-events: none.
 */
export function Webi({ ready = true }: { ready?: boolean }) {
  const gooRef = useRef<HTMLCanvasElement>(null);
  const faceRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WebiEngine | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const goo = gooRef.current, face = faceRef.current, bubble = bubbleRef.current;
    if (!goo || !face || !bubble) return;
    const engine = createWebiEngine({ goo, face, bubble, debug: debugRef.current, reducedMotion: reduced });
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
  }, [reduced]);

  useEffect(() => {
    if (ready) engineRef.current?.start();
  }, [ready, reduced]);

  const { id, blur, alphaMul, alphaOff } = WEBI.goo;
  return createPortal(
    <>
      {/* goo filter — the id must stay unique: never give an element id="webi-goo" */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
          <feColorMatrix in="b" values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${alphaMul} ${alphaOff}`} />
        </filter>
      </svg>
      <canvas ref={gooRef} className="webi-goo" aria-hidden="true" />
      <canvas ref={faceRef} className="webi-face" aria-hidden="true" />
      <div ref={bubbleRef} className="webi-bubble" aria-hidden="true" />
      {DEBUG && (
        <div
          ref={debugRef}
          className="webi-debug"
          onClick={(e) => {
            const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
            if (!b) return;
            if (b.dataset.r !== undefined) engineRef.current?.replayIntro();
            else if (b.dataset.m) engineRef.current?.setMood(b.dataset.m as (typeof WEBI_MOODS)[number], WEBI.debugMs);
          }}
        >
          {WEBI_MOODS.filter((m) => m !== 'idle').map((m) => <button key={m} type="button" data-m={m}>{m}</button>)}
          <button type="button" data-r="">replay intro</button>
        </div>
      )}
    </>,
    document.body,
  );
}

export default Webi;
