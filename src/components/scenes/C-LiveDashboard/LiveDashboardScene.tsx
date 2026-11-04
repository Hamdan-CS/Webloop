/* Scene D — Live Dashboard, ported faithfully from the approved HTML
 * reference (webloop-motion-demo_2.html, section "8 — D. LIVE DASHBOARD"
 * + its "REVISION" overrides + the `dashboard()` IIFE). A tilted glass
 * panel — real DOM + CSS 3D, no WebGL — with four tabs: Overview (donut,
 * KPIs, team, milestones, task-progress bars, commit chart, activity
 * feed), Tasks (add/filter/cycle/delete), Team, Activity. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { IllustratedAvatar } from '../shared/IllustratedAvatar';
import { PROJECTS, personOf } from '@/data/homeDemo';
import { art } from '@/data/homeArt';

const DASH_PROJECT = PROJECTS[0]; // Carbon Ledger — same demo project as the Project Stack section

type Area = 'Frontend' | 'Backend' | 'Design' | 'QA';
type Status = 'todo' | 'prog' | 'done';
const AREAS: Area[] = ['Frontend', 'Backend', 'Design', 'QA'];
const AREA_COLOR: Record<Area, string> = { Frontend: 'var(--blue)', Backend: 'rgb(var(--accent-500))', Design: 'rgb(var(--signal-violet))', QA: '#f59e0b' };
const AREA_OWNER_KEY: Record<Area, string> = { Frontend: 'alex', Backend: 'maya', Design: 'daniel', QA: 'noah' }; // matches the prototype's WHO map

interface Task { id: number; t: string; area: Area; st: Status }
let uid = 0;
const T = (t: string, area: Area, st: Status): Task => ({ id: ++uid, t, area, st });
const INITIAL_TASKS: Task[] = [
  ...['Project setup', 'Design tokens', 'Auth screens', 'Report table', 'Emission charts', 'Onboarding flow', 'Settings page', 'Export dialog'].map((t) => T(t, 'Frontend', 'done')),
  ...['Database schema', 'User authentication', 'Auth API endpoints', 'Emissions ingest', 'Role-based access', 'Webhooks'].map((t) => T(t, 'Backend', 'done')),
  T('Report builder API', 'Backend', 'prog'), T('Audit log', 'Backend', 'todo'),
  ...['Brand kit', 'Dashboard wireframes', 'Component library', 'Empty states'].map((t) => T(t, 'Design', 'done')),
  T('Mobile layouts', 'Design', 'prog'),
  T('End-to-end suite', 'QA', 'prog'), T('Accessibility audit', 'QA', 'prog'), T('Load testing', 'QA', 'todo'),
];
const MEMB_KEYS = ['alex', 'maya', 'daniel', 'sara', 'adam', 'noah']; // matches the prototype's MEMB exactly
const MEMB = MEMB_KEYS.map((key) => personOf(key));
const COMMITS: Record<string, number> = { alex: 42, maya: 51, daniel: 35, sara: 19, adam: 23, noah: 8 };
interface Ev { who: string; t: string; a: string }
const NEW_EVENTS: [string, string][] = [
  ['sara', 'opened a pull request for report export'], ['noah', 'added 12 regression tests'], ['adam', 'deployed staging build #48'],
  ['alex', 'merged \u201cdashboard filters\u201d'], ['maya', 'closed issue #31'], ['daniel', 'shared new empty-state designs'],
];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BASE_EVENTS: Ev[] = [
  { who: 'alex', t: 'pushed new code', a: '2 hours ago' },
  { who: 'maya', t: 'completed API integration', a: '5 hours ago' },
  { who: 'daniel', t: 'updated the design system', a: '1 day ago' },
  { who: 'sara', t: 'trained the emissions model v2', a: '2 days ago' },
  { who: 'adam', t: 'deployed staging build #47', a: '2 days ago' },
];
const MILESTONES: { name: string; date: string; areas: Area[] }[] = [
  { name: 'Design', date: 'Jan 10', areas: ['Design'] },
  { name: 'Development', date: 'Feb 15', areas: ['Frontend', 'Backend'] },
  { name: 'Testing', date: 'Mar 20', areas: ['QA'] },
  { name: 'Launch', date: 'Apr 30', areas: ['Frontend', 'Backend', 'Design', 'QA'] },
];
const COMMITS_MONTH = [3, 5, 4, 8, 6, 9, 12, 7, 10, 14, 9, 16, 11, 14];
const COMMITS_WEEK = [9, 16, 11, 14, 12, 8, 10];

export function LiveDashboardScene() {
  const project = DASH_PROJECT;
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [tab, setTab] = useState<'ov' | 'tk' | 'tm' | 'ac'>('ov');
  const [range, setRange] = useState<'m' | 'w'>('m');
  const [filterSt, setFilterSt] = useState<'all' | Status>('all');
  const [filterArea, setFilterArea] = useState<'all' | Area>('all');
  const [filterWho, setFilterWho] = useState<string>('all');
  const [newTask, setNewTask] = useState('');
  const [newArea, setNewArea] = useState<Area>('Frontend');
  const [events, setEvents] = useState<Ev[]>(BASE_EVENTS);
  const donutRef = useRef<SVGCircleElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const visRef = useRef(false);
  const nextEv = useRef(0);

  /* live simulated feed — newest on top, older "just now" entries age (reference `ev()`) */
  const pushEvent = (who: string, t: string) =>
    setEvents((prev) => [{ who, t, a: 'just now' }, ...prev.map((e, i) => (i >= 0 && e.a === 'just now' ? { ...e, a: i + 1 < 3 ? 'a moment ago' : 'earlier' } : e))]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const rm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver((es) => es.forEach((e) => { visRef.current = e.isIntersecting; }), { threshold: 0.25 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (!visRef.current || rm) return;
      const n = NEW_EVENTS[nextEv.current++ % NEW_EVENTS.length];
      pushEvent(n[0], n[1]);
    }, 6000);
    return () => { io.disconnect(); window.clearInterval(id); };
  }, []);

  const tiltRef = useRef<HTMLDivElement>(null);
  const canTilt = () => window.innerWidth > 960 && !!window.matchMedia?.('(pointer: fine)').matches && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const onTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || !canTilt()) return;
    const b = el.getBoundingClientRect();
    el.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
    el.style.transform = `rotateX(${(-((e.clientY - b.top) / b.height - 0.5) * 4).toFixed(2)}deg) rotateY(${(((e.clientX - b.left) / b.width - 0.5) * 6).toFixed(2)}deg)`;
  };
  const onTiltLeave = () => { if (tiltRef.current) tiltRef.current.style.transform = ''; };

  const done = tasks.filter((t) => t.st === 'done').length;
  const prog = tasks.filter((t) => t.st === 'prog').length;
  const todo = tasks.filter((t) => t.st === 'todo').length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  useEffect(() => {
    if (donutRef.current) donutRef.current.style.strokeDashoffset = String(314 * (1 - pct / 100));
  }, [pct]);

  const msDone = useMemo(() => {
    const all = (areas: Area[]) => tasks.filter((t) => areas.includes(t.area)).every((t) => t.st === 'done');
    return MILESTONES.map((m) => all(m.areas));
  }, [tasks]);
  let msStep = 0; while (msStep < MILESTONES.length && msDone[msStep]) msStep++;
  const mp = Math.max(0, msStep - 1) / 3 * 75;

  const cycleTask = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const st = ({ todo: 'prog', prog: 'done', done: 'todo' } as const)[t.st];
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, st } : x)));
    pushEvent(AREA_OWNER_KEY[t.area], st === 'done' ? `completed \u201c${t.t}\u201d` : st === 'prog' ? `started \u201c${t.t}\u201d` : `reopened \u201c${t.t}\u201d`);
  };
  const deleteTask = (id: number) => {
    const t = tasks.find((x) => x.id === id);
    setTasks((prev) => prev.filter((x) => x.id !== id));
    if (t) pushEvent(AREA_OWNER_KEY[t.area], `removed \u201c${t.t}\u201d`);
  };
  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [T(newTask.trim(), newArea, 'todo'), ...prev]);
    pushEvent(AREA_OWNER_KEY[newArea], `added \u201c${newTask.trim()}\u201d`);
    setNewTask('');
  };
  const openTasksFor = (area: Area) => { setFilterArea(area); setTab('tk'); };

  const filteredTasks = tasks.filter((t) => (filterSt === 'all' || t.st === filterSt) && (filterArea === 'all' || t.area === filterArea));
  const STATUS_LABEL: Record<Status, string> = { todo: 'To do', prog: 'In progress', done: 'Done' };
  const filteredFeed = filterWho === 'all' ? events : events.filter((e) => e.who === filterWho);

  const commitData = range === 'm' ? COMMITS_MONTH : COMMITS_WEEK;
  const commitDate = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (commitData.length - 1 - i) * (range === 'm' ? 2 : 1));
    return `${MON[d.getMonth()]} ${d.getDate()}`;
  };
  const commitMax = Math.max(...commitData);
  const commitSum = commitData.reduce((a, b) => a + b, 0);

  return (
    <section id="home-dashboard" className="ws-scene home-sec" aria-labelledby="h-rdash">
      <div className="wrap split">
        <div className="sec-hd">
          <h2 id="h-rdash" className="hr-h2" style={{ maxWidth: '18ch' }}>From collaboration to measurable <span className="hl" style={{ background: 'linear-gradient(90deg, var(--cyan), var(--blue))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>progress.</span></h2>
          <p className="hr-lead" style={{ marginTop: 14 }}>Companies and teams can see what is happening inside a project, task by task and commit by commit.</p>
          <span className="demo-note" style={{ marginTop: 14 }}>Demonstration data · activity feed is simulated</span>
        </div>

        <div className="dash-stage" ref={stageRef}>
          <div className="dash-tilt" ref={tiltRef} onPointerMove={onTiltMove} onPointerLeave={onTiltLeave}>
          <div className="dash">
            <div className="dash-top">
              <h3><span className="art" style={{ backgroundImage: `url("${art(...project.art)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />{project.name}</h3>
              <div className="d-tabs" role="tablist">
                <button type="button" className={tab === 'ov' ? 'on' : ''} role="tab" onClick={() => setTab('ov')}>Overview</button>
                <button type="button" className={tab === 'tk' ? 'on' : ''} role="tab" onClick={() => setTab('tk')}>Tasks</button>
                <button type="button" className={tab === 'tm' ? 'on' : ''} role="tab" onClick={() => setTab('tm')}>Team</button>
                <button type="button" className={tab === 'ac' ? 'on' : ''} role="tab" onClick={() => setTab('ac')}>Activity</button>
              </div>
              <span className="live-dot">Live</span>
            </div>

            {tab === 'ov' && (
              <div className="dpane" id="p-ov">
                <div className="dgrid">
                  <div className="dcell">
                    <div className="donut-wrap">
                      <button type="button" className="donut" aria-label="Project progress. Open tasks" onClick={() => setTab('tk')}>
                        <svg viewBox="0 0 120 120">
                          <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--blue)" /></linearGradient></defs>
                          <circle className="bg" cx="60" cy="60" r="50" />
                          <circle ref={donutRef} className="fg" cx="60" cy="60" r="50" style={{ strokeDashoffset: 314 }} />
                        </svg>
                        <b>{pct}<span>%</span></b>
                      </button>
                      <div className="kpis">
                        <div><b>{total}</b>Total tasks</div>
                        <div><b className="c1">{done}</b>Completed</div>
                        <div><b className="c2">{prog}</b>In progress</div>
                        <div><b>{todo}</b>Remaining</div>
                      </div>
                    </div>
                  </div>
                  <div className="dcell">
                    <h4>Team members <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('tm')}>Invite</button></h4>
                    <div className="ref-avs" style={{ display: 'flex' }}>
                      {MEMB.slice(0, 4).map((m) => <IllustratedAvatar key={m.key} personKey={m.key} name={m.name} female={m.female} size={34} className="pcard-av" />)}
                      <span style={{ width: 34, height: 34 }}>+{MEMB.length - 4}</span>
                    </div>
                    <h4 style={{ margin: '16px 0 4px' }}>Milestones</h4>
                    <div className="miles" style={{ ['--mp' as any]: `${mp}%` }}>
                      {MILESTONES.map((m, i) => (
                        <div key={m.name} className={`mile${msDone[i] ? ' done' : ''}`}>{m.name}<small>{m.date}</small></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dgrid3">
                  <div className="dcell">
                    <h4>Task progress <span className="muted" style={{ fontWeight: 500, fontSize: 11.5 }}>click to filter</span></h4>
                    <div className="dash-bars">
                      {AREAS.map((area) => {
                        const areaTasks = tasks.filter((t) => t.area === area);
                        const areaDone = areaTasks.filter((t) => t.st === 'done').length;
                        const w = areaTasks.length ? (areaDone / areaTasks.length) * 100 : 0;
                        return (
                          <div key={area} className="dash-bar-row" role="button" tabIndex={0} onClick={() => openTasksFor(area)} aria-label={`${area}: ${areaDone} of ${areaTasks.length} done. Show tasks`}>
                            <span>{area}</span>
                            <div className="tr"><i style={{ background: AREA_COLOR[area], width: `${w}%` }} /></div>
                            <span className="muted">{areaDone}/{areaTasks.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="dcell">
                    <h4>Contributions <span className="dtog"><button type="button" className={range === 'm' ? 'on' : ''} onClick={() => setRange('m')}>30 days</button><button type="button" className={range === 'w' ? 'on' : ''} onClick={() => setRange('w')}>7 days</button></span></h4>
                    <div className="commit-big"><b>+{commitSum}</b><span className="muted" style={{ fontSize: 12 }}>commits {range === 'm' ? 'in 30 days' : 'in 7 days'}</span></div>
                    <div className="commit">
                      {commitData.map((v, i) => <i key={i} style={{ height: `${(v / commitMax) * 100}%` }} data-tip={`${v} commits \u00b7 ${commitDate(i)}`} />)}
                    </div>
                  </div>
                  <div className="dcell">
                    <h4>Activity feed</h4>
                    <div className="dash-feed">
                      {events.slice(0, 4).map((e, i) => {
                        const m = MEMB.find((x) => x.key === e.who) ?? MEMB[0];
                        return (
                          <div key={i} className="fi">
                            <IllustratedAvatar personKey={m.key} name={m.name} female={m.female} size={28} />
                            <div><b>{m.name.split(' ')[0]}</b> {e.t}<small>{e.a}</small></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'tk' && (
              <div className="dpane" id="p-tk">
                <div className="tk-bar">
                  <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task, e.g. Write onboarding guide" aria-label="New task" onKeyDown={(e) => e.key === 'Enter' && addTask()} />
                  <select className="sel" value={newArea} onChange={(e) => setNewArea(e.target.value as Area)} aria-label="Area">
                    {AREAS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                  <button type="button" className="btn btn-primary btn-sm" onClick={addTask}><Plus size={14} /> Add task</button>
                </div>
                <div className="ft-row">
                  {(['all', 'todo', 'prog', 'done'] as const).map((s) => (
                    <button key={s} type="button" className={`pill${filterSt === s ? ' on' : ''}`} onClick={() => setFilterSt(s)}>{s === 'all' ? 'All' : STATUS_LABEL[s]}</button>
                  ))}
                  <span style={{ width: 10 }} />
                  {(['all', ...AREAS] as const).map((a) => (
                    <button key={a} type="button" className={`pill${filterArea === a ? ' on' : ''}`} onClick={() => setFilterArea(a)}>{a === 'all' ? 'All areas' : a}</button>
                  ))}
                </div>
                <div className="tk-list">
                  {filteredTasks.length ? filteredTasks.map((t) => (
                    <div key={t.id} className="tk">
                      <button type="button" className={`ref-ck ${t.st === 'done' ? 'g' : t.st === 'prog' ? 'b' : ''}`} onClick={() => cycleTask(t.id)} aria-label={`Mark ${t.t} ${t.st === 'done' ? 'not done' : 'done'}`} />
                      <div><span>{t.t}</span><br /><small>{t.area} &middot; {personOf(AREA_OWNER_KEY[t.area]).name.split(' ')[0]}</small></div>
                      <button type="button" className={`sbtn ${t.st}`} onClick={() => cycleTask(t.id)}>{STATUS_LABEL[t.st]}</button>
                      <button type="button" className="x" onClick={() => deleteTask(t.id)} aria-label="Delete task"><X size={14} /></button>
                    </div>
                  )) : <div className="tk-empty">No tasks match these filters.</div>}
                </div>
              </div>
            )}

            {tab === 'tm' && (
              <div className="dpane" id="p-tm">
                <div className="tm-grid">
                  {MEMB.map((m) => (
                    <button key={m.key} type="button" className={`tm${filterWho === m.key ? ' on' : ''}`} onClick={() => { setFilterWho(filterWho === m.key ? 'all' : m.key); setTab('ac'); }}>
                      <IllustratedAvatar personKey={m.key} name={m.name} female={m.female} size={44} />
                      <span><b>{m.name}</b><small>{m.role} &middot; {COMMITS[m.key] ?? 0} commits</small></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'ac' && (
              <div className="dpane" id="p-ac">
                <div className="ft-row">
                  <button type="button" className={`pill${filterWho === 'all' ? ' on' : ''}`} onClick={() => setFilterWho('all')}>All</button>
                  {MEMB.map((m) => (
                    <button key={m.key} type="button" className={`pill${filterWho === m.key ? ' on' : ''}`} onClick={() => setFilterWho(m.key)}>{m.name}</button>
                  ))}
                </div>
                <div className="dcell">
                  <div className="dash-feed" style={{ maxHeight: 'none' }}>
                    {filteredFeed.length ? filteredFeed.map((e, i) => {
                      const m = MEMB.find((x) => x.key === e.who) ?? MEMB[0];
                      return (
                        <div key={i} className="fi">
                          <IllustratedAvatar personKey={m.key} name={m.name} female={m.female} size={28} />
                          <div><b>{m.name.split(' ')[0]}</b> {e.t}<small>{e.a}</small></div>
                        </div>
                      );
                    }) : <div className="tk-empty">No activity for this person yet.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LiveDashboardScene;
