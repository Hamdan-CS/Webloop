import { useId } from 'react';
import './webi.css';

/** Same path and gradient as the site's `#loop` sprite symbol, so the logo looks identical. */
export const WEBI_LOGO_PATH = 'M16 6a10 10 0 1 0 0 20c6 0 10-6 16-10s10-10 16-10a10 10 0 1 1 0 20c-6 0-10-6-16-10S22 6 16 6z';

/**
 * The ∞ in the nav wordmark, as inline SVG with three paths:
 * - `.main` the normal gradient ∞ (what every page shows)
 * - `.wm`   pale watermark ∞, shown only while Webi is out on the home page
 * - `.run`  short light running around the watermark
 * `.out` / `.ripple` are only ever added by the Webi engine (home page), so on
 * every other page this renders exactly like the old `<use href="#loop">`.
 */
export function WebiLogoLoop({ width = 26, height = 14 }: { width?: number; height?: number }) {
  const gid = `webiLogoG${useId().replace(/:/g, '')}`;
  return (
    <svg className="webi-logo" data-webi-logo width={width} height={height} viewBox="0 0 64 32" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" stopColor="#7cb8ff" />
          <stop offset="1" stopColor="#0069e0" />
        </linearGradient>
      </defs>
      <path className="wm" d={WEBI_LOGO_PATH} fill="none" strokeWidth={5} strokeLinejoin="round" />
      <path className="run" d={WEBI_LOGO_PATH} fill="none" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <path className="main" d={WEBI_LOGO_PATH} fill="none" stroke={`url(#${gid})`} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
}
