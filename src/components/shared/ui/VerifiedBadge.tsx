import { cn } from '@/utils/cn';
import { WEBI_LOGO_PATH } from '@/design-system/webi/WebiLogoLoop';

/**
 * One look for the official WebLoop account everywhere: a blue verified tick,
 * optionally followed by a small "Official" label. Colours are literal (not
 * theme-remapped Tailwind names) so it reads the same in light and dark.
 */
export function VerifiedBadge({ label = false, size = 14, className }: { label?: boolean; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 align-middle', className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified official account">
        <path
          fill="#1d74f5"
          d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3 3.2.1z"
        />
        <path fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M7.8 12.3l2.8 2.8 5.6-5.8" />
      </svg>
      {label && (
        <span
          className="rounded-full px-1.5 py-px text-[10.5px] font-semibold leading-[1.5] tracking-wide"
          style={{ background: 'rgba(29,116,245,.12)', color: '#1d74f5' }}
        >
          Official
        </span>
      )}
    </span>
  );
}

/**
 * The WebLoop ∞ mark used as the official account's avatar. Fills its parent
 * (put it inside an avatar circle). Static on purpose: no data-webi-logo, so
 * Webi never treats it as the sidebar logo.
 */
export function WebLoopMark({ className }: { className?: string }) {
  return (
    <span
      className={cn('flex h-full w-full items-center justify-center', className)}
      style={{ background: '#0b1424' }}
      role="img"
      aria-label="WebLoop"
    >
      <svg viewBox="0 0 64 32" style={{ width: '66%', height: 'auto' }} aria-hidden="true">
        <defs>
          <linearGradient id="wlMarkG" x1="0" x2="1">
            <stop offset="0" stopColor="#7cb8ff" />
            <stop offset="1" stopColor="#3d8ef5" />
          </linearGradient>
        </defs>
        <path d={WEBI_LOGO_PATH} fill="none" stroke="url(#wlMarkG)" strokeWidth={6} strokeLinecap="round" />
      </svg>
    </span>
  );
}
