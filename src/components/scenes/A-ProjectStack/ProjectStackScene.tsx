// @ts-nocheck
/* Scene A — Project Stack, ported faithfully from the approved HTML reference
 * (webloop-motion-demo.html, section "A — PROJECT STACK" + its later
 * "REVISION" overrides). This is real DOM + CSS 3D transforms + a GSAP
 * ScrollTrigger pin/scrub — the same technique the reference uses — not a
 * WebGL canvas. Five layers (overview, team, tasks, contributions, result)
 * start stacked as one object and separate as the section is scrolled. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS, personOf, projectOwnerName } from '@/data/homeDemo';
import { art } from '@/data/homeArt';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';

const STACK_PROJECT = PROJECTS[0]; // Carbon Ledger — matches the prototype's Project Stack showcase
const STACK_MEMBER_KEYS = ['alex', 'maya', 'daniel']; // matches the prototype's MEM
const STACK_TEAM = STACK_MEMBER_KEYS.map((key) => {
  const p = personOf(key);
  return { key, name: p.name, role: p.role, female: p.female, skills: p.skills ?? [] };
});

let registered = false;
function ensureGSAP() {
  if (!registered) { gsap.registerPlugin(ScrollTrigger); registered = true; }
}

const STEPS = ['Project Overview', 'Team', 'Tasks', 'Contributions', 'Final Result'];
const TASK_DEFS = [
  { id: 0, title: 'Design dashboard', status: 'todo' as const },
  { id: 1, title: 'Set up database', status: 'todo' as const },
  { id: 2, title: 'Build API endpoints', status: 'prog' as const },
  { id: 3, title: 'Create UI components', status: 'prog' as const },
  { id: 4, title: 'Project setup', status: 'done' as const },
  { id: 5, title: 'User authentication', status: 'done' as const },
];
const HIDDEN_COUNT = { todo: 0, prog: 2, done: 16 } as const;
const TOTAL_TASKS = 24;
const COLUMNS: { key: 'todo' | 'prog' | 'done'; label: string; tone: '' | 'b' | 'g' }[] = [
  { key: 'todo', label: 'To Do', tone: '' },
  { key: 'prog', label: 'In Progress', tone: 'b' },
  { key: 'done', label: 'Completed', tone: 'g' },
];

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ProjectStackScene() {
  const project = STACK_PROJECT;
  const team = STACK_TEAM;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const swRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelWrapRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const goToRef = useRef<((i: number) => void) | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [tasks, setTasks] = useState(() => TASK_DEFS.map((t) => ({ ...t })));
  const [selMem, setSelMem] = useState(0);
  const [selRow, setSelRow] = useState(-1);

  const heat = useMemo(() => {
    const rng = mulberry32(7);
    return Array.from({ length: 3 }, () =>
      Array.from({ length: 32 }, (_, c) => {
        const l = rng() < 0.42 ? 0 : 1 + Math.floor(rng() * 4);
        return { level: l, n: l ? [0, 1, 3, 5, 8][l] + (c % 3) : 0 };
      }),
    );
  }, []);

  const cnt = (status: 'todo' | 'prog' | 'done') => HIDDEN_COUNT[status] + tasks.filter((t) => t.status === status).length;
  const done = cnt('done');
  const pct = Math.round((done / TOTAL_TASKS) * 100);

  const cycleTask = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: ({ todo: 'prog', prog: 'done', done: 'todo' } as const)[t.status] } : t)));
    focus(2);
  };

  function focus(i: number) {
    goToRef.current?.(i);
  }

  // ---- scroll-driven reveal + drag-rotate camera, matching the reference exactly ----
  useEffect(() => {
    ensureGSAP();
    const section = sectionRef.current, stage = stageRef.current, fit = fitRef.current, cam = camRef.current, stack = stackRef.current;
    if (!section || !stage || !fit || !cam || !stack) return;
    const sws = swRefs.current.filter(Boolean) as HTMLDivElement[];
    const labels = labelRefs.current.filter(Boolean) as HTMLDivElement[];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let px = 0, py = 0; // drag rotation offsets, degrees
    const LIM_Y = 34, LIM_X = 13;
    const bias = [[-3, -2], [-1.5, -1], [0, 0], [1.5, 1], [3, 2]];
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    function camTo(i: number) {
      cam.style.transform = `rotateX(${(py + bias[i][1]).toFixed(2)}deg) rotateY(${(px + bias[i][0]).toFixed(2)}deg)`;
    }

    let cur = -1;
    function setActive(i: number) {
      if (i === cur) return;
      cur = i;
      setActiveStep(i);
      labels.forEach((l, k) => l.classList.toggle('on', k === i));
      sws.forEach((s, k) => s.querySelector('.slab')?.classList.toggle('focus', k === i));
      camTo(i);
    }

    function placeLabels(tl?: gsap.core.Timeline) {
      if (window.innerWidth <= 1180 || !labelWrapRef.current || !sws.length) return;
      const p = tl?.progress();
      tl?.progress(1, true);
      const wrapRect = labelWrapRef.current.getBoundingClientRect();
      sws.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (labels[i]) labels[i].style.top = `${r.top + r.height / 2 - wrapRect.top}px`;
      });
      if (tl && p !== undefined) tl.progress(p, true);
    }

    function layout() {
      const wide = window.innerWidth > 900;
      fit.style.setProperty('--fit', '1');
      fit.style.height = '';
      const r = stack.getBoundingClientRect();
      const aH = wide ? stage.clientHeight - 8 : 1e5;
      const aW = stage.clientWidth;
      const fitS = clamp(Math.min((aH / r.height) * 0.97, (aW / r.width) * (wide ? 0.9 : 0.78)), 0.28, 1.35);
      fit.style.setProperty('--fit', fitS.toFixed(3));
    }

    let st: ScrollTrigger | undefined;
    const mm = gsap.matchMedia();

    mm.add('(min-width: 901px)', () => {
      sws.forEach((s, i) => gsap.set(s, { z: i * 28 }));
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      sws.forEach((s, i) => {
        if (!i) return;
        tl.fromTo(s, { autoAlpha: 0, y: -130, z: i * 28 - 260, rotateX: -14 }, { autoAlpha: 1, y: 0, z: i * 28, rotateX: 0, duration: 1 }, i - 1);
      });
      tl.fromTo(stack, { rotateY: -23, rotateX: 27 }, { rotateY: -18, rotateX: 23, duration: 4, ease: 'none' }, 0);

      st = ScrollTrigger.create({
        trigger: section, start: 'top top', end: '+=230%', pin: true, scrub: 0.9, animation: tl, anticipatePin: 1,
        onUpdate: (self) => setActive(clamp(Math.ceil(self.progress * 4 - 0.001), 0, 4)),
      });
      layout(); placeLabels(tl); setActive(0);
      goToRef.current = (i: number) => {
        const y = st!.start + (st!.end - st!.start) * (i / 4) + (i ? 4 : 0);
        window.scrollTo({ top: y, behavior: 'smooth' });
      };
      const onResize = () => { layout(); placeLabels(tl); ScrollTrigger.refresh(); };
      window.addEventListener('resize', onResize);
      return () => { window.removeEventListener('resize', onResize); goToRef.current = null; };
    });

    mm.add('(max-width: 900px)', () => {
      sws.forEach((s, i) => {
        gsap.set(s, { z: i * 16 });
        if (!reduce) gsap.from(s, { autoAlpha: 0, y: 50, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%' } });
      });
      gsap.set(stack, { rotateY: -9, rotateX: 10 });
      labels.forEach((l) => l.classList.add('on'));
      setActiveStep(0);
      layout();
      goToRef.current = (i: number) => {
        setActive(i);
        sws[i]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      };
      const onResize = () => { layout(); ScrollTrigger.refresh(); };
      window.addEventListener('resize', onResize);
      return () => { window.removeEventListener('resize', onResize); goToRef.current = null; };
    });

    // real bounded drag-rotation (mouse + touch)
    let drag: { x: number; y: number; px: number; py: number; moved: number; mouse: boolean } | null = null;
    let suppressClick = false;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      drag = { x: e.clientX, y: e.clientY, px, py, moved: 0, mouse: e.pointerType === 'mouse' };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved < 6) return;
      stage.classList.add('drag');
      px = clamp(drag.px + dx * 0.16, -LIM_Y, LIM_Y);
      if (drag.mouse) py = clamp(drag.py - dy * 0.08, -LIM_X, LIM_X);
      camTo(Math.max(cur, 0));
    };
    const onPointerUp = () => {
      if (drag && drag.moved >= 6) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
      drag = null;
      stage.classList.remove('drag');
    };
    const onStageClickCapture = (e: MouseEvent) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } };
    const onDblClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-reset]')) return;
      px = 0; py = 0; camTo(Math.max(cur, 0));
    };
    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('click', onStageClickCapture, true);
    stage.addEventListener('dblclick', onDblClick);

    return () => {
      mm.revert();
      st?.kill();
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('click', onStageClickCapture, true);
      stage.removeEventListener('dblclick', onDblClick);
    };
  }, []);

  const labelInfo = [
    { sub: null, more: <><b>{project.name}</b> &middot; {projectOwnerName(project)}<br />{project.tech.slice(0, 4).join(', ')}</> },
    { sub: <span className="ref-avs">{team.map((m) => <IllustratedAvatar key={m.key} personKey={m.key} name={m.name} female={m.female} size={28} />)}</span>, more: <><b>{team[selMem]?.name}</b><br />{team[selMem]?.role}</> },
    { sub: <>{TOTAL_TASKS} tasks<div className="mini-bar" style={{ height: 6, borderRadius: 3, background: 'var(--heat-0)', marginTop: 6, overflow: 'hidden', width: 130 }}><i style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--cyan), var(--blue))', borderRadius: 3 }} /></div></>, more: <><b>{cnt('done')}</b> done &middot; <b>{cnt('prog')}</b> in progress &middot; <b>{cnt('todo')}</b> to do<br />Click a task in the layer to move it forward.</> },
    { sub: <><b style={{ color: 'var(--text)', fontSize: 15 }}>+128</b> commits <span className="muted" style={{ color: 'var(--muted)' }}>Last 30 days</span></>, more: selRow < 0 ? 'Select a contributor in the layer to isolate their activity.' : <><b>{team[selRow]?.name}</b> &middot; {heat[selRow]?.reduce((a, c) => a + c.n, 0)} commits in the last 32 days</> },
    { sub: 'A real, working project', more: <>Live at <b>carbonledger.app</b></> },
  ];

  return (
    <section ref={sectionRef} id="stack" className="ws-scene home-sec" aria-labelledby="h-rstack">
      <div className="wrap wide stack-grid">
        <div className="stack-copy">
          <h2 id="h-rstack" className="hr-h2" style={{ maxWidth: 'none' }}>A project is more than an <span className="hl" style={{ background: 'linear-gradient(90deg, var(--accent-text, var(--cyan)), var(--blue))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>idea.</span></h2>
          <p className="hr-lead">Every WebLoop project is built from people, tasks, contributions, and an outcome.</p>
          <ol className="ref-steps" aria-label="Project layers">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  ref={(el) => { stepRefs.current[i] = el; }}
                  className={`ref-step${i === activeStep ? ' on' : ''}`}
                  onClick={() => focus(i)}
                  aria-label={`Focus layer ${i + 1}: ${s}`}
                >
                  <b>{String(i + 1).padStart(2, '0')}</b>{s}
                </button>
              </li>
            ))}
          </ol>
          <div className="ref-scroll-hint"><span className="ref-mouse" /><span>Scroll to explore each layer</span></div>
        </div>

        <div className="stack-stage" ref={stageRef} tabIndex={0} aria-label="Interactive 3D project stack. Drag to rotate.">
          <div className="stack-floor" />
          <div className="stack-fit" ref={fitRef}>
            <div className="stack-cam" ref={camRef}>
              <div className="ref-stack" ref={stackRef}>
                {/* Layer 0 — Overview */}
                <div className="ref-sw" ref={(el) => { swRefs.current[0] = el; }}>
                  <div className="slab">
                    <i className="sd l" /><i className="sd r" /><i className="sd t" /><i className="sd b" />
                    <div className="slab-hd"><i style={{ background: '#ff6058' }} /><i style={{ background: '#ffbd2e' }} /><i style={{ background: '#28c940' }} /><span className="brand">WebL&#8734;p</span><span className="ref-badge rb-prog">In Progress</span></div>
                    <div className="ov">
                      <div>
                        <div className="ic-app"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M12 3v18M3 12h18" /></svg></div>
                        <h3>{project.name}</h3>
                        <p>{project.tagline}</p>
                        <p style={{ marginTop: -2 }}>{project.desc}</p>
                        <div className="ref-tags">
                          {project.tech.slice(0, 4).map((s) => <span key={s} className="ref-tag">{s}</span>)}
                          {project.tech.length > 4 && <span className="ref-tag">+{project.tech.length - 4}</span>}
                        </div>
                      </div>
                      <div className="art" style={{ backgroundImage: `url("${art(...project.art)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    </div>
                  </div>
                </div>

                {/* Layer 1 — Team */}
                <div className="ref-sw" ref={(el) => { swRefs.current[1] = el; }}>
                  <div className="slab">
                    <i className="sd l" /><i className="sd r" /><i className="sd t" /><i className="sd b" />
                    <div className="team-row">
                      {team.map((m, i) => (
                        <div key={m.key} className={`pcard${i === selMem ? ' picked' : ''}`} tabIndex={0} onClick={() => { setSelMem(i); setSelRow(i); focus(1); }}>
                          <IllustratedAvatar personKey={m.key} name={m.name} female={m.female} size={58} className="pcard-av" />
                          <div>
                            <b>{m.name.split(' ')[0]}</b>
                            <small>{m.role}</small>
                            <div className="ref-tags">
                              {m.skills.map((s) => <span key={s} className="ref-tag">{s}</span>)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="ref-plus" role="button" tabIndex={0} aria-label="Invite contributor">+</div>
                    </div>
                  </div>
                </div>

                {/* Layer 2 — Tasks */}
                <div className="ref-sw" ref={(el) => { swRefs.current[2] = el; }}>
                  <div className="slab">
                    <i className="sd l" /><i className="sd r" /><i className="sd t" /><i className="sd b" />
                    <div className="kan">
                      {COLUMNS.map((col) => (
                        <div key={col.key}>
                          <h4>{col.label} <em>{cnt(col.key)}</em></h4>
                          {tasks.filter((t) => t.status === col.key).map((t) => (
                            <div key={t.id} className="ref-task" role="button" tabIndex={0} onClick={() => cycleTask(t.id)} aria-label={`${t.title}: ${col.label}. Activate to advance`}>
                              <span className={`ref-ck ${col.tone}`} />{t.title}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Layer 3 — Contributions */}
                <div className="ref-sw" ref={(el) => { swRefs.current[3] = el; }}>
                  <div className="slab" style={{ background: '#0b1220', color: '#fff' }}>
                    <i className="sd l" /><i className="sd r" /><i className="sd t" /><i className="sd b" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: 28 }}>Contributions</h3>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Sample activity &middot; illustrative</p>
                      </div>
                      <span className="ref-badge" style={{ background: 'rgba(34,211,238,.18)', color: '#67e8f9' }}>&#9679; live</span>
                    </div>
                    <div className="heat">
                      <div className="who">
                        {team.map((m, i) => (
                          <div key={m.key} className={selRow === i ? 'on' : ''} onClick={() => { setSelRow(selRow === i ? -1 : i); focus(3); }} role="button" tabIndex={0} style={{ color: selRow === i ? 'var(--accent)' : '#cbd5e1' }}>
                            <IllustratedAvatar personKey={m.key} name={m.name} female={m.female} size={26} className="pcard-av" /> {m.name.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                      <div className="hgrid">
                        {heat.map((row, r) => (
                          <div key={r} className={`hrow${selRow >= 0 && selRow !== r ? ' dim' : ''}`} style={{ ['--cols' as any]: 32 }}>
                            {row.map((c, i) => <i key={i} className="hc tp" data-l={c.level} title={`${team[r]?.name.split(' ')[0]} · ${c.n} commit${c.n === 1 ? '' : 's'}`} />)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Layer 4 — Final Result */}
                <div className="ref-sw" ref={(el) => { swRefs.current[4] = el; }}>
                  <div className="slab" style={{ padding: 10 }}>
                    <i className="sd l" /><i className="sd r" /><i className="sd t" /><i className="sd b" />
                    <div className="browser">
                      <div className="bbar"><i /><i /><i /><span>carbonledger.app</span></div>
                      <div className="bbody">
                        <div className="t">
                          <h4>Track. Reduce. Grow.</h4>
                          <p>{project.desc}</p>
                          <div className="row"><b>Get Started</b><u>Watch Demo</u></div>
                        </div>
                        <div className="bbody-art" style={{ backgroundImage: `url("${art('mountain', 3)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rot-hint" data-no-reset><span>Drag to rotate</span></div>
        </div>

        <aside className="stack-labels" ref={labelWrapRef} aria-label="Layer details">
          {STEPS.map((s, i) => (
            <div
              key={s}
              ref={(el) => { labelRefs.current[i] = el; }}
              className={`slabel${i === activeStep ? ' on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => focus(i)}
            >
              <span>{s}</span>
              {labelInfo[i].sub != null && <small className="sub">{labelInfo[i].sub}</small>}
              <span className="more">{labelInfo[i].more}</span>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}

export default ProjectStackScene;
