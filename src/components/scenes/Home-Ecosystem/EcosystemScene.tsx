import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, Landmark, Briefcase, Box, Users, CheckCircle2, Zap, Search, GitCommit } from 'lucide-react';
import { createEcosystemEngine, ENTITIES, type EntityDef } from './engine';
import { supportsWebGL, prefersReducedMotion } from '@/components/contributions/webgl';

const ENTITY_ICON: Record<EntityDef['k'], React.ReactNode> = {
  students: <GraduationCap />,
  universities: <Landmark />,
  companies: <Briefcase />,
  projects: <Box />,
  teams: <Users />,
};

export function EcosystemScene() {
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [supported] = useState(() => supportsWebGL());
  const [hover, setHover] = useState(-1);

  const goTo = (entity: EntityDef) => {
    if (entity.go === 'gallery') navigate('/gallery');
    else if (entity.go === 'companies') navigate('/companies');
    else if (entity.go === 'explore') navigate('/explore');
    else if (entity.go === 'join') navigate(entity.role ? `/join?role=${entity.role}` : '/join');
    else if (entity.go === 'team') document.getElementById('stack')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas || !supported) return;
    const handle = createEcosystemEngine(canvas, stage, {
      reduceMotion: prefersReducedMotion(),
      onNavigate: (entity) => goTo(entity),
      onHoverChange: (i) => setHover(i),
      getCardSize: (i) => {
        const el = cardRefs.current[i];
        return { w: el?.offsetWidth || 150, h: el?.offsetHeight || 40 };
      },
      onCardLayout: (layouts) => {
        layouts.forEach(({ i, x, y, alpha, on }) => {
          const el = cardRefs.current[i];
          if (!el) return;
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          el.style.setProperty('--a', alpha > 0.98 ? '1' : alpha > 0 ? String(0.001 + alpha) : '0');
          el.style.zIndex = on ? '6' : '2';
          el.classList.toggle('on', on);
        });
      },
    });
    return () => handle.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const howItems = useMemo(
    () => [
      { label: 'Discover', body: 'Real project opportunities', icon: <Search />, onClick: () => navigate('/explore') },
      { label: 'Form a Team', body: 'Find the right collaborators', icon: <Users />, onClick: () => document.getElementById('stack')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      { label: 'Build', body: 'Turn ideas into working solutions', icon: <GitCommit />, onClick: () => document.getElementById('home-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      { label: 'Verify', body: 'Get your work validated', icon: <CheckCircle2 />, onClick: () => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
      { label: 'Grow', body: 'Gain experience and career opportunities', icon: <Zap />, onClick: () => document.getElementById('companies')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    ],
    [navigate],
  );

  return (
    <section id="home" className="home ws-scene home-hero" aria-labelledby="h-rhome" style={{ paddingTop: 96 }}>
      <div className="wrap home-grid">
        <div className="home-copy">
          <span className="eyebrow-link"><span className="dot" />The WebLoop Ecosystem</span>
          <h1 id="h-rhome" className="hr-h1" style={{ fontSize: 'clamp(32px, 3.3vw, 50px)', lineHeight: 1.07 }}>
            A unified platform where ideas, people and industry build{' '}
            <em style={{ fontStyle: 'normal', background: 'linear-gradient(90deg, var(--inf-a, var(--cyan)), var(--inf-b, var(--blue)) 55%, var(--inf-c, var(--violet)))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              real projects.
            </em>
          </h1>
          <p className="hr-lead">Bring students, universities, companies, and teams together to turn ideas into working solutions, verified experience, and real opportunities.</p>
          <div className="home-cta hr-cta">
            <button type="button" className="hr-btn primary" onClick={() => navigate('/join')}><Sparkles size={15} /> Join WebLoop</button>
            <button type="button" className="hr-btn" onClick={() => navigate('/explore')}>Explore Projects</button>
          </div>
          <ul className="home-feat">
            <li><CheckCircle2 /><b>Real Projects</b><span>Work on industry-relevant challenges</span></li>
            <li><Box /><b>Verified Work</b><span>Show real contributions and build your profile</span></li>
            <li><Zap /><b>Real Opportunities</b><span>Get hired, collaborate, and grow your career</span></li>
          </ul>
        </div>

        <div className="eco" id="eco">
          <div className="eco-stage" ref={stageRef}>
            {supported ? (
              <>
                <canvas ref={canvasRef} aria-label="Interactive 3D WebLoop ecosystem: students, universities, companies, projects and teams around the WebLoop core" role="img" tabIndex={0} />
                <div className="eco-cards">
                  {ENTITIES.map((e, i) => (
                    <div
                      key={e.k}
                      ref={(el) => { cardRefs.current[i] = el; }}
                      className={`eco-card${hover === i ? ' on' : ''}`}
                      role="link"
                      tabIndex={0}
                      aria-label={`${e.t}: ${e.items.join(', ')}`}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover((h) => (h === i ? -1 : h))}
                      onClick={() => goTo(e)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); goTo(e); } }}
                    >
                      <h3>{ENTITY_ICON[e.k]}{e.t}</h3>
                      <ul>{e.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                    </div>
                  ))}
                </div>
                <div className="rot-hint eco-hint"><span>Drag to rotate &middot; hover or click a platform</span></div>
              </>
            ) : (
              <div className="eco-fallback">3D view needs WebGL. The ecosystem: Students, Universities, Companies, Projects and Teams around WebLoop.</div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        <ol className="how" aria-label="How it works">
          <li className="how-t"><b>How it works?</b></li>
          {howItems.map((h) => (
            <li key={h.label}>
              <a href="#" onClick={(e) => { e.preventDefault(); h.onClick(); }}>
                <span className="hi">{h.icon}</span>
                <span><b>{h.label}</b><em>{h.body}</em></span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default EcosystemScene;
