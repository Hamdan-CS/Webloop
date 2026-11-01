import { avatarArt } from '@/data/homeArt';

/** Illustrated, code-generated person avatar — matches the prototype's
 * seeded `av()` artwork, used for home-page demonstration data only. */
export function IllustratedAvatar({
  personKey,
  name,
  female,
  size,
  className,
  style,
}: {
  personKey: string;
  name: string;
  female?: boolean;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={avatarArt(personKey, female ?? null)}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }}
    />
  );
}

export default IllustratedAvatar;
