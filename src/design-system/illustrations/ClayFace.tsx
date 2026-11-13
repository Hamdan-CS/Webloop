import { useId } from 'react';

type Tone = 'peach' | 'lav' | 'solar' | 'blue';

/**
 * The smiling clay characters from the word bands (Team / Build / Prove),
 * ported from the demo's inline SVGs. `solar` is the square one with a pencil,
 * `blue` carries the verified tick.
 */
export function ClayFace({ tone, mood = 'smile', size = 104, className }: { tone: Tone; mood?: 'smile' | 'calm'; size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  const g = `f${id}`;
  const ink = { peach: '#3a1d10', lav: '#2b1650', solar: '#4a3300', blue: '#06244d' }[tone];
  const eyes =
    mood === 'calm' || tone === 'lav' ? (
      <path d="M36 54q6-6 12 0M62 54q6-6 12 0" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
    ) : (
      <>
        <ellipse cx="42" cy="54" rx="5" ry="7" fill={ink} />
        <ellipse cx="68" cy="54" rx="5" ry="7" fill={ink} />
      </>
    );
  const mouth =
    tone === 'solar' ? (
      <path d="M44 70h22" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d={tone === 'blue' ? 'M40 68q15 14 30 0' : tone === 'lav' ? 'M44 70q11 9 22 0' : 'M42 70q13 12 26 0'} stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />
    );

  return (
    <svg className={`g-face ${className ?? ''}`} width={size} height={size} viewBox="0 0 110 110" aria-hidden="true">
      <defs>
        {tone === 'solar' ? (
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffbe6" />
            <stop offset="1" stopColor="#ffcf4a" />
          </linearGradient>
        ) : (
          <radialGradient id={g} cx="38%" cy="30%" r="75%">
            {tone === 'peach' && <><stop offset="0" stopColor="#fff3ea" /><stop offset=".55" stopColor="#ffc6a6" /><stop offset="1" stopColor="#f08a5b" /></>}
            {tone === 'lav' && <><stop offset="0" stopColor="#fbf7ff" /><stop offset=".55" stopColor="#dcc6ff" /><stop offset="1" stopColor="#9d79ee" /></>}
            {tone === 'blue' && <><stop offset="0" stopColor="#d7ebff" /><stop offset=".5" stopColor="#5aa4ff" /><stop offset="1" stopColor="#0058c4" /></>}
          </radialGradient>
        )}
      </defs>
      {tone === 'solar' ? (
        <>
          <rect x="14" y="18" width="82" height="80" rx="24" fill={`url(#${g})`} />
          <rect x="14" y="18" width="82" height="80" rx="24" fill="none" stroke="#e8a920" strokeWidth="2" opacity=".5" />
          <path d="M74 14l10-8 6 6-8 10z" fill="#0069e0" />
          <ellipse cx="40" cy="30" rx="14" ry="5" fill="#fff" opacity=".7" />
        </>
      ) : (
        <>
          <circle cx="55" cy="58" r="44" fill={`url(#${g})`} />
          <ellipse cx="40" cy="36" rx="12" ry="6" fill="#fff" opacity=".6" />
        </>
      )}
      {eyes}
      {mouth}
      {tone === 'blue' && (
        <>
          <circle cx="86" cy="26" r="14" fill="#1fa968" />
          <path d="M80 26l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
