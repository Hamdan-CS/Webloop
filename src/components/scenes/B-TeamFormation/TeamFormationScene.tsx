// @ts-nocheck
/* Scene B — Team Formation, ported faithfully from the approved HTML
 * reference (section "B — TEAM FORMATION" + its "REVISION" overrides).
 * Seven members sit at fixed percentage spots around a core project card;
 * SVG lines draw in from each member to the core once the section is
 * visible. Real DOM + SVG + a small rAF loop for the line curves and a
 * subtle pointer-parallax sway — the same technique as the reference. */
import { useEffect, useRef, useState } from 'react';
import { fetchFeaturedProjects } from '@/services/api';
import { DEMO_TEAM, DEMO_PROJECTS, type ShowcaseMember, type ShowcaseProject } from '../shared/demoData';
import { PersonAvatar } from '../shared/PersonAvatar';

// [member, xPercent, yPercent] — the reference's exact asymmetric layout
const SPOTS: [number, number][] = [
  [12, 32], // Alex
  [32, 9], // Maya
  [68, 9], // Daniel
  [13, 74], // Sara
  [50, 91], // Adam
  [88, 32], // Emma
  [87, 74], // Noah
];

function useFeaturedProject() {
  const [project, setProject] = useState<ShowcaseProject>(DEMO_PROJECTS[0]);
  useEffect(() => {
    let active = true;
    fetchFeaturedProjects(1).then((real) => {
      const p = real[0];
      if (!active || !p) return;
      setProject({
        id: p.id, name: p.title, category: p.category ?? 'Project', desc: p.summary,
        stack: (p.skills ?? []).map((s) => s.name), status: p.status, cols: ['#0e7490', '#22d3ee'],
        stats: '', demo: false, team: [],
      });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return project;
}

export function TeamFormationScene() {
  const project = useFeaturedProject();
  const members: (ShowcaseMember & { spot: [number, number] })[] = DEMO_TEAM.map((m, i) => ({ ...m, spot: SPOTS[i] }));

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const memberElRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coreRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drawRef = useRef<number[]>(members.map(() => 0));

  const [sel, setSel] = useState(-1);
  const [hov, setHov] = useState(-1);
  const [invited, setInvited] = useState<boolean[]>(() => members.map((_, i) => i !== 6)); // last slot (Noah/QA) open by default

  const active = sel >= 0 ? sel : hov;
  const joinedCount = invited.filter(Boolean).length;
  const allJoined = joinedCount === members.length;

  // ---- reveal the connector lines once the scene is visible, then animate ----
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let visible = false;
    let drawn = false;
    let mx = 0, my = 0, tmx = 0, tmy = 0;

    const onPointerMove = (e: PointerEvent) => {
      const b = stage.getBoundingClientRect();
      tmx = (e.clientX - b.left) / b.width - 0.5;
      tmy = (e.clientY - b.top) / b.height - 0.5;
    };
    const onPointerLeave = () => { tmx = 0; tmy = 0; };
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerleave', onPointerLeave);

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || window.innerWidth <= 960) return;
      const t = performance.now() / 1000;
      mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
      const W = stage.clientWidth, H = stage.clientHeight, cx = W / 2, cy = H / 2;
      svgRef.current?.setAttribute('viewBox', `0 0 ${W} ${H}`);
      members.forEach((m, i) => {
        const still = i === sel;
        const d = 0.5 + Math.abs(m.spot[0] - 50) / 60;
        const fx = reduce || still ? 0 : Math.sin(t * 0.7 + i * 1.1) * 8 + mx * -26 * d;
        const fy = reduce || still ? 0 : Math.cos(t * 0.6 + i * 1.1) * 10 + my * -18 * d;
        const el = memberElRefs.current[i];
        if (el) el.style.transform = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0)`;
        const px = (m.spot[0] / 100) * W + fx, py = (m.spot[1] / 100) * H + fy;
        const dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, bend = len * 0.14 * (i % 2 ? 1 : -1);
        const qx = (cx + px) / 2 + nx * bend, qy = (cy + py) / 2 + ny * bend;
        const path = pathRefs.current[i];
        if (path) {
          path.setAttribute('d', `M${cx} ${cy}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`);
          path.setAttribute('stroke-dashoffset', (1 - drawRef.current[i]).toFixed(3));
        }
        const dot = dotRefs.current[i];
        if (dot) {
          if (drawRef.current[i] > 0.98 && invited[i] && !reduce) {
            const L = path?.getTotalLength() ?? 0;
            const tt = (t * (i === active ? 0.5 : 0.22) + i * 0.13) % 1;
            const pt = path?.getPointAtLength(L * (1 - tt));
            if (pt) { dot.setAttribute('cx', String(pt.x)); dot.setAttribute('cy', String(pt.y)); }
            dot.setAttribute('opacity', Math.sin(tt * Math.PI).toFixed(2));
          } else dot.setAttribute('opacity', '0');
        }
      });
      if (coreRef.current) coreRef.current.style.transform = reduce ? '' : `translate3d(${(mx * 10).toFixed(1)}px, ${(Math.sin(t * 0.8) * 5 + my * 8).toFixed(1)}px, 0)`;
      ringRefs.current.forEach((r, i) => {
        if (!r) return;
        r.style.translate = `calc(-50% + ${(mx * (8 + i * 6)).toFixed(1)}px) calc(-50% + ${(my * (4 + i * 3)).toFixed(1)}px)`;
      });
    }
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !drawn) {
        drawn = true;
        members.forEach((_, i) => {
          const start = performance.now() + (300 + i * 180);
          const dur = 1600;
          function step(now: number) {
            const p = reduce ? 1 : Math.max(0, Math.min(1, (now - start) / dur));
            drawRef.current[i] = p * p * (3 - 2 * p);
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      }
    }, { threshold: 0.15 });
    io.observe(stage);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, active, invited]);

  const toggleInvite = (i: number) => {
    setInvited((prev) => prev.map((v, k) => (k === i ? !v : v)));
  };

  return (
    <section id="team" className="ws-scene" aria-labelledby="h-rteam" style={{ paddingTop: 96, paddingBottom: 96, scrollMarginTop: 80 }}>
      <div className="wrap">
        <div className="sec-hd center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, marginBottom: 48 }}>
          <h2 id="h-rteam" className="hr-h2" style={{ maxWidth: '26ch' }}>
            Great things happen when the right people <span className="hl" style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>connect.</span>
          </h2>
          <p className="hr-lead" style={{ maxWidth: '60ch', marginInline: 'auto' }}>
            Bring different skills together and turn individual ideas into a collaborative team. Each line below is a contribution to <b>{project.name}</b>, coloured by discipline.
          </p>
        </div>

        <div className="team-stage" ref={stageRef}>
          <div className="ref-ring r3" ref={(el) => { ringRefs.current[2] = el; }} />
          <div className="ref-ring r2" ref={(el) => { ringRefs.current[1] = el; }} />
          <div className="ref-ring r1" ref={(el) => { ringRefs.current[0] = el; }} />
          <svg className="lines" ref={svgRef} aria-hidden="true">
            {members.map((m, i) => (
              <path
                key={i}
                ref={(el) => { pathRefs.current[i] = el; }}
                fill="none"
                stroke={m.cols[1]}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
                strokeWidth={i === active ? 3.4 : invited[i] ? 1.8 : 1.2}
                strokeOpacity={(sel >= 0 || hov >= 0) && i !== active ? 0.15 : invited[i] ? 0.8 : 0.3}
              />
            ))}
            {members.map((m, i) => (
              <circle key={`n${i}`} r={5} fill={m.cols[1]} opacity={invited[i] ? 0.95 : 0.35} cx={0} cy={0} style={{ transform: 'translate(-9999px,-9999px)' }} />
            ))}
            {members.map((m, i) => (
              <circle key={`d${i}`} ref={(el) => { dotRefs.current[i] = el; }} r={4} fill={m.cols[1]} opacity={0} />
            ))}
          </svg>

          <div className="team-core" ref={coreRef}>
            <div className="art" style={{ background: 'linear-gradient(135deg, #0e7490, #22d3ee)', width: '100%', height: 130, borderRadius: 12 }} />
            <b>{project.name}</b>
            <small>{project.category}</small>
            <div className="need">
              <span className={`ref-badge ${allJoined ? 'rb-done' : 'rb-rec'}`}>{allJoined ? 'Team complete' : 'Recruiting: QA'}</span>
            </div>
          </div>

          {members.map((m, i) => (
            <div
              key={i}
              ref={(el) => { memberElRefs.current[i] = el; }}
              className={`member${i === active ? ' hot' : ''}${i === sel ? ' picked' : ''}`}
              style={{ left: `${m.spot[0]}%`, top: `${m.spot[1]}%`, ['--c' as any]: m.cols[1] }}
              tabIndex={0}
              role="button"
              aria-expanded={i === sel}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(-1)}
              onClick={() => setSel(sel === i ? -1 : i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(sel === i ? -1 : i); } if (e.key === 'Escape') setSel(-1); }}
            >
              <PersonAvatar name={m.name} cols={m.cols} size={48} />
              <div>
                <b>{m.name}</b>
                <small>{m.role}</small>
                {[m.role.split(' ')[0]].map((s, k) => <span key={k} className="skill">{s}</span>)}
              </div>
              {i === sel && (
                <div className="xtra">
                  <div className="row"><span>Commits</span><b>{18 + i * 7}</b></div>
                  <div className="row"><span>Tasks closed</span><b>{3 + i * 2}</b></div>
                  <div className="row"><span>Focus</span><b>{m.role}</b></div>
                  <button
                    type="button"
                    className={`btn ${invited[i] ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={(e) => { e.stopPropagation(); toggleInvite(i); }}
                  >
                    {invited[i] ? 'Remove from team' : 'Invite to project'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="team-legend">
          {members.map((m, i) => (
            <span key={i}><i style={{ background: m.cols[1] }} />{m.role}</span>
          ))}
        </div>
        <p className="team-hint">Select a contributor to see their profile and invite them to the project.</p>
      </div>
    </section>
  );
}

export default TeamFormationScene;
