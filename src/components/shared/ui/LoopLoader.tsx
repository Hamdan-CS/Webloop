import { useId } from 'react';
import { INF_PATH } from '@/components/navigation/Wordmark';

interface LoopLoaderProps {
  /** Rendered height in px; width follows the path's aspect ratio. */
  size?: number;
  className?: string;
}

/** Small infinity-loop loading indicator — a travelling spark traces the loop, no text. */
export function LoopLoader({ size = 28, className = '' }: LoopLoaderProps) {
  const id = useId();
  return (
    <svg
      className={`loop-loader ${className}`}
      viewBox="0 0 64 30"
      width={Math.round((size * 64) / 30)}
      height={size}
      role="img"
      aria-label="Loading"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="var(--cyan)" />
          <stop offset="1" stopColor="var(--wordmark-accent)" />
        </linearGradient>
      </defs>
      <path className="loop-loader-track" d={INF_PATH} />
      <path className="loop-loader-spark" stroke={`url(#${id})`} pathLength={100} d={INF_PATH} />
    </svg>
  );
}
