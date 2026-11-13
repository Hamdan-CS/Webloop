import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { xcCards } from './genieMarkup';

const seeded = (s: number) => () => (s = (s * 9301 + 49297) % 233280) / 233280;
const level = (r: () => number, bias: number) => { const v = r() + bias; return v > 1.2 ? 4 : v > 1 ? 3 : v > 0.8 ? 2 : v > 0.6 ? 1 : 0; };

/**
 * 6 · Feature cards that expand (GitHub + Baselayer pieces in Genie tiles).
 * Fine pointers open a card on hover after 90ms; click, focus and
 * Enter/Space open it too. The contribution graph shows counts on hover.
 */
/** The demo's GitHub-style graph: 210 seeded cells, inserted once. */
function fillGraph(gh: HTMLElement): number[] {
  const r = seeded(5);
  const cells = Array.from({ length: 210 }, (_, i) => level(r, (Math.floor(i / 7) / 30) * 0.45));
  if (!gh.querySelector('i[data-i]')) {
    gh.querySelectorAll('i').forEach((i) => i.remove());
    gh.insertAdjacentHTML('afterbegin', cells.map((v, i) => `<i class="gh-l${v}" data-i="${i}"></i>`).join(''));
  }
  return cells;
}

export function FeatureCards() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const sec = ref.current!;
    const cards = [...sec.querySelectorAll<HTMLElement>('.gh-xc-card')];
    let tm = 0;
    const setCard = (c: HTMLElement) => cards.forEach((x) => { const on = x === c; x.classList.toggle('gh-on', on); x.setAttribute('aria-expanded', String(on)); });
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const off: (() => void)[] = [];
    const on = (el: HTMLElement, ev: string, fn: EventListener) => { el.addEventListener(ev, fn); off.push(() => el.removeEventListener(ev, fn)); };
    cards.forEach((c) => {
      if (fine) { on(c, 'pointerenter', () => { clearTimeout(tm); tm = window.setTimeout(() => setCard(c), 90); }); on(c, 'pointerleave', () => clearTimeout(tm)); }
      on(c, 'click', () => setCard(c)); on(c, 'focus', () => setCard(c));
      on(c, 'keydown', ((e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCard(c); } }) as EventListener);
    });
    // GitHub-style graph with hover counts
    const gh = sec.querySelector<HTMLElement>('#gh-gh')!, tip = sec.querySelector<HTMLElement>('#gh-ghtip')!;
    const cells = fillGraph(gh);
    on(gh, 'pointerover', ((e: PointerEvent) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('i'); if (!c) return;
      const i = Number(c.dataset.i), v = cells[i];
      tip.textContent = `${v ? v * 3 + 1 : 'No'} verified contributions · week ${Math.floor(i / 7) + 1}`;
      tip.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`; tip.style.top = `${c.offsetTop}px`; tip.style.opacity = '1';
    }) as EventListener);
    on(gh, 'pointerleave', () => { tip.style.opacity = '0'; });
    return () => { clearTimeout(tm); off.forEach((f) => f()); };
  }, []);

  useScrollScene(ref, (mm) => {
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.batch(gsap.utils.toArray<HTMLElement>('.gh-reveal'), { start: 'top 88%', onEnter: (els) => gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 1, ease: 'expo.out' }) });
      // the cells are inserted here too (idempotent): this scene runs before the
      // effect above, and GSAP needs the cells to exist to hide them first
      const gh = ref.current?.querySelector<HTMLElement>('#gh-gh');
      if (gh) fillGraph(gh);
      gsap.set('#gh-gh i', { scale: 0, opacity: 0 });
      ScrollTrigger.create({ trigger: '#gh-gh', start: 'top 85%', once: true, onEnter: () => gsap.to('#gh-gh i', { scale: 1, opacity: 1, stagger: { each: 0.003, from: 'start' }, duration: 0.35, ease: 'back.out(2)' }) });
    });
  });

  return (
    <section ref={ref} className="gh-more" id="projects">
      <div className="gh-wrap">
        <div className="gh-sec-hd"><span className="gh-mono">There's more</span><h2 className="gh-h-display" style={{ marginTop: 14 }}>Everything to take a brief all the way to <span className="gh-acc">proof.</span></h2><p className="gh-lead">Hover or tap a card to open it.</p></div>
        <div className="gh-xc gh-reveal" id="gh-xc" role="list" dangerouslySetInnerHTML={{ __html: xcCards }} />
      </div>
    </section>
  );
}
