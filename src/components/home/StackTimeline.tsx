import { useEffect, useRef, useState } from 'react';
import { PROJECTS, personOf, projectOwnerName } from '@/data/homeDemo';
import { IllustratedAvatar } from '@/components/scenes/shared/IllustratedAvatar';
import './StackTimeline.css';

/**
 * Mobile / tablet (≤ 900px) stand-in for the 3D Project Stack.
 * Same five layers and the same demo numbers as ProjectStackScene, laid out as
 * a vertical timeline. Motion is CSS only (opacity + transform, one
 * IntersectionObserver), so it costs almost nothing on phones.
 */
const PROJECT = PROJECTS[0]; // Carbon Ledger, as in the 3D stack
const TEAM = ['alex', 'maya', 'daniel'].map((k) => personOf(k));
const TOTAL_TASKS = 24;
const DONE_TASKS = 18; // 16 hidden + 2 visible "done" tasks in the 3D stack
const PCT = Math.round((DONE_TASKS / TOTAL_TASKS) * 100);

type Layer = { title: string; sub?: React.ReactNode; more: React.ReactNode };

const LAYERS: Layer[] = [
  {
    title: 'Project Overview',
    more: (
      <>
        <b>{PROJECT.name}</b> · {projectOwnerName(PROJECT)}
        <span className="stl-chips">{PROJECT.tech.slice(0, 4).map((t) => <span key={t}>{t}</span>)}</span>
      </>
    ),
  },
  {
    title: 'Team',
    sub: (
      <span className="stl-avs">
        {TEAM.map((m) => <IllustratedAvatar key={m.key} personKey={m.key} name={m.name} female={m.female} size={28} />)}
      </span>
    ),
    more: <>{TEAM.map((m) => m.name).join(', ')} · {TEAM.map((m) => m.role).join(' · ')}</>,
  },
  {
    title: 'Tasks',
    sub: (
      <>
        {TOTAL_TASKS} tasks
        <span className="stl-bar" aria-hidden="true"><i style={{ width: `${PCT}%` }} /></span>
      </>
    ),
    more: <><b>{DONE_TASKS}</b> done · <b>4</b> in progress · <b>2</b> to do</>,
  },
  {
    title: 'Contributions',
    sub: <><b className="stl-num">+128</b> commits <span className="stl-muted">Last 30 days</span></>,
    more: <>Alex, Maya and Daniel shipped work every week this month.</>,
  },
  {
    title: 'Final Result',
    sub: 'A real, working project',
    more: <>Live at <b>carbonledger.app</b></>,
  },
];

export default function StackTimeline() {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<boolean[]>(() => LAYERS.map(() => false));

  useEffect(() => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-i]') ?? []);
    if (!items.length || typeof IntersectionObserver === 'undefined') {
      setSeen(LAYERS.map(() => true));
      return;
    }
    // reveal each layer once as it enters the lower part of the screen
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const i = Number((e.target as HTMLElement).dataset.i);
        setSeen((s) => (s[i] ? s : s.map((v, j) => (j === i ? true : v))));
        reveal.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    // the layer crossing the middle band of the screen becomes the open card
    const focus = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); });
    }, { rootMargin: '-42% 0px -42% 0px' });
    items.forEach((el) => { reveal.observe(el); focus.observe(el); });
    return () => { reveal.disconnect(); focus.disconnect(); };
  }, []);

  const fill = ((active + 1) / LAYERS.length) * 100;

  return (
    <section id="stack" className="stl" aria-labelledby="h-stl">
      <div className="stl-head">
        <h2 id="h-stl" className="stl-h2">A project is more than an <span className="stl-hl">idea.</span></h2>
        <p className="stl-lead">Every WebLoop project is built from people, tasks, contributions, and an outcome.</p>
      </div>

      <ol ref={listRef} className="stl-list" aria-label="Project layers" style={{ '--stl-fill': `${fill}%` } as React.CSSProperties}>
        {LAYERS.map((l, i) => (
          <li
            key={l.title}
            data-i={i}
            className={`stl-item${seen[i] ? ' is-in' : ''}${i === active ? ' is-on' : ''}`}
            style={{ '--d': `${i * 60}ms` } as React.CSSProperties}
            aria-current={i === active ? 'step' : undefined}
          >
            <span className="stl-dot" aria-hidden="true" />
            <div className="stl-card">
              <h3 className="stl-title">{l.title}</h3>
              {l.sub && <div className="stl-sub">{l.sub}</div>}
              <div className="stl-more"><div>{l.more}</div></div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
