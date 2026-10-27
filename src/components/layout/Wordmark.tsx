import { useId } from 'react';
export const INF_PATH =
  'M32 15 C26 4 7 4 7 15 C7 26 26 26 32 15 C38 4 57 4 57 15 C57 26 38 26 32 15 Z';

/** WebL∞p wordmark — the infinity loop replaces the "o", with a travelling spark. */
export function Wordmark({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <span className={`logo-wm ${className}`} aria-label="WebLoop">
      WebL
      <svg className="wm-inf" viewBox="0 0 64 30" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor="#00827C" />
            <stop offset=".45" stopColor="#CBFFFC" />
            <stop offset="1" stopColor="#FAD1FF" />
          </linearGradient>
        </defs>
        <path stroke={`url(#${id})`} pathLength={100} d={INF_PATH} />
        <path className="spark" pathLength={100} d={INF_PATH} />
      </svg>
      p
    </span>
  );
}
