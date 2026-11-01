import { initialsOf } from './demoData';

/** A generated colour-gradient avatar circle — matches the reference's seeded
 * avatar art (avImg) without needing real image assets. */
export function PersonAvatar({
  name,
  cols,
  size,
  className,
}: {
  name: string;
  cols: [string, string];
  size: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        fontSize: Math.max(9, size * 0.36),
        fontWeight: 700,
        color: '#fff',
        background: `linear-gradient(135deg, ${cols[0]}, ${cols[1]})`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
