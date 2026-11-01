import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Box } from 'lucide-react';
import { createInfinityEngine, INF_NODES, INF_STEPS, type InfinityHandle, type InfNodeDef } from './engine';
import { supportsWebGL, prefersReducedMotion } from '@/components/contributions/webgl';

const NODE_ICON: Record<InfNodeDef['k'], React.ReactNode> = {
  students: <Users />,
  companies: <Briefcase />,
  projects: <Box />,
};
const NODE_BLURB: Record<InfNodeDef['k'], React.ReactNode> = {
  students: <><b>Students</b> bring skills and curiosity to projects that need them, and leave with real work to show. <em>Click to see student work.</em></>,
  companies: <><b>Companies</b> publish real briefs, mentor contributors and hire from visible work. <em>Click to discover companies.</em></>,
  projects: <><b>Projects</b> are where students and companies meet: tasks, commits and shipped products. <em>Click to explore projects.</em></>,
};

export function InfinityScene() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<InfinityHandle | null>(null);

  const [supported] = useState(() => supportsWebGL());
  const [hover, setHover] = useState(-1);
  const [step, setStep] = useState(0);

  const goTo = (n: InfNodeDef) => {
    if (n.go === 'gallery') navigate('/gallery');
    else if (n.go === 'companies') navigate('/companies');
    else if (n.go === 'explore') navigate('/explore');
  };

  useEffect(() => {
    const section = sectionRef.current, view = viewRef.current, canvas = canvasRef.current;
    if (!section || !view || !canvas || !supported) return;
    const handle = createInfinityEngine(section, view, canvas, {
      reduceMotion: prefersReducedMotion(),
      onStepChange: (i) => setStep(i),
      onProgress: (p) => { if (trackRef.current) trackRef.current.style.transform = `scaleX(${p.toFixed(3)})`; },
      onNodeLayout: (layouts) => {
        layouts.forEach(({ i, x, y, alpha, scale }) => {
          const el = nodeRefs.current[i];
          if (!el) return;
          el.style.left = `${x}px`; el.style.top = `${y}px`;
          el.style.opacity = alpha.toFixed(3);
          el.style.setProperty('--s', scale.toFixed(3));
          el.style.pointerEvents = alpha > 0.7 ? 'auto' : 'none';
        });
      },
    });
    handleRef.current = handle;
    return () => { handle.dispose(); handleRef.current = null; };
  }, [supported]);

  const info = hover >= 0 ? NODE_BLURB[INF_NODES[hover].k] : <><b>{INF_STEPS[step][0]}</b> {INF_STEPS[step][1]}</>;

  return (
    <section ref={sectionRef} className="ws-scene sec inf" aria-labelledby="h-rinf" style={{ paddingTop: 96, paddingBottom: 96 }}>
      <div className="wrap inf-grid">
        <div className="sec-hd inf-copy">
          <span className="eyebrow-link"><span className="dot" />WebLoop infinity</span>
          <h2 id="h-rinf" className="hr-h2" style={{ maxWidth: '22ch' }}>
            An infinite loop of ideas, people, and <span className="hl" style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>possibilities.</span>
          </h2>
          <p className="hr-lead" style={{ marginTop: 14 }}>Scroll to watch particles gather into the WebLoop loop, then connect students, companies and projects. Hover or click a node.</p>
          <div className="inf-info" aria-live="polite">{info}</div>
          <div className="inf-prog">
            <span className="inf-n">{String(step + 1).padStart(2, '0')} / {String(INF_STEPS.length).padStart(2, '0')}</span>
            <div className="inf-dots">
              {INF_STEPS.map((s, i) => (
                <button key={s[0]} type="button" className={i === step ? 'on' : i < step ? 'done' : ''} aria-label={`${i + 1}. ${s[0]}`} onClick={() => handleRef.current?.goToStep(i)} />
              ))}
            </div>
            <div className="inf-track"><i ref={trackRef} /></div>
          </div>
          <div className="inf-ctl">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleRef.current?.replay()}>Replay</button>
            <span className="inf-hint">Scroll to form the loop &middot; drag to rotate</span>
          </div>
        </div>

        <div className="inf-view" ref={viewRef}>
          {supported ? (
            <>
              <canvas ref={canvasRef} aria-label="3D infinity loop built from particles that connects students, companies and projects" role="img" />
              {INF_NODES.map((n, i) => (
                <button
                  key={n.k}
                  ref={(el) => { nodeRefs.current[i] = el; }}
                  type="button"
                  className={`inf-node${hover === i ? ' on' : ''}`}
                  aria-label={`${n.l}: ${n.s}. Go to ${n.go}`}
                  onPointerEnter={() => { setHover(i); handleRef.current?.setHover(i); }}
                  onPointerLeave={() => { setHover(-1); handleRef.current?.setHover(-1); }}
                  onFocus={() => { setHover(i); handleRef.current?.setHover(i); }}
                  onBlur={() => { setHover(-1); handleRef.current?.setHover(-1); }}
                  onClick={() => goTo(n)}
                >
                  {NODE_ICON[n.k]}
                  <b>{n.l}</b>
                  <small>{n.s}</small>
                </button>
              ))}
              <div className="rot-hint"><span>Drag to rotate</span></div>
            </>
          ) : (
            <div className="inf-fallback">3D view unavailable. Check your connection.</div>
          )}
        </div>
      </div>
    </section>
  );
}

export default InfinityScene;
