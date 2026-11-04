/**
 * The app otherwise relies on Tailwind's default spacing scale (0.25rem
 * steps). This file exists for the handful of named, semantic spacing
 * values referenced from page CSS (`var(--section-pad)` etc.) so they have
 * one documented home instead of being redefined per page.
 */
export const spacing = {
  sectionPadding: '96px',
  sectionPaddingMobile: '48px',
  containerMaxWidth: '1240px',
  containerMaxWidthWide: '1360px',
} as const;
