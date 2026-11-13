import { useEffect } from 'react';

/*
 * One underline per tab bar that slides to the selected tab (instead of each
 * tab drawing its own static underline). Works for every tab bar rendered in
 * the workspace panel without touching the pages: it watches the panel for
 * tab bars and for selection changes, and moves a single `.w-ink` element.
 * Tab bars with their own moving indicator (.cw-tabs, .w-gtabs) are skipped.
 * Reduced motion: the ink still follows, without the slide (see CSS).
 */
const BARS = '[role="tablist"]:not(.cw-tabs):not(.w-gtabs), .pd-tabs, .d-tabs';
const ACTIVE = ':scope > button.on, :scope > button[aria-selected="true"], :scope > [role="tab"][aria-selected="true"]';

function place(bar: HTMLElement) {
  let ink = bar.querySelector<HTMLElement>(':scope > .w-ink');
  if (!ink) {
    ink = document.createElement('span');
    ink.className = 'w-ink';
    ink.setAttribute('aria-hidden', 'true');
    bar.appendChild(ink);
  }
  if (!bar.classList.contains('w-has-ink')) bar.classList.add('w-has-ink');
  const on = bar.querySelector<HTMLElement>(ACTIVE);
  const next = on ? `translateX(${on.offsetLeft + 8}px)` : '';
  const w = on ? `${Math.max(0, on.offsetWidth - 16)}px` : '0px';
  if (ink.style.transform !== next) ink.style.transform = next;
  if (ink.style.width !== w) ink.style.width = w;
  ink.style.opacity = on ? '1' : '0';
  // the first placement jumps into position; later changes slide
  if (!ink.dataset.ready) requestAnimationFrame(() => { if (ink) ink.dataset.ready = '1'; });
}

export function useSlidingTabInk(panelId: string) {
  useEffect(() => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => panel.querySelectorAll<HTMLElement>(BARS).forEach(place));
    };
    update();
    const mo = new MutationObserver(update);
    mo.observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });
    const ro = new ResizeObserver(update);
    ro.observe(panel);
    document.fonts?.ready.then(update);
    return () => { cancelAnimationFrame(raf); mo.disconnect(); ro.disconnect(); };
  }, [panelId]);
}
