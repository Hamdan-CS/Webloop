import { useMemo, useRef, useState } from 'react';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene, SCENE_MEDIA } from '@/design-system/motion/useScrollScene';
import { Wordmark } from '@/components/navigation/Wordmark';
import { ActivityFeed } from '@/components/shared/ui/ActivityFeed';
import { FEED_ITEMS, seeded, level } from './homeContent';

const TABS = ['Activity', 'Brief', 'Team', 'Tasks', 'Result'];

/**
 * 3 · Expanding card (pinned 260%, scrub .8). A small "New project" card
 * grows into a full project app with a live activity feed, a cursor walks
 * to "Start project", the button presses, and a stack-coloured flood
 * spreads from it carrying the protected stack's title — the hand-off into
 * FrozenStack directly below. Mobile / reduced motion: shown expanded.
 */
export function ExpandingCard() {
  const ref = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(0);
  const [count, setCount] = useState(128);
  const heat = useMemo(() => { const r = seeded(11); return Array.from({ length: 100 }, (_, i) => level(r, (Math.floor(i / 5) / 20) * 0.5)); }, []);

  useScrollScene(ref, (mm) => {
    mm.add(SCENE_MEDIA.desktop, () => {
      const el = ref.current!;
      const card = el.querySelector<HTMLElement>('.gh-xcard')!;
      const btn = el.querySelector<HTMLElement>('.start')!;
      const cur = el.querySelector<HTMLElement>('.gh-cursor')!;
      const flood = el.querySelector<HTMLElement>('.gh-flood')!;
      const W = () => Math.min(1120, innerWidth * 0.9);
      const H = () => innerHeight * 0.78;
      const at = () => { const r = btn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: '+=260%', pin: true, scrub: 0.8, invalidateOnRefresh: true } });
      tl.to(card, { width: W, height: H, borderRadius: 32, ease: 'power2.inOut', duration: 1.2 })
        .to('.gh-xseed', { opacity: 0, scale: 0.8, duration: 0.3 }, '<.1')
        .to('.gh-xapp', { opacity: 1, duration: 0.4 }, '<.5')
        .to('.gh-xcap', { opacity: 0, duration: 0.2 }, '<')
        .set(cur, { opacity: 0 })
        .fromTo(cur, { x: () => innerWidth * 0.2, y: () => innerHeight * 0.85, opacity: 0 }, {
          x: () => { const { r } = at(); return r.left + r.width * 0.55; },
          y: () => { const { r } = at(); return r.top + r.height * 0.6; }, opacity: 1, duration: 0.8, ease: 'power2.inOut',
        }, '+=.3')
        .to(btn, { scale: 0.9, duration: 0.08 }).to(btn, { scale: 1, duration: 0.12 })
        .fromTo(flood, { clipPath: () => { const p = at(); return `circle(0px at ${p.x}px ${p.y}px)`; } },
          { clipPath: () => { const p = at(); return `circle(${Math.hypot(innerWidth, innerHeight) * 1.1}px at ${p.x}px ${p.y}px)`; }, duration: 1, ease: 'power2.in' })
        .to(cur, { opacity: 0, duration: 0.2 }, '<.3')
        .from('.gh-flood h2, .gh-flood p', { y: 60, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=.35')
        .to({}, { duration: 0.4 });
      return () => gsap.set(card, { clearProps: 'all' });
    });
  });

  return (
    <section ref={ref} className="gh-expand" id="expand" aria-label="A brief becomes a project">
      <div className="stage">
        <div className="gh-xcard">
          <div className="gh-xcard-in">
            <div className="gh-xseed"><div className="plus" aria-hidden="true">+</div><small>New project</small></div>
            <div className="gh-xapp">
              <aside className="gh-xside" aria-hidden="true">
                <Wordmark />
                <a className="on"><i />Studyflow</a><a><i />Briefs</a><a><i />Team</a><a><i />Portfolio</a><a><i />Settings</a>
              </aside>
              <div className="gh-xmain">
                <div className="gh-xtop">
                  <h4>Studyflow</h4>
                  <span className="gh-chip">Sprint 4 of 6</span>
                  <span data-orb="brief" data-orb-scale=".5" data-orb-alt=".gh-xseed .plus" style={{ width: 84, height: 42, display: 'block' }} />
                  <button type="button" className="start" tabIndex={-1}>Start project</button>
                </div>
                <div className="gh-xtabs" role="tablist" aria-label="Project sections">
                  {TABS.map((t, i) => (
                    <button key={t} type="button" role="tab" aria-selected={i === tab} className={i === tab ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>
                  ))}
                </div>
                <div className="gh-xgrid">
                  <ActivityFeed items={FEED_ITEMS} stream max={5} onVerified={() => setCount((c) => c + 1)} />
                  <div className="gh-xpanel">
                    <span className="gh-mono" style={{ fontSize: 11 }}>Contributions · 20 weeks</span>
                    <div className="gh-heat" aria-hidden="true">{heat.map((v, i) => <i key={i} className={`l${v}`} />)}</div>
                    <div className="gh-bignum"><span>{count}</span><small>verified contributions</small></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <svg className="gh-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#0a0d12" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        <p className="gh-xcap">A brief becomes a project the moment a team starts it.</p>
        <div className="gh-flood" aria-hidden="true"><div><h2>A project is more <br />than an <em>idea.</em></h2><p>Here's what one is made of.</p></div></div>
      </div>
    </section>
  );
}
