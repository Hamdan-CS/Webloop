/* Scene F — Project Showcase, ported from webloop-home-demo_3.html
 * ("F · SHOWCASE"). A collage of floating cards (code snippet, emissions
 * chart, screenshot, main browser preview, secondary project card) that
 * assemble together as the section scrolls into view — the same GSAP
 * ScrollTrigger timeline as the prototype's `showcase()` IIFE, next to a
 * 4-step "how a project ships" pipeline. Demonstration data only — see
 * src/data/homeDemo.ts. */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS, personOf } from '@/data/homeDemo';
import { art } from '@/data/homeArt';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';

let registered = false;
function ensureGSAP() {
  if (!registered) { gsap.registerPlugin(ScrollTrigger); registered = true; }
}

const MAIN = PROJECTS[0]; // Carbon Ledger
const SECOND = PROJECTS[2]; // StudyFlow

const PIPELINE = [
  { n: 1, title: 'Idea posted', body: 'A student, company, or university shares a brief.' },
  { n: 2, title: 'Team forms', body: 'Contributors join by skill and availability.' },
  { n: 3, title: 'Work in the open', body: 'Tasks, commits and milestones stay visible.' },
  { n: 4, title: 'Shipped', body: 'A live product with real people behind it.' },
];

export function ProjectShowcaseScene() {
  const navigate = useNavigate();
  const mainTeam = MAIN.team.slice(0, 3).map((k) => personOf(k));
  const [pipeOn, setPipeOn] = useState(0);
  const openProject = (id: string) => navigate(`/projects/demo-${id}`);

  const layersRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const shotsRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureGSAP();
    const L = layersRef.current;
    const code = codeRef.current, chart = chartRef.current, shots = shotsRef.current, main = mainRef.current, card2 = card2Ref.current;
    if (!L || !code || !chart || !shots || !main || !card2) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setPipeOn(3); return; }

    gsap.set(main, { z: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo(main, { rotationY: 0, rotationX: 0, scale: 0.82, z: -120 }, { rotationY: -10, rotationX: 4, scale: 1, z: 60, duration: 1 }, 0)
      .fromTo(code, { x: 200, y: 60, z: -300, opacity: 0, rotationY: 30 }, { x: 0, y: 0, z: -60, opacity: 1, rotationY: 24, duration: 1 }, 0)
      .fromTo(chart, { x: -200, y: 60, z: -300, opacity: 0, rotationY: -30 }, { x: 0, y: 0, z: -20, opacity: 1, rotationY: -18, duration: 1 }, 0.1)
      .fromTo(shots, { x: -120, y: 80, z: -200, opacity: 0, rotationY: -30 }, { x: 0, y: 0, z: 90, opacity: 1, rotationY: -14, duration: 1 }, 0.2)
      .fromTo(card2, { x: 120, y: 90, z: -200, opacity: 0 }, { x: 0, y: 0, z: 150, opacity: 1, rotationY: 12, duration: 1 }, 0.3);

    const st = ScrollTrigger.create({
      trigger: L, start: 'top 85%', end: 'center 45%', scrub: 0.8, animation: tl,
      onUpdate: (self) => setPipeOn(Math.min(3, Math.floor(self.progress * 4))),
    });

    return () => { st.kill(); };
  }, []);

  return (
    <section id="showcase" className="ws-scene home-sec" aria-labelledby="h-show">
      <div className="wrap show-grid">
        <div className="sec-hd" style={{ margin: 0 }}>
          <h2 id="h-show" className="hr-h2">Discover what people are <span className="hl">building.</span></h2>
          <p className="hr-lead" style={{ marginTop: 14 }}>Explore real projects, the people behind them, and the work that makes them possible. Ideas get shipped here.</p>
          <div className="pipeline">
            {PIPELINE.map((p, i) => (
              <div key={p.n} className={`pipe${i <= pipeOn ? ' on' : ''}`}>
                <b>{p.n}</b>
                <div><strong>{p.title}</strong><span>{p.body}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="layers" ref={layersRef} style={{ transformStyle: 'preserve-3d' }}>
          <div className="ly code" ref={codeRef} aria-hidden="true" style={{ transformStyle: 'preserve-3d' }}>
            <span className="c">// carbon-ledger/src/report.ts</span><br />
            <span className="k">export async function</span> <span className="f">buildReport</span>(org) {'{'}<br />
            &nbsp;&nbsp;<span className="k">const</span> rows = <span className="k">await</span> db<br />
            &nbsp;&nbsp;&nbsp;&nbsp;.<span className="f">from</span>(<span className="s">'emissions'</span>)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;.<span className="f">select</span>(<span className="s">'*'</span>)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;.<span className="f">eq</span>(<span className="s">'org'</span>, org.id)<br />
            &nbsp;&nbsp;<span className="k">return</span> <span className="f">summarise</span>(rows)<br />
            {'}'}<br /><br />
            <span className="c">// PR #42 &middot; merged</span>
          </div>

          <div className="ly chart" ref={chartRef} aria-hidden="true" style={{ transformStyle: 'preserve-3d' }}>
            <h4 style={{ fontSize: 13, marginBottom: 10 }}>Emissions, last 6 months</h4>
            <svg viewBox="0 0 220 110" width="100%">
              <defs><linearGradient id="showcase-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".45" /><stop offset="1" stopColor="var(--cyan)" stopOpacity="0" /></linearGradient></defs>
              <path d="M0 20 L40 32 L80 28 L120 55 L160 62 L220 88 L220 110 L0 110Z" fill="url(#showcase-chart-fill)" />
              <path d="M0 20 L40 32 L80 28 L120 55 L160 62 L220 88" fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="ly shots" ref={shotsRef} aria-hidden="true" style={{ transformStyle: 'preserve-3d' }}>
            <img src={art('dash', 1)} alt="" width={260} height={190} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div
            className="ly main"
            ref={mainRef}
            style={{ transformStyle: 'preserve-3d', cursor: 'pointer' }}
            role="link"
            tabIndex={0}
            aria-label={`Open ${MAIN.name} project details`}
            onClick={() => openProject(MAIN.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(MAIN.id); } }}
          >
            <div className="browser">
              <div className="bbar"><i /><i /><i /><span>carbonledger.app</span></div>
              <div className="bbody">
                <div className="t">
                  <h4>Track. Reduce. Grow.</h4>
                  <p>A sustainability data platform for modern businesses.</p>
                  <div className="row"><b>Get Started</b><u>Watch Demo</u></div>
                </div>
                <div style={{ backgroundImage: `url("${art('mountain', 3)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
            </div>
            <div className="meta">
              <span className="ref-avs">{mainTeam.map((p) => <IllustratedAvatar key={p.key} personKey={p.key} name={p.name} female={p.female} size={28} />)}</span>
              <span style={{ marginLeft: -8 }}>+{MAIN.team.length - mainTeam.length} contributors</span>
              <span style={{ marginLeft: 'auto' }} className="ref-badge rb-prog">In progress</span>
            </div>
          </div>

          <div
            className="ly card2"
            ref={card2Ref}
            style={{ transformStyle: 'preserve-3d', cursor: 'pointer' }}
            role="link"
            tabIndex={0}
            aria-label={`Open ${SECOND.name} project details`}
            onClick={() => openProject(SECOND.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(SECOND.id); } }}
          >
            <h4>{SECOND.name}</h4>
            <p>{SECOND.tagline}</p>
            <div className="ref-tags">
              {SECOND.tech.slice(0, 2).map((t) => <span key={t} className="ref-tag">{t}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProjectShowcaseScene;
