import { useId, type CSSProperties } from 'react';

/**
 * One soft cloud (the demo's `cloudW` / `cloudB` symbol), self-contained so
 * it can float anywhere without a shared <defs> block. `white` is the bright
 * cloud, `sky` the slightly bluer back cloud.
 */
export function Cloud({
  tone = 'white',
  width,
  className,
  style,
}: {
  tone?: 'white' | 'sky';
  width: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, '');
  const stops = tone === 'white' ? ['#fff', '#eef5ff', '#cbdff7'] : ['#f6faff', '#dcebfd', '#b6d1f2'];
  return (
    <svg
      viewBox="0 0 200 120"
      width={width}
      className={`g-cloud ${className ?? ''}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`c${id}`} cx="80" cy="20" r="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset=".55" stopColor={stops[1]} />
          <stop offset="1" stopColor={stops[2]} />
        </radialGradient>
      </defs>
      <g fill={`url(#c${id})`}>
        <circle cx="58" cy="74" r="34" />
        <circle cx="98" cy="56" r="44" />
        <circle cx="142" cy="72" r="34" />
        <rect x="40" y="70" width="122" height="38" rx="19" />
      </g>
      <ellipse cx="86" cy="38" rx="24" ry="10" fill="#fff" opacity={tone === 'white' ? 0.7 : 0.6} />
    </svg>
  );
}
