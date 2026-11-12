import { Cloud } from './Cloud';

const LAYOUT = {
  3: [
    { tone: 'white', left: '-6%', w: '34%', y: 0 },
    { tone: 'sky', left: '33%', w: '30%', y: 18 },
    { tone: 'white', left: '68%', w: '38%', y: 4 },
  ],
  5: [
    { tone: 'sky', left: '-8%', w: '28%', y: 10 },
    { tone: 'white', left: '14%', w: '30%', y: 0 },
    { tone: 'sky', left: '38%', w: '26%', y: 22 },
    { tone: 'white', left: '58%', w: '30%', y: 2 },
    { tone: 'sky', left: '80%', w: '28%', y: 14 },
  ],
} as const;

/**
 * A row of layered clouds for the top or bottom edge of a section (How It
 * Works, auth aside, 404, empty states). Purely decorative.
 */
export function CloudBank({
  side,
  density = 3,
  parallax = false,
  className,
}: {
  side: 'top' | 'bottom';
  density?: 3 | 5;
  parallax?: boolean;
  className?: string;
}) {
  return (
    <div className={`g-cloudbank g-cloudbank-${side}${parallax ? ' is-parallax' : ''} ${className ?? ''}`} aria-hidden="true">
      {LAYOUT[density].map((c, i) => (
        <Cloud
          key={i}
          tone={c.tone}
          width={c.w}
          className="g-cloudbank-c"
          style={{ left: c.left, [side === 'top' ? 'top' : 'bottom']: `${c.y - 30}%`, animationDelay: `${-i * 1.7}s` }}
        />
      ))}
    </div>
  );
}
