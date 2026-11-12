/*
 * Signed-in visitors normally see every page inside the workspace shell.
 * "← Back to site" switches to the public layout for this browser session;
 * "Open app" in the public nav switches back. Purely presentational.
 */
const KEY = 'wl_site_view';
const EVT = 'wl-site-view';

export function isSiteView(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function setSiteView(on: boolean) {
  try { if (on) sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVT));
}
export function onSiteViewChange(fn: () => void) {
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}
