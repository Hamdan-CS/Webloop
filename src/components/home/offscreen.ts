/*
 * Phase 5 performance: keep decorative loops from running while their section
 * is off-screen. Purely a scheduling guard; nothing about the visuals changes.
 */

/** A live `on` flag that is false while `el` is well outside the viewport. */
export function watchOnScreen(el: Element, rootMargin = '200px') {
  const state = { on: true };
  if (typeof IntersectionObserver === 'undefined') return { state, stop: () => {} };
  const io = new IntersectionObserver(([e]) => { state.on = e.isIntersecting; }, { rootMargin });
  io.observe(el);
  return { state, stop: () => io.disconnect() };
}

/** Pause infinite CSS animations (adds .gh-paused) on matching elements while off-screen. */
export function pauseCssLoopsOffscreen(root: ParentNode, selector: string, rootMargin = '200px') {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const els = [...root.querySelectorAll(selector)];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('gh-paused', !e.isIntersecting));
  }, { rootMargin });
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
