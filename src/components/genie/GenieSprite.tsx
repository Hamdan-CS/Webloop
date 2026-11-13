import { sprite } from '@/components/home/genieMarkup';

/**
 * The demo's SVG library (clouds #cloudW/#cloudB, loop mark #loop, #check and
 * their gradients), mounted once for the whole app so any <use href="#…"> —
 * nav logo, footer, homepage clouds — resolves. Static, decorative markup
 * copied from the demo.
 */
export function GenieSprite() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: sprite }} />;
}
