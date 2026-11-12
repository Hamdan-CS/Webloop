import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { fetchFeaturedProjects } from '@/services/api';
import { art, type ArtKind } from '@/data/homeArt';
import type { Project } from '@/types';

const NT = 28;
const FRAMES = ['linear-gradient(135deg,#bfe3ff,#e7d6ff)', 'linear-gradient(135deg,#ffd1b8,#fff2be)', 'linear-gradient(135deg,#c9f1dc,#bfe3ff)', 'linear-gradient(135deg,#e4ccff,#ffd1e8)', 'linear-gradient(135deg,#fff2be,#c9f1dc)'];
const ART_KINDS: ArtKind[] = ['mountain', 'campus', 'city', 'code', 'cubes', 'dash', 'neural', 'notes', 'office', 'orb', 'phones', 'pixel', 'rays', 'sunset'] as ArtKind[];
const TYPE_LABEL: Record<string, string> = { student: 'Student project', company: 'Company brief', university: 'University lab' };

type Tile = { title: string; img: string; line: string; tags: string[]; href: string };
const sstep = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

function toTile(p: Project, i: number): Tile {
  const owner = (p as unknown as { owner?: { display_name?: string } }).owner?.display_name;
  const members = (p as unknown as { members?: unknown[] }).members?.length ?? 0;
  const status = String(p.status ?? '').replace(/_/g, ' ');
  return {
    title: p.title,
    img: p.cover_image_url || art(ART_KINDS[i % ART_KINDS.length], (i % 5) + 1),
    line: [TYPE_LABEL[String(p.project_type)] ?? 'Project', owner].filter(Boolean).join(' · ') + ` · ${members || p.team_size || 1} ${((members || p.team_size || 1) === 1) ? 'member' : 'members'}${status ? ` · ${status}` : ''}`,
    tags: [p.category, ...(((p as unknown as { skills?: { name?: string }[] }).skills ?? []).map((s) => s.name))].filter(Boolean).slice(0, 2) as string[],
    href: `/projects/${p.slug}`,
  };
}

/**
 * 7 · Curved project carousel (pinned 260%, scrub .8). The demo's renderArc
 * maths, unchanged: the arc opens up as it travels, tiles enter right and
 * leave left, the focal tile is largest; hover peeks, click selects. Fed by
 * the real published projects (fetchFeaturedProjects); tiles without a
 * cover use the site's own project artwork.
 */
export function ProjectArc({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const arcRef = useRef<HTMLDivElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shown, setShown] = useState(0);
  const [swap, setSwap] = useState(0);
  const state = useRef({ p: 0, enter: 1, sel: -1, hover: -1, focal: 0, shown: -2 });

  useEffect(() => { let live = true; fetchFeaturedProjects(16).then((d) => { if (live) setProjects(d); }).catch(() => {}); return () => { live = false; }; }, []);
  const base = useMemo(() => projects.map(toTile), [projects]);
  const tiles = useMemo(() => (base.length ? Array.from({ length: NT }, (_, i) => base[i % base.length]) : []), [base]);

  // per-frame layout (demo renderArc), redrawn only when inputs change
  useEffect(() => {
    const arc = arcRef.current;
    if (!arc || !tiles.length) return;
    const els = [...arc.querySelectorAll<HTMLElement>('.gh-at')];
    const arcEase = gsap.parseEase('power1.inOut');
    const showInfo = (i: number) => { const st = state.current; if (i === st.shown) return; st.shown = i; setShown(i); setSwap((n) => n + 1); };
    const render = (p: number, enter = 1) => {
      const st = state.current;
      const W = innerWidth, H = arc.clientHeight || innerHeight, mob = W < 768;
      const ts = mob ? 104 : Math.min(172, Math.max(124, W * 0.108));
      arc.style.setProperty('--ts', `${ts}px`);
      const e = arcEase(p);
      const R = (mob ? W * 1.1 : W * 0.44) * (1 + 0.7 * e);
      const yF = H * ((mob ? 0.56 : 0.6) - 0.05 * e) + (1 - enter) * H * 0.4;
      const cx = W / 2, cy = yF + R;
      const stepDeg = ((ts * 1.18) / R) * 180 / Math.PI;
      const c = 3 + 17 * p;
      let best = 1e9, bi = 0;
      els.forEach((t, i) => {
        const phi = (i - c) * stepDeg, d = Math.abs(phi);
        if (d > 100) { t.style.visibility = 'hidden'; return; }
        t.style.visibility = 'visible';
        const rad = (phi * Math.PI) / 180;
        const x = cx + R * Math.sin(rad), y = cy - R * Math.cos(rad);
        const f = sstep(1 - d / (32 + 18 * e));
        const s = (0.56 + 0.72 * f) * (i === st.sel ? 1.06 : 1);
        const o = d < 66 ? 1 : Math.max(0, 1 - (d - 66) / 24);
        t.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(phi * 0.85).toFixed(2)}deg) rotateY(${(-phi * 0.5).toFixed(1)}deg) scale(${s.toFixed(3)})`;
        t.style.opacity = o.toFixed(3);
        t.style.zIndex = String(Math.round(f * 100) + (i === st.hover ? 200 : 0));
        if (d < best) { best = d; bi = i; }
      });
      st.focal = bi;
      showInfo(st.sel >= 0 ? st.sel : st.hover >= 0 ? st.hover : st.focal);
    };
    let key = '';
    const tick = () => {
      const st = state.current;
      const k = `${st.p.toFixed(4)}|${st.enter.toFixed(3)}|${innerWidth}|${innerHeight}|${st.hover}|${st.sel}`;
      if (k !== key) { key = k; render(st.p, st.enter); }
    };
    if (reduced) { state.current.p = 0.45; state.current.enter = 1; }
    gsap.ticker.add(tick);
    const onOver = (ev: PointerEvent) => { const t = (ev.target as HTMLElement).closest<HTMLElement>('.gh-at'); state.current.hover = t ? Number(t.dataset.i) : -1; };
    const onLeave = () => { state.current.hover = -1; };
    const onFocus = (ev: FocusEvent) => { const t = (ev.target as HTMLElement).closest<HTMLElement>('.gh-at'); if (t) state.current.hover = Number(t.dataset.i); };
    const onClick = (ev: MouseEvent) => { const t = (ev.target as HTMLElement).closest<HTMLElement>('.gh-at'); if (!t) return; const i = Number(t.dataset.i), st = state.current; st.sel = st.sel === i ? -1 : i; els.forEach((x) => x.classList.toggle('gh-sel', Number(x.dataset.i) === st.sel)); };
    arc.addEventListener('pointerover', onOver); arc.addEventListener('pointerleave', onLeave); arc.addEventListener('focusin', onFocus); arc.addEventListener('click', onClick);
    return () => { gsap.ticker.remove(tick); arc.removeEventListener('pointerover', onOver); arc.removeEventListener('pointerleave', onLeave); arc.removeEventListener('focusin', onFocus); arc.removeEventListener('click', onClick); };
  }, [tiles, reduced]);

  useScrollScene(ref, (mm) => {
    const st = state.current;
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.to(st, { p: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=260%', pin: true, scrub: 0.8 } });
      gsap.fromTo(st, { enter: 0 }, { enter: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'top top', scrub: 0.8 } });
    });
    mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
      st.enter = 1;
      gsap.fromTo(st, { p: 0 }, { p: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
  });

  const info = tiles[shown] ?? tiles[0];
  return (
    <section ref={ref} className="gh-arc-sec" id="explore">
      <div className="gh-arc-hd"><span className="gh-mono">Explore</span><h2 className="gh-h-display" style={{ marginTop: 12 }}>Projects from every field</h2><p className="gh-lead">Scroll to move through them. Hover to peek, click to select.</p></div>
      <div ref={arcRef} className="gh-arc">
        {tiles.map((t, i) => (
          <button key={i} type="button" className="gh-at" data-i={i} aria-label={t.title}>
            <span className="gh-at-fr" style={{ ['--fr' as string]: FRAMES[i % FRAMES.length] }}><img alt="" src={t.img} decoding="async" loading="lazy" /></span>
          </button>
        ))}
      </div>
      {info && (
        <div key={swap} className={`gh-arc-info${swap > 1 ? ' gh-swap' : ''}`}>
          <img alt="" src={info.img} />
          <div className="gh-t"><b>{info.title}</b><small>{info.line}</small><div className="gh-tags">{info.tags.map((t) => <span key={t}>{t}</span>)}</div></div>
          <Link className="gh-go" to={info.href}>Open project →</Link>
        </div>
      )}
      <span className="gh-arc-hint">Scroll ↓</span>
    </section>
  );
}
