/**
 * Supabase appends OAuth/email-link failures (e.g. invalid provider secret,
 * redirect URI mismatch, expired recovery link) as `error`/`error_description`
 * params on the redirect back to the app, either in the query string or the
 * URL hash depending on the flow. Nothing previously read these, so a failed
 * Google sign-in silently landed on the home page with no explanation.
 */
export function consumeAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(window.location.search);

  const description = hashParams.get('error_description') || queryParams.get('error_description');
  const code = hashParams.get('error') || hashParams.get('error_code') || queryParams.get('error') || queryParams.get('error_code');

  if (!description && !code) return null;

  queryParams.delete('error');
  queryParams.delete('error_code');
  queryParams.delete('error_description');
  const remainingQuery = queryParams.toString();
  const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : '');
  window.history.replaceState(null, '', cleanUrl);

  return description ? decodeURIComponent(description.replace(/\+/g, ' ')) : `Sign-in failed: ${code}`;
}
