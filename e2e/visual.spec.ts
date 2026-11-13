import { test, expect, type Page } from '@playwright/test';

/**
 * Reference screenshots of every route (signed out), taken on `main` in F0.
 * The redesign changes these pages on purpose, so this suite is opt-in:
 *   VISUAL=1 npx playwright test e2e/visual.spec.ts                      (compare)
 *   VISUAL=1 npx playwright test e2e/visual.spec.ts --update-snapshots   (refresh, F9)
 * The protected stack has its own always-on guard in stack.spec.ts.
 */
test.skip(!process.env.VISUAL, 'reference screenshots: set VISUAL=1 to run');

const STATIC_ROUTES = [
  '/', '/feed', '/admin/moderation', '/explore', '/gallery', '/companies', '/how-it-works',
  '/join', '/signin', '/forgot-password', '/reset-password', '/publish', '/my-applications',
  '/my-invitations', '/my-projects', '/settings', '/settings/profile', '/build-profile',
  '/dashboard/student', '/dashboard/company', '/dashboard/university', '/this-page-does-not-exist',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/** Deep-link routes need a real slug/handle, so find one from the live listing pages. */
async function firstHref(page: Page, listing: string, prefix: string): Promise<string | null> {
  await page.goto(listing, { waitUntil: 'networkidle' });
  const link = page.locator(`a[href^="${prefix}"]`).first();
  try {
    await link.waitFor({ timeout: 8000 });
    return await link.getAttribute('href');
  } catch {
    return null;
  }
}

function fileName(vp: string, route: string) {
  if (route === '/') return `${vp}-home.png`;
  if (route.startsWith('/projects/')) return `${vp}-project-detail.png`;
  if (route.startsWith('/creators/')) return `${vp}-creator-profile.png`;
  return `${vp}${route.replace(/\//g, '-')}.png`;
}

async function shoot(page: Page, route: string, vp: (typeof VIEWPORTS)[number]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // light is the default theme; no init script (it shifts load timing on / — see stack.spec.ts)
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await expect(page).toHaveScreenshot(fileName(vp.name, route), { maxDiffPixelRatio: 0.02, animations: 'disabled' });
}

for (const vp of VIEWPORTS) {
  for (const route of STATIC_ROUTES) {
    test(`${route} on ${vp.name}`, async ({ page }) => {
      await shoot(page, route, vp);
    });
  }

  test(`/projects/:slug on ${vp.name}`, async ({ page }) => {
    const href = await firstHref(page, '/explore', '/projects/');
    test.skip(!href, 'no published project found on /explore');
    await shoot(page, href!, vp);
  });

  test(`/creators/:handle on ${vp.name}`, async ({ page }) => {
    const href = (await firstHref(page, '/gallery', '/creators/')) ?? (await firstHref(page, '/explore', '/creators/'));
    test.skip(!href, 'no creator link found on /gallery or /explore');
    await shoot(page, href!, vp);
  });
}
