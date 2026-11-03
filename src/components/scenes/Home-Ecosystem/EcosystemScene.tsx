import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, Landmark, Briefcase, Box, Users, ArrowUpRight, X } from 'lucide-react';
import { ENTITIES, REGIONS, restView, viewRect, type EntityDef, type View } from './campusData';
import { createCampusEngine, type CampusHandle, type PinLayout } from './campusEngine';
import { supportsWebGL, prefersReducedMotion } from '@/components/contributions/webgl';
import { useTheme } from '@/components/theme/ThemeProvider';
import './campus.css';

const ENTITY_ICON: Record<EntityDef['k'], React.ReactNode> = {
  students: <GraduationCap />,
  universities: <Landmark />,
  companies: <Briefcase />,
  projects: <Box />,
  teams: <Users />,
};

const HEAD = [
  { t: 'Where' }, { t: 'ideas,' }, { t: 'people' }, { t: 'and' }, { t: 'industry' }, { t: 'build' },
  { t: 'real', hl: true }, { t: 'projects.', hl: true },
];

const BASE = `${import.meta.env.BASE_URL}ecosystem/`;
const isStacked = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1000px)').matches;
const hasWebGL2 = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};

export function EcosystemScene() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const copyRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgDark = useRef<HTMLImageElement>(null);
  const imgLight = useRef<HTMLImageElement>(null);
  const engine = useRef<CampusHandle | null>(null);
  const [gl, setGl] = useState(() => supportsWebGL() && hasWebGL2());
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState(-1);
  const [focus, setFocus] = useState(-1);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // copy reveal: headline words rise out of a mask, the rest fades up
  useLayoutEffect(() => {
    const el = copyRef.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.set('.hc-w > span', { yPercent: 115, rotate: 3 });
      gsap.set('.hc-in', { opacity: 0, y: 14 });
      const tl = gsap.timeline({ delay: 0.25, defaults: { ease: 'power3.out' } });
      tl.to('.hc-in.eyebrow-link', { opacity: 1, y: 0, duration: 0.7 })
        .to('.hc-w > span', { yPercent: 0, rotate: 0, duration: 1.0, stagger: 0.07 }, '-=0.45')
        .to('.hc-in:not(.eyebrow-link)', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12 }, '-=0.6');
    }, el);
    return () => ctx.revert();
  }, []);

  // while a building is framed, the copy slides away so the scene has the stage
  const panelRef = useRef<HTMLDivElement>(null);
  const lastShown = useRef(0);
  const firstFocus = useRef(true);
  useEffect(() => {
    const el = copyRef.current; if (!el) return;
    if (firstFocus.current) { firstFocus.current = false; if (focus < 0) return; }
    if (isStacked()) return;
    const hide = focus >= 0;
    if (prefersReducedMotion()) { el.style.opacity = hide ? '0' : '1'; el.style.visibility = hide ? 'hidden' : 'visible'; return; }
    gsap.killTweensOf(el);
    if (hide) gsap.to(el, { opacity: 0, x: -48, filter: 'blur(6px)', duration: 0.65, ease: 'power3.in', onComplete: () => { el.style.visibility = 'hidden'; } });
    else { el.style.visibility = 'visible'; gsap.to(el, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', delay: 0.25, clearProps: 'filter,transform' }); }
  }, [focus]);

  // role panel: lives in the clear silver area, content rises in from the left
  useEffect(() => {
    const el = panelRef.current; if (!el) return;
    const kids = Array.from(el.children);
    gsap.killTweensOf(kids);
    if (focus >= 0) {
      el.style.visibility = 'visible';
      if (prefersReducedMotion()) { gsap.set(kids, { opacity: 1, x: 0, filter: 'none' }); return; }
      gsap.fromTo(kids, { opacity: 0, x: -40, filter: 'blur(8px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.85, ease: 'power3.out', stagger: 0.09, delay: 0.3, clearProps: 'filter' });
    } else {
      if (prefersReducedMotion()) { el.style.visibility = 'hidden'; return; }
      gsap.to(kids, { opacity: 0, x: -28, duration: 0.4, ease: 'power2.in', stagger: 0.03, onComplete: () => { if (panelRef.current) panelRef.current.style.visibility = 'hidden'; } });
    }
  }, [focus]);

  const goTo = useCallback((entity: EntityDef) => {
    if (entity.go === 'gallery') navigate('/gallery');
    else if (entity.go === 'companies') navigate('/companies');
    else if (entity.go === 'explore') navigate('/explore');
    else if (entity.go === 'join') navigate(entity.role ? `/join?role=${entity.role}` : '/join');
    else if (entity.go === 'team') document.getElementById('stack')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [navigate]);

  // Pin + fallback-image placement share the same view maths as the shader.
  // Approximate footprint of a resting pin label (icon + one-word title pill).
  const PIN_W = 150, PIN_H = 38;
  const place = useCallback((pins: PinLayout[], _view?: View) => {
    const stage = stageRef.current; if (!stage) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    const copy = !isStacked() && !document.getElementById('home')?.classList.contains('is-focus') ? document.querySelector<HTMLElement>('.home-copy') : null;
    const sr = stage.getBoundingClientRect();
    const cr = copy?.getBoundingClientRect();
    const placed: { x: number; y: number }[] = [];
    pins.forEach((p, i) => {
      const el = pinRefs.current[i]; if (!el) return;
      let { x, y } = p;
      const side = REGIONS[i].side;
      // keep pins clear of the copy column on desktop
      if (cr && y > cr.top - sr.top - 10 && y < cr.bottom - sr.top + 10) x = Math.max(x, cr.right - sr.left + 22);
      const focused = !!document.getElementById('home')?.classList.contains('is-focus') && !isStacked();
      const out = (focused && x < W * 0.27) || x < 12 || y < 12 || x > W - 12 || y > H - 12 || y < 76;
      // two neighbouring labels can otherwise land on top of each other and
      // become unreadable; nudge this one down until it clears the others
      for (const q of placed) {
        if (Math.abs(x - q.x) < PIN_W && Math.abs(y - q.y) < PIN_H) y = q.y + PIN_H;
      }
      placed.push({ x, y });
      el.style.visibility = out && !p.on ? 'hidden' : 'visible';
      x = Math.min(W - 16, Math.max(16, x)); y = Math.min(H - 16, Math.max(16, y));
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.dataset.side = side;
      el.classList.toggle('on', p.on);
    });
  }, []);

  // resting layout used before GL is ready, without GL, and for the base <img> fallback
  useEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    const run = () => {
      const W = stage.clientWidth, H = stage.clientHeight;
      const v = restView(W, H, isStacked());
      const [ox, oy, sw, sh] = viewRect(W, H, v);
      const px = sw >= 0.999 ? 50 : (ox / (1 - sw)) * 100, py = sh >= 0.999 ? 50 : (oy / (1 - sh)) * 100;
      for (const img of [imgDark.current, imgLight.current]) if (img) img.style.objectPosition = `${px}% ${py}%`;
      if (gl && ready) return;
      place(REGIONS.map((r) => ({ x: ((r.anchor[0] / 1672 - ox) / sw) * W, y: ((r.anchor[1] / 941 - oy) / sh) * H, on: false })), v);
    };
    run();
    const ro = new ResizeObserver(run); ro.observe(stage);
    return () => ro.disconnect();
  }, [gl, ready, place]);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas || !gl) return;
    const h = createCampusEngine(canvas, stage, {
      base: BASE,
      reduceMotion: prefersReducedMotion(),
      light: themeRef.current === 'light',
      stacked: isStacked,
      onReady: () => { canvas.dataset.ready = '1'; setReady(true); },
      onFail: () => { setGl(false); },
      onFrame: place,
      onHover: setHover,
      onFocus: setFocus,
    });
    engine.current = h;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') h.focus(-1); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); h.dispose(); engine.current = null; setReady(false); };
  }, [gl, place]);

  useEffect(() => { engine.current?.setTheme(theme === 'light'); }, [theme]);

  const pinHover = (i: number) => engine.current?.setHover(i);

  const activeRegion = focus >= 0 ? focus : hover;
  const activeEntity = activeRegion >= 0 ? ENTITIES[REGIONS[activeRegion].e] : null;
  if (focus >= 0) lastShown.current = focus;
  const panelEntity = ENTITIES[REGIONS[lastShown.current].e];

  return (
    <section id="home" className={`home ws-scene home-hero campus${focus >= 0 ? ' is-focus' : ''}`} aria-labelledby="h-rhome" style={{ paddingTop: isStacked() ? 72 : 96 }}>
      <div className="wrap home-grid">
        <div className="home-copy" ref={copyRef}>
          <span className="eyebrow-link hc-in"><span className="dot" />The WebLoop Ecosystem</span>
          <h1 id="h-rhome" className="hr-h1 hc-h1" aria-label="Where ideas, people and industry build real projects.">
            {HEAD.map((w, i) => (
              <span key={i} aria-hidden="true"><span className="hc-w"><span className={w.hl ? 'hc-hl' : undefined}>{w.t}</span></span>{' '}</span>
            ))}
          </h1>
          <div className="home-cta hr-cta hc-in">
            <button type="button" className="hr-btn primary" onClick={() => navigate('/join')}><Sparkles size={15} /> Join WebLoop</button>
            <button type="button" className="hr-btn" onClick={() => navigate('/explore')}>Explore Projects</button>
          </div>
        </div>
      </div>

      <div className="eco campus-eco" id="eco">
        <div className={`eco-stage campus-stage${ready ? ' is-ready' : ''}`} ref={stageRef}>
          <div className="campus-fallback" aria-hidden="true">
            <img ref={imgDark} className="cf-dark" src={`${BASE}campus-dark.webp`} alt="" decoding="async" draggable={false} />
            <img ref={imgLight} className="cf-light" src={`${BASE}campus-light.webp`} alt="" decoding="async" draggable={false} />
          </div>
          {gl && <canvas ref={canvasRef} className="campus-canvas" role="img" aria-label="Interactive WebLoop campus: students, universities, companies, projects and teams" />}
          <div className="campus-scrim" aria-hidden="true" />
          <div className="campus-veil" aria-hidden="true" />
          <div className="eco-pins">
            {REGIONS.map((r, i) => {
              const e = ENTITIES[r.e];
              return (
                <div
                  key={r.key}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  className="eco-pin"
                  data-side={r.side}
                >
                  <span className="eco-pin-dot" aria-hidden="true" />
                  <div
                    className="eco-card"
                    role="link"
                    tabIndex={0}
                    aria-label={`${e.t}: ${e.items.join(', ')}`}
                    onMouseEnter={() => pinHover(i)}
                    onMouseLeave={() => pinHover(-1)}
                    onFocus={() => pinHover(i)}
                    onBlur={() => pinHover(-1)}
                    onClick={() => engine.current?.focus(focus === i ? -1 : i)}
                    onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); engine.current?.focus(focus === i ? -1 : i); } }}
                  >
                    <h3>{ENTITY_ICON[e.k]}{e.t}</h3>
                    <ul>{e.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                    
                  </div>
                </div>
              );
            })}
          </div>
          <div className="eco-panel" ref={panelRef} aria-live="polite">
            <span className="eco-panel-k">{ENTITY_ICON[panelEntity.k]}Role in WebLoop</span>
            <h2 className="eco-panel-t">{panelEntity.t}</h2>
            <p className="eco-panel-p">{panelEntity.blurb}</p>
            <button type="button" className="hr-btn primary eco-panel-b" onClick={() => goTo(panelEntity)}>{panelEntity.cta} <ArrowUpRight size={15} /></button>
          </div>
          {focus >= 0 && (
            <button type="button" className="eco-back" onClick={() => engine.current?.focus(-1)}><X size={14} /> Back to campus</button>
          )}
        </div>

        {/* stacked / touch layout: tap a role to frame it, then open it */}
        <div className="eco-list" role="group" aria-label="Ecosystem roles">
          <div className="eco-list-row">
            {REGIONS.map((r, i) => {
              const e = ENTITIES[r.e];
              return (
                <button key={r.key} type="button" className={`eco-chip${focus === i ? ' on' : ''}`} onClick={() => engine.current?.focus(focus === i ? -1 : i)} aria-pressed={focus === i}>
                  {ENTITY_ICON[e.k]}{e.t}
                </button>
              );
            })}
          </div>
          {activeEntity && focus >= 0 && (
            <div className="eco-detail">
              <p>{activeEntity.blurb}</p>
              <button type="button" className="hr-btn primary" onClick={() => goTo(activeEntity)}>{activeEntity.cta} <ArrowUpRight size={14} /></button>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

export default EcosystemScene;
