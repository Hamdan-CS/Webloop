import { useMemo } from 'react';
import { heatLevels } from '@/utils/heat';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  seed: number;
  intensity: number;
  weeks?: number;
  rows?: number;
  cell?: number;
  className?: string;
}

/** Contribution-activity grid. Illustrative, deterministic per seed. */
export function MiniHeat({ seed, intensity, weeks = 16, rows = 5, cell = 9, className = '' }: Props) {
  const cells = useMemo(() => {
    const N = weeks * rows;
    const lv = heatLevels(seed, intensity, N);
    const today = new Date();
    return lv.map((l, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (N - 1 - i) * 1.4);
      const c = [0, 1, 3, 5, 8][l] + (l ? (seed + i) % 3 : 0);
      return { l, tip: `${c} contribution${c === 1 ? '' : 's'} · ${MON[d.getMonth()]} ${d.getDate()}` };
    });
  }, [seed, intensity, weeks, rows]);

  return (
    <div
      className={`mini-heat ${className}`}
      role="img"
      aria-label={`Contribution activity, last ${weeks} weeks`}
      style={{ gridTemplateColumns: `repeat(${weeks}, ${cell}px)`, gridTemplateRows: `repeat(${rows}, ${cell}px)` }}
    >
      {cells.map((c, i) => (
        <span key={i} className="hc" data-l={c.l} data-tip={c.tip} style={{ width: cell, height: cell }} />
      ))}
    </div>
  );
}
