import { watchOnScreen } from './offscreen';
import { useEffect, useRef } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { STICK, stickerSVG } from '@/components/genie/stickers';
import { storyClouds, storySentence, storyStage } from './genieMarkup';

const TONES = ['#cce7ff', '#ffd1b8', '#d3f6e3', '#e4ccff', '#fff2be'];
const ROWS: [string, string, string, 'v' | 'r'][] = [
  ['MK', 'Merged “session timer” API', 'studyflow · a91f3c2', 'v'], ['LN', 'Map layer for bus routes', 'citymind · 7d02e1b', 'r'],
  ['SR', 'Onboarding flow, 6 screens', 'studyflow · figma', 'v'], ['AH', 'Sprite batching renderer', 'pixel-realm · c44a90e', 'v'],
  ['MP', 'Emissions export to CSV', 'carbon-ledger · 3be81f0', 'v'], ['DK', 'Design review: settings', 'studyflow · figma', 'v'], ['SA', 'Model eval on 2k samples', 'novaai-brief · e10c7d2', 'v']];
const seeded = (s: number) => () => (s = (s * 9301 + 49297) % 233280) / 233280;
const level = (r: () => number, bias: number) => { const v = r() + bias; return v > 1.2 ? 4 : v > 1 ? 3 : v > 0.8 ? 2 : v > 0.6 ? 1 : 0; };
const rowHTML = (r: (typeof ROWS)[number], fresh?: boolean) => `<div class="gh-row ${fresh ? 'gh-fresh' : ''}"><span class="gh-av" style="background:${TONES[r[0].charCodeAt(0) % 5]}">${r[0]}</span><span><b>${r[1]}</b><small>${r[2]}</small></span><span class="gh-st gh-${r[3]}">${r[3] === 'v' ? 'Verified' : 'In review'}</span></div>`;

/**
 * 2+3 · Story → app icon → outline → app window → click → flood, one pinned
 * scene (640%, scrub .7), ported from the demo's timeline with its exact
 * values. The flood carries the protected stack's title straight into
 * FrozenStack below. Mobile (<768px) and reduced motion: static layout.
 */
export function StoryScene({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);

  // stickers, live feed, heatmap and tabs inside the app window (demo script)
  useEffect(() => {
    const sec = ref.current!;
    sec.querySelectorAll<HTMLElement>('[data-ico]').forEach((el) => { const k = el.dataset.ico!; if (!STICK[k]) return; el.style.background = STICK[k][0]; el.innerHTML = stickerSVG(k); });
    const feed = sec.querySelector<HTMLElement>('#gh-feed')!, countEl = sec.querySelector<HTMLElement>('#gh-count')!;
    feed.innerHTML = ROWS.slice(0, 5).map((r) => rowHTML(r)).join('');
    const r = seeded(11);
    sec.querySelector('#gh-heat')!.innerHTML = Array.from({ length: 100 }, (_, i) => `<i class="gh-l${level(r, (Math.floor(i / 5) / 20) * 0.5)}"></i>`).join('');
    const tabs = [...sec.querySelectorAll<HTMLButtonElement>('.gh-xtabs button')];
    const onTab = (e: Event) => tabs.forEach((x) => x.classList.toggle('gh-on', x === e.currentTarget));
    tabs.forEach((b) => b.addEventListener('click', onTab));
    let ri = 0, count = 128, flip = 0;
    const seen = watchOnScreen(sec);
    const iv = reduced ? 0 : window.setInterval(() => {
      if (document.hidden || !seen.state.on) return;
      const row = [...ROWS[(ri++ + 5) % ROWS.length]] as (typeof ROWS)[number]; row[3] = 'r';
      feed.insertAdjacentHTML('afterbegin', rowHTML(row, true));
      feed.lastElementChild?.remove();
      flip = window.setTimeout(() => { const st = feed.firstElementChild?.querySelector('.gh-st'); if (st) { st.className = 'gh-st gh-v'; st.textContent = 'Verified'; } countEl.textContent = String(++count); }, 1600);
    }, 3800);
    return () => { window.clearInterval(iv); window.clearTimeout(flip); seen.stop(); tabs.forEach((b) => b.removeEventListener('click', onTab)); };
  }, [reduced]);

  useScrollScene(ref, (mm) => {
    const sec = ref.current!;
    const q = <T extends Element = HTMLElement>(s: string) => sec.querySelector<T>(s)!;
    const qa = <T extends Element = HTMLElement>(s: string) => [...sec.querySelectorAll<T>(s)];
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const lines = qa('#gh-sentence .gh-ln'), icos = qa<HTMLElement>('#gh-sentence .gh-ico:not(.gh-slot)'), check = q('#gh-stCheck');
      const card = q('#gh-xcard'), btn = q('#gh-startBtn'), cur = q('#gh-cursor'), flood = q('#gh-flood');
      const SPOTS: Record<string, [number, number]> = { team: [-0.3, -0.2], brief: [0.28, -0.24], cap: [-0.24, 0.22], check: [0.3, 0.2] };
      const home = (el: HTMLElement) => { const r = el.getBoundingClientRect(), s = sec.getBoundingClientRect(); return [r.left + r.width / 2 - s.left - Number(gsap.getProperty(el, 'x')), r.top + r.height / 2 - s.top - Number(gsap.getProperty(el, 'y'))]; };
      const spotX = (el: HTMLElement) => innerWidth * (0.5 + SPOTS[el.dataset.ico!][0]) - home(el)[0];
      const spotY = (el: HTMLElement) => innerHeight * (0.5 + SPOTS[el.dataset.ico!][1]) - home(el)[1];
      gsap.set(card, { opacity: 0, scale: 0.6 }); gsap.set(q('#gh-xapp'), { opacity: 0 }); gsap.set(q('#gh-xseed'), { opacity: 1 });
      gsap.set(qa('#gh-sentence .gh-w'), { opacity: 0, yPercent: 60 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=640%', pin: true, scrub: 0.7, invalidateOnRefresh: true } });
      tl.fromTo(q('.gh-st-cloud.gh-l'), { xPercent: -150, y: -20 }, { xPercent: 0, y: 0, duration: 1, ease: 'power2.out' }, 0)
        .fromTo(q('.gh-st-cloud.gh-r'), { xPercent: 150, y: 30 }, { xPercent: 0, y: 0, duration: 1, ease: 'power2.out' }, 0.1)
        .fromTo(q('.gh-story .gh-label'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4 }, 0.3);
      // stickers pop up scattered around the screen
      icos.forEach((ic, i) => tl.fromTo(ic, { x: () => spotX(ic), y: () => spotY(ic), scale: 0, rotate: i % 2 ? 24 : -24 }, { x: () => spotX(ic), y: () => spotY(ic), scale: 1.3, rotate: i % 2 ? 8 : -8, duration: 0.45, ease: 'back.out(2.2)' }, 0.55 + i * 0.08));
      // each line rises in while its sticker flies into its slot
      lines.forEach((ln, li) => {
        const T = 1.3 + li * 0.95;
        tl.to(ln.querySelectorAll('.gh-w'), { opacity: 1, yPercent: 0, stagger: 0.07, duration: 0.5, ease: 'power3.out' }, T);
        ln.querySelectorAll<HTMLElement>('.gh-ico:not(.gh-slot)').forEach((ic) => tl.to(ic, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.75, ease: 'power3.inOut' }, T - 0.15));
      });
      // the sentence clears; the check sticker travels to the centre and grows
      const E = 1.3 + 4 * 0.95 + 0.5;
      tl.to([...qa('#gh-sentence .gh-w'), ...icos.filter((i) => i !== check), q('#gh-sentence .gh-ico.gh-slot'), q('.gh-story .gh-label')], { opacity: 0, y: -24, duration: 0.5, stagger: 0.012 }, E)
        .to(check, { x: () => innerWidth / 2 - home(check)[0], y: () => innerHeight / 2 - home(check)[1], scale: 2.3, rotate: 0, duration: 0.9, ease: 'power3.inOut' }, E)
        .to(q('.gh-st-cloud.gh-l'), { xPercent: -150, duration: 0.9, ease: 'power2.in' }, E + 0.2)
        .to(q('.gh-st-cloud.gh-r'), { xPercent: 150, duration: 0.9, ease: 'power2.in' }, E + 0.2)
        // sticker → WebLoop app icon → outline
        .to(check, { scale: 1.4, opacity: 0, duration: 0.35 }, E + 0.95)
        .to(card, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, E + 0.95)
        .to(q('#gh-xseed'), { opacity: 0, duration: 0.4 }, E + 1.6)
        // outline → app window → click → flood
        .to(card, { width: () => Math.min(1120, innerWidth * 0.9), height: () => innerHeight * 0.78, borderRadius: 32, ease: 'power2.inOut', duration: 1.2 }, E + 2)
        .to(q('#gh-xapp'), { opacity: 1, duration: 0.4 }, E + 2.5)
        .fromTo(cur, { x: () => innerWidth * 0.2, y: () => innerHeight * 0.85, opacity: 0 }, {
          x: () => { const r = btn.getBoundingClientRect(); return r.left + r.width * 0.55; },
          y: () => { const r = btn.getBoundingClientRect(); return r.top + r.height * 0.6; }, opacity: 1, duration: 0.8, ease: 'power2.inOut',
        }, E + 3.5)
        .to(btn, { scale: 0.9, duration: 0.08 }).to(btn, { scale: 1, duration: 0.12 })
        .fromTo(flood, { clipPath: () => { const r = btn.getBoundingClientRect(); return `circle(0px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)`; } },
          { clipPath: () => { const r = btn.getBoundingClientRect(); return `circle(${Math.hypot(innerWidth, innerHeight) * 1.1}px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)`; }, duration: 1, ease: 'power2.in' })
        .to(cur, { opacity: 0, duration: 0.2 }, '<.3')
        .from(qa('#gh-flood h2, #gh-flood p'), { y: 60, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=.35')
        .to({}, { duration: 0.4 });
      return () => gsap.set([card, check, ...icos], { clearProps: 'all' });
    });
    mm.add('(max-width: 767px), (prefers-reduced-motion: reduce)', () => {
      gsap.set(qa('#gh-sentence .gh-w, #gh-sentence .gh-ico'), { opacity: 1, yPercent: 0, x: 0, y: 0 });
      gsap.set(q('#gh-xcard'), { width: '92vw', height: '70vh', opacity: 1, scale: 1 }); gsap.set(q('#gh-xapp'), { opacity: 1 }); gsap.set(q('#gh-xseed'), { opacity: 0 }); gsap.set(q('#gh-flood'), { display: 'none' });
      if (reduced) gsap.set(q('#gh-xcard'), { width: 'min(1100px,92vw)', height: '74vh' });
    });
  });

  return (
    <section ref={ref} className="gh-story" id="how">
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: storyClouds }} />
      <div className="gh-story-in">
        <div className="gh-label">Start with a brief. Not a blank page.</div>
        <p className="gh-sentence" id="gh-sentence" data-orb-fade aria-label="WebLoop turns your idea, a team, a brief and a mentor into verified proof." dangerouslySetInnerHTML={{ __html: storySentence }} />
      </div>
      <div className="gh-stage" dangerouslySetInnerHTML={{ __html: storyStage }} />
    </section>
  );
}
