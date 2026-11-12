import type { CSSProperties, ReactNode } from 'react';

export type ClayKind = 'star' | 'note' | 'spark' | 'loop' | 'badge' | 'folder' | 'shield' | 'bubble' | 'cubes';

const BODY: Record<ClayKind, { bg: string; radius: string; tilt: number; glyph: ReactNode }> = {
  star: {
    bg: 'radial-gradient(circle at 30% 25%,#fff,#e6d6ff 60%,#c2a8f5)', radius: '30%', tilt: -12,
    glyph: <path d="M12 4l2.2 5 5.3.5-4 3.6 1.2 5.2L12 15.6 7.3 18.3l1.2-5.2-4-3.6 5.3-.5z" fill="#8f6be8" />,
  },
  note: {
    bg: 'radial-gradient(circle at 30% 20%,#f4fff9,#c6f0da 70%,#a8e2c4)', radius: '26%', tilt: 9,
    glyph: <path d="M6 8h12M6 12h12M6 16h7" stroke="rgba(8,116,67,.45)" strokeWidth="2.2" strokeLinecap="round" />,
  },
  spark: {
    bg: 'radial-gradient(circle at 34% 28%,#fff 0,#ffe9a8 30%,#ffc94d 62%,#f29b1a 100%)', radius: '50%', tilt: 0,
    glyph: null,
  },
  loop: {
    bg: 'radial-gradient(circle at 30% 25%,#fff,#d9ebff 60%,#a9cdf7)', radius: '30%', tilt: -6,
    glyph: <path d="M7 9a3 3 0 1 0 0 6c2 0 3-2 5-3s3-3 5-3a3 3 0 1 1 0 6c-2 0-3-2-5-3S9 9 7 9z" fill="none" stroke="#0069e0" strokeWidth="2.2" strokeLinecap="round" />,
  },
  badge: {
    bg: 'radial-gradient(circle at 34% 28%,#9ccbff 0,#3f8ff5 42%,#0058c4 100%)', radius: '50%', tilt: 0,
    glyph: <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  folder: {
    bg: 'radial-gradient(circle at 30% 20%,#fffbe6,#ffe58a 65%,#f5c84a)', radius: '28%', tilt: 8,
    glyph: <path d="M4 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#e8a920" />,
  },
  shield: {
    bg: 'radial-gradient(circle at 30% 20%,#f2fffa,#c6f0da 70%,#93dcb6)', radius: '30%', tilt: -8,
    glyph: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" fill="#1fa968" /><path d="M8.8 12.2l2.2 2.2 4.3-4.4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></>,
  },
  bubble: {
    bg: 'radial-gradient(circle at 30% 20%,#fff5ef,#ffd1b8 65%,#f6a77e)', radius: '34%', tilt: 10,
    glyph: <path d="M5 7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5l-4 3v-3a3 3 0 0 1-2-3z" fill="#e7743a" />,
  },
  cubes: {
    bg: 'radial-gradient(circle at 30% 20%,#fff,#d6e8ff 60%,#9fc5f2)', radius: '28%', tilt: 6,
    glyph: <><rect x="4" y="11" width="7" height="7" rx="1.6" fill="#3d8ef5" /><rect x="13" y="11" width="7" height="7" rx="1.6" fill="#7cb5ff" /><rect x="8.5" y="4" width="7" height="7" rx="1.6" fill="#0069e0" /></>,
  },
};

/**
 * Soft "clay" object from the Genie illustration language: a rounded,
 * glossy pastel body with one glyph, floating with a drop shadow and an
 * optional slow bob (turned off by prefers-reduced-motion in CSS).
 */
export function ClayObject({
  kind,
  size = 64,
  float = true,
  className,
  style,
}: {
  kind: ClayKind;
  size?: number;
  float?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const b = BODY[kind];
  return (
    <div className={`g-clay-wrap ${className ?? ''}`} style={style} aria-hidden="true">
      <div
        className={`g-clay${float ? ' g-bob' : ''}`}
        style={{ width: size, height: size, borderRadius: b.radius, background: b.bg, rotate: `${b.tilt}deg` }}
      >
        {b.glyph && (
          <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46}>
            {b.glyph}
          </svg>
        )}
      </div>
    </div>
  );
}
