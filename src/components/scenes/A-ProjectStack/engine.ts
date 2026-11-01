// @ts-nocheck
/* Scene A — Project Stack: a single assembled object explodes into five
 * layers (overview, team, tasks, contributions, result) as the user
 * scrolls, then reassembles at the end. apply(p) is a pure function of
 * scroll progress. Task/contribution numbers are illustrative sample data
 * (same convention as the home page's existing ProjectBoard mockup); the
 * overview/result panels use one real featured project when available. */
import * as THREE from 'three';
import { makePanel, plane, contactShadow, fillRR, txt, pill, avatar } from '../shared/canvasPanel';
import type { EngineFactoryArgs, SceneCam, SceneEngine } from '../shared/useScrollEngine';
import type { ShowcaseProject } from '../shared/demoData';

const DARK = '#111827', TEAL = '#0e7490', CYAN = '#06b6d4', BLUE = '#2563eb';
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const win = (p: number, a: number, b: number, f = 0.03) => {
  const s = (x: number, x0: number, x1: number) => clamp((x - x0) / (x1 - x0));
  return s(p, a, a + f) * (1 - s(p, b - f, b));
};
const TASK_NAMES = ['Auth flow', 'Data model', 'API routes', 'UI polish', 'Reviews', 'QA pass', 'Docs', 'Deploy'];

export interface StackEngine extends SceneEngine {
  setProject(p: ShowcaseProject | null): void;
}

export function createStackEngine({ root }: EngineFactoryArgs): StackEngine {
  const W = 3.0, H = 2.0;
  let project: ShowcaseProject | null = null;

  const L: Record<string, THREE.Group> = {};

  L.overview = makePanel(W, H, (g, w, h) => {
    g.fillStyle = '#f7f9fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9eef3'; g.fillRect(0, 0, w, 78);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, i) => { g.fillStyle = cl; g.beginPath(); g.arc(44 + i * 32, 39, 10, 0, Math.PI * 2); g.fill(); });
    fillRR(g, 200, 18, 560, 42, 21, '#fff'); txt(g, 'webloop.app/projects', 228, 46, 22, '#6e6e73', 500);
    txt(g, 'PROJECT OVERVIEW', 56, 150, 22, TEAL, 700);
    const name = project?.name ?? 'Your project', cat = project?.category ?? 'A sustainability data platform';
    txt(g, name, 56, 238, 56, DARK, 700); txt(g, cat, 56, 292, 30, '#6e6e73', 400);
    pill(g, '● ' + (project?.status ?? 'In progress'), 56, 330, 24, '#ccfbf1', '#0f766e');
    let x = 56; (project?.stack ?? ['React', 'TypeScript', 'Supabase']).slice(0, 3).forEach((s) => { x += pill(g, s, x, 410, 24, '#e0f2fe', '#075985') + 12; });
    txt(g, project ? project.stats : '24 tasks · 5 contributors', 56, 520, 26, '#6e6e73', 500);
    txt(g, project ? 'A REAL WEBLOOP PROJECT' : 'SAMPLE CONTENT', 56, 622, 20, '#9aa3ad', 600);
  });

  const team = new THREE.Group(); L.team = team; (team as any).userData.panels = [];
  const ROLES = [['Frontend', 'FR', ['#0e7490', '#22d3ee']], ['Backend', 'BK', ['#2563eb', '#22d3ee']], ['Design', 'DS', ['#0f766e', '#2563eb']]] as const;
  ROLES.forEach((m, i) => {
    const skills = [['React', 'CSS', 'TS'], ['Node', 'SQL', 'API'], ['Figma', 'UX', 'Proto']][i];
    const p = makePanel(0.94, 1.5, (g, w, h) => {
      g.fillStyle = '#f7f9fb'; g.fillRect(0, 0, w, h); avatar(g, 500, 300, 150, m[1], m[2] as any);
      txt(g, m[0] + ' role', 500, 590, 70, DARK, 700, 'center'); txt(g, 'Open seat', 500, 660, 40, '#6e6e73', 500, 'center');
      g.fillStyle = '#e5e9ee'; g.fillRect(120, 730, 760, 3);
      skills.forEach((s, k) => { g.font = '600 40px sans-serif'; pill(g, s, 130 + k * 250, 800, 40, '#e0f2fe', '#075985', 20); });
    }, { r: 0.07 });
    p.position.x = (i - 1) * 1.03; team.add(p); (team as any).userData.panels.push(p);
  });

  const tasksState = { q: 0 };
  L.tasks = makePanel(W, H, (g, w, h, s) => {
    const q = (s.q as number) ?? 0; g.fillStyle = '#f7f9fb'; g.fillRect(0, 0, w, h);
    txt(g, 'Tasks', 44, 80, 46, DARK, 700);
    const st = (i: number) => (q - i * 0.55 < 1 ? 0 : q - i * 0.55 < 2 ? 1 : 2);
    const done = TASK_NAMES.filter((_, i) => st(i) === 2).length;
    fillRR(g, 560, 52, 396, 16, 8, '#e5e9ee'); fillRR(g, 560, 52, (396 * done) / 8, 16, 8, CYAN); txt(g, done + '/8', 560, 108, 26, '#6e6e73', 600);
    const cw = 290, labels = ['To do', 'In progress', 'Completed'], cols = [CYAN, BLUE, '#16a34a'];
    labels.forEach((lb, ci) => {
      const x = 36 + ci * (cw + 20); fillRR(g, x, 140, cw, 470, 20, '#eef2f6'); txt(g, lb, x + 20, 190, 28, DARK, 700);
      g.fillStyle = cols[ci]; g.beginPath(); g.arc(x + cw - 34, 178, 9, 0, Math.PI * 2); g.fill();
      let k = 0;
      TASK_NAMES.forEach((n, i) => { if (st(i) === ci) { fillRR(g, x + 16, 214 + k * 94, cw - 32, 80, 14, '#fff', '#dfe5ec', 2); txt(g, n, x + 34, 262 + k * 94, 28, DARK, 600); fillRR(g, x + 34, 276 + k * 94, 90, 8, 4, cols[ci]); k++; } });
    });
  }, { state: tasksState });

  const plate = makePanel(W, H, (g, w, h) => {
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, w, h); txt(g, 'Contributions', 44, 86, 46, '#fff', 700);
    txt(g, 'Sample activity · illustrative', 44, 130, 26, '#94a3b8', 500);
    pill(g, '● live', 800, 52, 24, 'rgba(34,211,238,.18)', '#67e8f9');
  }, { color: 0x0b1220 });
  L.contrib = plate;
  const COLS = 12, ROWS = 6, NB = COLS * ROWS;
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.35, emissive: 0x0e7490, emissiveIntensity: 0.4 }), NB);
  const barVals: number[] = []; for (let i = 0; i < NB; i++) barVals.push(0.15 + 0.85 * Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1));
  bars.position.set(0, -0.2, 0.05); plate.add(bars);

  L.result = makePanel(W, H, (g, w, h) => {
    g.fillStyle = '#f7f9fb'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9eef3'; g.fillRect(0, 0, w, 78);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, i) => { g.fillStyle = cl; g.beginPath(); g.arc(44 + i * 32, 39, 10, 0, Math.PI * 2); g.fill(); });
    fillRR(g, 200, 18, 560, 42, 21, '#fff');
    const name = project?.name ?? 'Carbon Ledger';
    txt(g, name, 56, 170, 56, DARK, 700); pill(g, '✓ Delivered', 56, 200, 28, '#dcfce7', '#15803d');
    g.lineWidth = 26; g.strokeStyle = '#e5e9ee'; g.beginPath(); g.arc(780, 330, 130, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#16a34a'; g.lineCap = 'round'; g.beginPath(); g.arc(780, 330, 130, -Math.PI / 2, Math.PI * 1.5); g.stroke();
    txt(g, '100%', 780, 352, 70, DARK, 700, 'center');
    [['24', 'Tasks done'], ['142', 'Commits'], ['5', 'Contributors']].forEach(([a, b], i) => { fillRR(g, 56 + i * 200, 300, 180, 130, 22, '#fff', '#dfe5ec'); txt(g, a, 76 + i * 200, 372, 54, TEAL, 700); txt(g, b, 76 + i * 200, 412, 24, '#6e6e73', 500); });
  });
  const badge = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 40).rotateX(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x0e7490, metalness: 0.7, roughness: 0.25, clearcoat: 1 }));
  badge.add(disc);
  const chk = plane(0.44, 0.44, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 90; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(250, 520); g.lineTo(430, 690); g.lineTo(760, 320); g.stroke(); });
  chk.position.z = 0.04; badge.add(chk); badge.position.set(1.35, 0.85, 0.3); L.result.add(badge);

  const order = ['overview', 'team', 'tasks', 'contrib', 'result'];
  const z0 = [0.3, 0.15, 0, -0.15, -0.3];
  order.forEach((k) => root.add(L[k]));
  const tgt: Record<string, { b: number[]; s: number }> = {
    overview: { b: [0, 0.12, 1.75, 0, 0, 0], s: 1.08 },
    team: { b: [3.35, 0.05, 0.5, 0, -0.42, 0], s: 1 },
    tasks: { b: [-3.35, 0.05, 0.5, 0, 0.42, 0], s: 1 },
    contrib: { b: [0, -2.6, 1.3, -1.05, 0, 0], s: 1 },
    result: { b: [0, 2.6, 0.9, 0.1, 0, 0], s: 0.96 },
  };
  const shadow = contactShadow(11); shadow.position.y = -3.4; root.add(shadow);

  const cam: SceneCam = { tx: 0, ty: 0, tz: 0, zoom: 0.5, az: 0, el: 0.07 };
  let dark = false, lastQ = -9, barScale = 0.12;

  function apply(p: number) {
    const e = seg(p, 0.2, 0.42) * (1 - seg(p, 0.9, 1));
    const wins = [win(p, 0.42, 0.52), win(p, 0.52, 0.62), win(p, 0.62, 0.72), win(p, 0.72, 0.82), win(p, 0.82, 0.9)];
    let fx = 0, fy = 0, fz = 0, fs = 0;
    order.forEach((k, i) => {
      const T = tgt[k], a = [0, 0, z0[i], 0, 0, 0], v = a.map((val, j) => mix(val, T.b[j], e)), o = L[k], f = wins[i];
      o.position.set(v[0], v[1], v[2] + f * 0.55); o.rotation.set(v[3], v[4], v[5]);
      const sc = mix(1, T.s, e) * (1 + f * 0.07); o.scale.setScalar(sc);
      const em = (o as any).userData.edgeMat;
      if (em) em.opacity = 0.45 + 0.5 * f;
      if (k === 'team') (L.team as any).userData.panels.forEach((pp: any) => { pp.userData.edgeMat.opacity = 0.45 + 0.5 * f; });
      fx += v[0] * f; fy += v[1] * f; fz += v[2] * f; fs += f;
    });
    root.rotation.y = mix(-0.42, 0, seg(p, 0, 0.22)) + Math.sin(p * 11) * 0.14 * e * (1 - fs);
    root.rotation.x = 0.08 * (1 - e);
    cam.zoom = clamp(mix(0.5, 0.46, seg(p, 0, 0.12)) + (1 - 0.46) * seg(p, 0.1, 0.42) - 0.26 * fs + 0.22 * seg(p, 0.9, 1), 0.3, 1.2);
    cam.tx = fx * 0.78; cam.ty = fy * 0.78; cam.tz = fz * 0.5; cam.el = 0.07; cam.az = Math.sin(p * 6) * 0.06;
    const q = seg(p, 0.25, 0.92) * 5.5;
    if (Math.abs(q - lastQ) > 0.06) { lastQ = q; (L.tasks as any).userData.redraw({ q }); }
    barScale = 0.12 + 0.88 * e;
    shadow.material.opacity = (dark ? 0 : 0.3) * (1 - 0.35 * e);
  }

  const dummy = new THREE.Object3D(), barCol = new THREE.Color();
  function tick(t: number) {
    const s = barScale;
    const active = Math.floor((t * 6) % COLS);
    for (let i = 0; i < NB; i++) {
      const cx = i % COLS, cy = Math.floor(i / COLS), h = (0.06 + barVals[i] * 0.6) * s;
      dummy.position.set((cx - (COLS - 1) / 2) * 0.22, (cy - (ROWS - 1) / 2) * 0.2 - 0.02, 0);
      dummy.scale.set(0.17, 0.15, h); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix);
      const on = Math.abs(cx - active) < 1.2 ? 1 : 0, pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.7);
      barCol.setRGB(mix(0.05, 0.55, on + pulse * 0.15), mix(0.45, 0.95, on + pulse * 0.12), mix(0.55, 1, on));
      bars.setColorAt(i, barCol);
    }
    bars.instanceMatrix.needsUpdate = true; if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
    badge.rotation.y = Math.sin(t * 0.9) * 0.5; badge.position.y = 0.85 + Math.sin(t * 1.4) * 0.04;
  }

  const engine: StackEngine = {
    need: { w: 11.4, h: 8.2 },
    cam,
    apply,
    tick,
    setDark(d: boolean) { dark = d; },
    setProject(p) { project = p; (L.overview as any).userData.redraw(); (L.result as any).userData.redraw(); },
    dispose() {
      Object.values(L).forEach((g) => g.traverse((o: any) => { o.geometry?.dispose?.(); if (o.material) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); }); } }));
      bars.dispose(); shadow.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    },
  };
  return engine;
}
