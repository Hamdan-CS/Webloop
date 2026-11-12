import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const FAQ: [string, string][] = [
  ['Is WebLoop free for students?', 'Yes. Students join, team up and build their portfolio for free. Companies and universities pay to post briefs at scale.'],
  ['Who verifies a contribution?', 'Whoever owns the brief: the company, the lecturer or the project owner. Each check links to the commit, file or review behind it.'],
  ['Can my university run a course on WebLoop?', 'Yes. Lecturers post briefs, form teams and grade sprints, and students keep the verified work afterwards.'],
  ['What happens to my work after a project ends?', 'It stays on your portfolio with its verification, and you can link it anywhere.']];

const STK: [string, string][] = [
  ['#dcebff', '<svg viewBox="0 0 64 32"><use href="#loop"/></svg>'],
  ['#d3f6e3', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#1fa968"/><path d="M8 12.3l2.7 2.7L16 9.6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
  ['#fff2be', '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z" fill="#f0a92a"/></svg>'],
  ['#ffe2d1', '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#f2884a"/></svg>'],
  ['#f1e6ff', '<svg viewBox="0 0 24 24"><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5M13.5 5l-3 14" stroke="#7c3aed" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
  ['#cce7ff', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#5aa4ff"/><circle cx="9" cy="10.5" r="1.4" fill="#06244d"/><circle cx="15" cy="10.5" r="1.4" fill="#06244d"/><path d="M8.5 14q3.5 3.4 7 0" stroke="#06244d" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'],
  ['#ffe0ec', '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#f25f8e"/></svg>'],
  ['#e5f6ff', '<svg viewBox="0 0 24 24"><path d="M13 2 5 13h6l-1 9 8-11h-6z" fill="#3d8ef5"/></svg>']];

/**
 * 10 · FAQ with the playful cursor trail. The trail layer lives at page level
 * (portal to <body>, page coordinates) so stickers can cross section edges.
 * Fine pointers only; off with reduced motion. Demo values throughout.
 */
export function HomeFaq({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const sec = ref.current, trail = trailRef.current;
    if (!sec || !trail || reduced || !matchMedia('(pointer: fine)').matches) return;
    let lx: number | null = null, ly = 0, acc = 0, alive = 0, k = 0;
    const onMove = (e: PointerEvent) => {
      const x = e.pageX, y = e.pageY;
      if (lx === null) { lx = x; ly = y; return; }
      const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy); acc += dist; lx = x; ly = y;
      const gap = (e.target as HTMLElement).closest('.gh-qa') ? 64 : 30;
      if (acc < gap || alive > 44) return; acc = 0;
      const s = STK[k++ % STK.length], el = document.createElement('span');
      el.className = 'gh-stk'; el.style.background = s[0]; el.innerHTML = s[1]; trail.appendChild(el); alive++;
      const r0 = (Math.random() - 0.5) * 70, vx = dx / (dist || 1), vy = dy / (dist || 1), sz = 0.72 + Math.random() * 0.42;
      el.animate([
        { transform: `translate(${x}px,${y}px) scale(0) rotate(${r0}deg)`, opacity: 1 },
        { transform: `translate(${x - vx * 8}px,${y - vy * 8}px) scale(${sz}) rotate(${r0 * 0.3}deg)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${x - vx * 20}px,${y - vy * 20 + 8}px) scale(${sz}) rotate(0deg)`, opacity: 1, offset: 0.68 },
        { transform: `translate(${x - vx * 30}px,${y - vy * 30 + 34}px) scale(0) rotate(${-r0 * 0.4}deg)`, opacity: 0 }],
      { duration: 2300, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => { el.remove(); alive--; };
    };
    const onLeave = () => { lx = null; };
    sec.addEventListener('pointermove', onMove);
    sec.addEventListener('pointerleave', onLeave);
    return () => { sec.removeEventListener('pointermove', onMove); sec.removeEventListener('pointerleave', onLeave); trail.replaceChildren(); };
  }, [reduced, mounted]);

  return (
    <section ref={ref} className="gh-faq" id="faq">
      {mounted && createPortal(<div ref={trailRef} className="gh-trail" aria-hidden="true" />, document.body)}
      <div className="gh-wrap">
        <div className="gh-faq-side"><h2 className="gh-h-display">Questions</h2><span className="gh-faq-hint">Move your cursor around this section.</span></div>
        <div className="gh-faq-list">
          {FAQ.map((f, i) => (
            <div key={f[0]} className={`gh-qa${open === i ? ' gh-open' : ''}`}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{f[0]}<i aria-hidden="true">+</i></button>
              <div className="gh-ans"><div><p>{f[1]}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
