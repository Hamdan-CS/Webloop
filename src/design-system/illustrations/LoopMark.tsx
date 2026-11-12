import { useId, type CSSProperties } from 'react';

/** The loop (∞) path used by the demo's mark, intro and ending. */
export const LOOP_PATH = 'M16 6a10 10 0 1 0 0 20c6 0 10-6 16-10s10-10 16-10a10 10 0 1 1 0 20c-6 0-10-6-16-10S22 6 16 6z';

/**
 * WebLoop loop mark.
 * - `line`: the flat gradient stroke. `draw` primes it for a draw-on
 *   animation (pathLength=1, dashoffset 1 → animate to 0 with GSAP).
 *   `pulse` adds the travelling light (CSS, 3.2s loop).
 * - `glossy`: a chunky "clay" version with a highlight, for big moments.
 */
export function LoopMark({
  variant = 'line',
  draw = false,
  pulse = false,
  width,
  className,
  style,
}: {
  variant?: 'line' | 'glossy';
  draw?: boolean;
  pulse?: boolean;
  width: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, '');
  const glossy = variant === 'glossy';
  return (
    <svg
      className={`g-loop${pulse ? ' is-pulse' : ''} ${className ?? ''}`}
      width={width}
      height={width / 2}
      viewBox="0 0 64 32"
      style={{ overflow: 'visible', ...style }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`l${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={glossy ? '#9ccbff' : '#7cb8ff'} />
          <stop offset="1" stopColor="#0069e0" />
        </linearGradient>
      </defs>
      {glossy && <path d={LOOP_PATH} fill="none" stroke="rgba(0,60,150,.18)" strokeWidth="8" strokeLinecap="round" transform="translate(0 2.5)" />}
      <path
        className="g-loop-path"
        d={LOOP_PATH}
        pathLength={draw ? 1 : undefined}
        style={draw ? { strokeDasharray: 1, strokeDashoffset: 1 } : undefined}
        fill="none"
        stroke={`url(#l${id})`}
        strokeWidth={glossy ? 7 : 5}
        strokeLinecap="round"
      />
      {glossy && <path d={LOOP_PATH} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" transform="translate(-.6 -1.4)" />}
      {pulse && <path className="g-loop-pulse" d={LOOP_PATH} pathLength={1} fill="none" stroke="#fff" strokeWidth={glossy ? 3.4 : 2.6} strokeLinecap="round" />}
    </svg>
  );
}
