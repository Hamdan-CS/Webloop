// @ts-nocheck
/* Home / Ecosystem hero — ported directly from the approved HTML reference
 * (webloop-motion-demo_2.html, section 25 "HOME / ECOSYSTEM hero" + the
 * `ecosystem()` IIFE). Five glass platforms (students, universities,
 * companies, projects, teams) ringed around a glowing WebLoop core, each
 * holding a hand-built procedural Three.js model. Raw Three.js, same
 * geometry/camera/lighting/interaction as the reference — this is the
 * replacement for the old particle-morph hero, which has no equivalent in
 * either reference file.
 *
 * Avatars are drawn as colour-gradient initials circles (matching this
 * app's own PersonAvatar convention) instead of the reference's seeded
 * image URLs, since no avatar image service is wired up. Icons on the
 * DOM card overlays are rendered by the React wrapper (lucide-react), not
 * this canvas engine. go(key) is a callback into React Router instead of
 * an in-page anchor scroll, since this is a real multi-page app. */
import * as THREE from 'three';

const PEOPLE: Record<string, { n: string; r: string; cols: [string, string] }> = {
  alex: { n: 'Alex', r: 'Frontend Developer', cols: ['#0e7490', '#22d3ee'] },
  maya: { n: 'Maya', r: 'Backend Developer', cols: ['#2563eb', '#22d3ee'] },
  daniel: { n: 'Daniel', r: 'UI/UX Designer', cols: ['#0f766e', '#2563eb'] },
  sara: { n: 'Sara', r: 'AI Developer', cols: ['#164e63', '#06b6d4'] },
};

export interface EntityDef {
  k: 'students' | 'universities' | 'companies' | 'projects' | 'teams';
  t: string;
  items: string[];
  go: 'gallery' | 'join' | 'companies' | 'explore' | 'team';
  role?: 'university';
  phi: number;
  mx?: number;
}

export const ENTITIES: EntityDef[] = [
  { k: 'students', t: 'Students', go: 'gallery', phi: 300, mx: 0, items: ['Find real projects', 'Build with a team', 'Show verified work'] },
  { k: 'universities', t: 'Universities', go: 'join', role: 'university', phi: 25, items: ['Connect students to industry', 'Run project programs', 'Track real outcomes'] },
  { k: 'companies', t: 'Companies', go: 'companies', phi: 100, mx: -0.25, items: ['Discover talented students', 'Post real challenges', 'Hire from proven work'] },
  { k: 'projects', t: 'Projects', go: 'explore', phi: 225, mx: 0.3, items: ['Turn ideas into products', 'Get industry feedback', 'Create real impact'] },
  { k: 'teams', t: 'Teams', go: 'team', phi: 160, mx: -0.22, items: ['Form cross-skill teams', 'Collaborate and build', 'Ship real solutions'] },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface EcosystemHandle {
  dispose(): void;
}

export function createEcosystemEngine(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  opts: {
    onHoverChange?: (i: number) => void;
    onCardLayout?: (layouts: { i: number; x: number; y: number; alpha: number; on: boolean }[]) => void;
    onNavigate: (entity: EntityDef) => void;
    getCardSize: (i: number) => { w: number; h: number };
    reduceMotion: boolean;
  },
): EcosystemHandle {
  const RM = opts.reduceMotion;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return { dispose() {} };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 80);
  const world = new THREE.Group();
  scene.add(world);

  try {
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#cfe6ff'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#7fb2ff');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide })));
    [[8, 10, 6], [-9, 8, -4]].forEach((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.position.set(p[0], p[1], p[2]); es.add(m);
    });
    scene.environment = pm.fromScene(es, 0.03).texture;
    pm.dispose();
  } catch { /* env map is a cosmetic enhancement only */ }

  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e3a8a, 0.75);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  const pl = new THREE.PointLight(0x38bdf8, 1.2, 12);
  dir.position.set(5, 9, 6); dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024);
  Object.assign(dir.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  dir.shadow.bias = -0.0006; dir.shadow.radius = 4; pl.position.set(0, 1.8, 0);
  scene.add(hemi, dir, pl, new THREE.AmbientLight(0xffffff, 0.1));

  const tex = (w: number, h: number, fn: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d')!, w, h);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  };
  const dyn: (() => void)[] = [];
  const dtex = (w: number, h: number, fn: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d')!; const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    const d = () => { x.clearRect(0, 0, w, h); fn(x, w, h); t.needsUpdate = true; };
    dyn.push(d); d(); return t;
  };
  const std = (color: number, o: Record<string, unknown> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.25, ...o });
  const glassy = (color: number, o: Record<string, unknown> = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.55, ...o });

  const rr = (w: number, d: number, h: number, r: number, bev = 0.04) => {
    const s = new THREE.Shape(); const x0 = -w / 2, y0 = -d / 2;
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + d - r); s.quadraticCurveTo(x0 + w, y0 + d, x0 + w - r, y0 + d);
    s.lineTo(x0 + r, y0 + d); s.quadraticCurveTo(x0, y0 + d, x0, y0 + d - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); return g;
  };
  const rrv = (w: number, h: number, d: number, r: number) => {
    const s = new THREE.Shape(); const x0 = -w / 2, y0 = -h / 2;
    s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -d / 2); return g;
  };
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat as THREE.Material); m.position.set(x, y, z); parent.add(m); return m;
  };
  const glowTex = tex(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(120,220,255,.95)'); g.addColorStop(0.5, 'rgba(60,150,255,.35)'); g.addColorStop(1, 'rgba(60,150,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const RX = 4.1, RZ = 3.3;
  const pos = (e: EntityDef) => { const a = (e.phi * Math.PI) / 180; return new THREE.Vector3(RX * Math.sin(a), 0, -RZ * Math.cos(a)); };

  const rect = (x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) => {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  };
  const avDraw = (x: CanvasRenderingContext2D, k: string, cx: number, cy: number, r: number) => {
    const p = PEOPLE[k]; x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip();
    const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, p.cols[0]); g.addColorStop(1, p.cols[1]); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = '#fff'; x.font = `700 ${r}px Inter,system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(p.n[0], cx, cy + r * 0.05);
    x.restore();
  };
  const FONT = 'Inter,system-ui,sans-serif';
  const txt = (x: CanvasRenderingContext2D, s: string, px: number, py: number, sz: number, col: string, wt = 600, al: CanvasTextAlign = 'left') => {
    x.font = `${wt} ${sz}px ${FONT}`; x.fillStyle = col; x.textAlign = al; x.fillText(s, px, py);
  };
  const pill = (x: CanvasRenderingContext2D, s: string, px: number, py: number, sz: number, fg: string, bg: string) => {
    x.font = `600 ${sz}px ${FONT}`; const w = x.measureText(s).width + sz * 1.1;
    rect(x, px, py - sz * 1.05, w, sz * 1.55, sz * 0.78); x.fillStyle = bg; x.fill();
    txt(x, s, px + sz * 0.55, py, sz, fg, 600); return w;
  };
  const floaters: { o: THREE.Object3D; a: number; sp: number; ph: number }[] = [];
  const fl = (o: THREE.Object3D, a = 0.04, sp = 1.1) => { (o.userData as any).by = o.position.y; floaters.push({ o, a, sp, ph: floaters.length * 1.7 }); };
  const shTex = dtex(64, 64, (x, w, h) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(8,20,60,.9)'); g.addColorStop(1, 'rgba(8,20,60,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const blob = (g: THREE.Object3D, x: number, z: number, w: number, d: number, op = 0.4) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); (m.userData as any).noShadow = true; g.add(m);
  };

  function win(w: number, h: number, t: THREE.Texture, edge = 0x38bdf8) {
    const g = new THREE.Group();
    add(g, rrv(w + 0.07, h + 0.07, 0.045, 0.07), std(0xf4f8ff, { roughness: 0.2, metalness: 0.2, envMapIntensity: 0.6 }), 0, 0, 0);
    const eg = add(g, rrv(w + 0.1, h + 0.1, 0.02, 0.08), new THREE.MeshBasicMaterial({ color: edge, transparent: true, opacity: 0.55 }), 0, 0, -0.03);
    (eg.userData as any).noShadow = true;
    const sc = add(g, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), 0, 0, 0.024);
    (sc.userData as any).noShadow = true;
    return g;
  }
  function round(p: THREE.Object3D, x: number, z: number, s = 1, c1 = 0x2fb36a, c2 = 0x249a58) {
    const g = new THREE.Group();
    add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8), std(0x7a4a2a), 0, 0.1, 0);
    add(g, new THREE.SphereGeometry(0.17, 16, 12), std(c1, { roughness: 0.8 }), 0, 0.34, 0);
    add(g, new THREE.SphereGeometry(0.12, 14, 10), std(c2, { roughness: 0.8 }), 0.05, 0.5, 0.02);
    g.position.set(x, 0, z); g.scale.setScalar(s); p.add(g);
  }

  // ---------- STUDENT: laptop + profile + graduation cap ----------
  function mStudent(g: THREE.Object3D) {
    const alu = std(0xd7deec, { metalness: 0.8, roughness: 0.3, envMapIntensity: 0.9 });
    const prof = dtex(640, 410, (x, w, h) => {
      x.fillStyle = '#f6f9ff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#e6edfb'; x.fillRect(0, 0, w, 46);
      ['#fb7185', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 23, 6, 0, 7); x.fill(); });
      rect(x, w - 250, 12, 230, 24, 12); x.fillStyle = '#fff'; x.fill();
      txt(x, 'webloop.app/profile', w - 238, 29, 13, '#64748b', 500);
      const gr = x.createLinearGradient(0, 46, w, 150); gr.addColorStop(0, '#2563eb'); gr.addColorStop(1, '#06b6d4');
      x.fillStyle = gr; x.fillRect(0, 46, w, 100);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(96, 150, 56, 0, 7); x.fill();
      avDraw(x, 'maya', 96, 150, 50);
      txt(x, PEOPLE.maya.n, 172, 180, 30, '#0b1730', 800); txt(x, PEOPLE.maya.r, 172, 206, 17, '#64748b', 500);
      pill(x, 'Verified', 472, 176, 15, '#0b7a55', '#d9f7ea');
      txt(x, 'Projects', 36, 262, 20, '#0b1730', 700);
      ([['#2563eb', '#06b6d4', 'Carbon Ledger'], ['#7c3aed', '#ec4899', 'Campus Hub'], ['#0ea5e9', '#22c55e', 'Eco Tracker']] as const).forEach(([a, b, n], i) => {
        const px = 36 + i * 196; const gg = x.createLinearGradient(px, 0, px + 176, 0); gg.addColorStop(0, a); gg.addColorStop(1, b);
        rect(x, px, 278, 176, 78, 10); x.fillStyle = gg; x.fill();
        txt(x, n, px + 12, 372, 15, '#fff', 700);
      });
      x.fillStyle = '#e2e8f0'; rect(x, 36, 392, 568, 6, 3); x.fill();
      x.fillStyle = '#22c55e'; rect(x, 36, 392, 380, 6, 3); x.fill();
    });
    const lap = new THREE.Group(); lap.position.set(0.02, 0, 0.22); g.add(lap);
    add(lap, rr(1.36, 0.92, 0.05, 0.06, 0.012), alu, 0, 0, 0);
    const kb = dtex(256, 128, (x, w, h) => {
      x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { x.fillStyle = '#27324a'; rect(x, 8 + c * 17.2, 8 + r * 14, 15, 12, 2); x.fill(); }
      x.fillStyle = '#1e293b'; rect(x, 92, 92, 72, 26, 5); x.fill();
    });
    const deck = add(lap, new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: kb }), 0, 0.058, 0.1);
    deck.rotation.x = -Math.PI / 2;
    const lid = new THREE.Group(); lid.position.set(0, 0.05, -0.44); lid.rotation.x = -0.3; lap.add(lid);
    add(lid, rrv(1.36, 0.92, 0.04, 0.06), alu, 0, 0.46, 0);
    const sc = add(lid, new THREE.PlaneGeometry(1.26, 0.8), new THREE.MeshBasicMaterial({ map: prof, toneMapped: false }), 0, 0.46, 0.022);
    (sc.userData as any).noShadow = true;
    blob(g, 0, 0.25, 1.9, 1.4, 0.5);
    const card = win(0.9, 0.52, dtex(450, 260, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e8f1ff'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      avDraw(x, 'alex', 62, 76, 44);
      txt(x, PEOPLE.alex.n, 124, 70, 26, '#0b1730', 800); txt(x, 'Student · open to projects', 124, 98, 15, '#64748b', 500);
      pill(x, 'React', 30, 170, 16, '#1d4ed8', '#dbeafe'); pill(x, 'TypeScript', 100, 170, 16, '#6d28d9', '#ede9fe'); pill(x, 'Figma', 216, 170, 16, '#be185d', '#fce7f3');
      pill(x, 'Verified work', 30, 228, 16, '#0b7a55', '#d9f7ea');
    }));
    card.position.set(-0.62, 1.3, 0.25); card.rotation.y = 0.28; g.add(card); fl(card, 0.045, 1.0);
    const cap = new THREE.Group();
    const navy = std(0x16213f, { roughness: 0.35, metalness: 0.25, envMapIntensity: 0.7 });
    const gold = std(0xf2b84b, { metalness: 0.8, roughness: 0.3 });
    add(cap, new THREE.CylinderGeometry(0.17, 0.2, 0.16, 28), navy, 0, -0.09, 0);
    const bd = add(cap, new THREE.BoxGeometry(0.66, 0.035, 0.66), navy, 0, 0, 0); bd.rotation.y = Math.PI / 4;
    add(cap, new THREE.SphereGeometry(0.03, 12, 8), gold, 0, 0.03, 0);
    const cord = add(cap, new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), gold, 0.15, -0.12, 0.15); cord.rotation.z = -0.1;
    add(cap, new THREE.SphereGeometry(0.045, 12, 8), gold, 0.15, -0.3, 0.15);
    cap.position.set(0.66, 1.18, 0.05); cap.rotation.set(0.22, -0.2, -0.12); g.add(cap); fl(cap, 0.05, 1.3);
  }

  // ---------- UNIVERSITY: classical campus hall with dome ----------
  function mUni(g: THREE.Object3D) {
    const stone = std(0xe9e1d2, { roughness: 0.75 });
    const stone2 = std(0xf8f3e8, { roughness: 0.6 });
    const gold = std(0xe0a94a, { metalness: 0.85, roughness: 0.32, envMapIntensity: 0.8 });
    const dome = std(0x2f9fb4, { metalness: 0.55, roughness: 0.3, envMapIntensity: 0.8 });
    ([[1.9, 1.2], [1.7, 1.05], [1.5, 0.9]] as const).forEach(([w, d], i) => add(g, new THREE.BoxGeometry(w, 0.07, d), stone, 0, 0.035 + i * 0.07, 0.05));
    const fac = dtex(512, 220, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6efe1'); gr.addColorStop(1, '#e8dec9'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const px = 40 + i * 92;
        if (i === 2) { rect(x, px, 70, 64, 150, 30); x.fillStyle = '#1e3a8a'; x.fill(); }
        else {
          const gg = x.createLinearGradient(0, 60, 0, 170); gg.addColorStop(0, '#fde68a'); gg.addColorStop(1, '#f59e0b');
          rect(x, px, 50, 64, 120, 32); x.fillStyle = gg; x.fill();
          x.fillStyle = 'rgba(60,40,10,.25)'; x.fillRect(px + 30, 50, 3, 120);
        }
      }
    });
    add(g, new THREE.BoxGeometry(1.3, 0.56, 0.62), [stone2, stone2, stone2, stone2, new THREE.MeshStandardMaterial({ map: fac, roughness: 0.7 }), stone2], 0, 0.52, -0.12);
    [-1, 1].forEach((s) => add(g, new THREE.BoxGeometry(0.5, 0.38, 0.5), stone2, s * 0.88, 0.43, -0.12));
    for (let i = 0; i < 6; i++) {
      add(g, new THREE.CylinderGeometry(0.045, 0.052, 0.5, 18), stone2, -0.55 + i * 0.22, 0.52, 0.3);
      add(g, new THREE.BoxGeometry(0.13, 0.04, 0.13), stone2, -0.55 + i * 0.22, 0.8, 0.3);
      add(g, new THREE.BoxGeometry(0.14, 0.03, 0.14), stone2, -0.55 + i * 0.22, 0.27, 0.3);
    }
    add(g, new THREE.BoxGeometry(1.42, 0.07, 0.18), stone2, 0, 0.86, 0.3);
    const s = new THREE.Shape(); s.moveTo(-0.71, 0); s.lineTo(0.71, 0); s.lineTo(0, 0.26); s.closePath();
    add(g, new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }), stone2, 0, 0.895, 0.21);
    add(g, new THREE.CylinderGeometry(0.3, 0.33, 0.2, 32), stone2, 0, 0.95, -0.12);
    const dm = add(g, new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 1.04, -0.12); dm.scale.y = 0.95;
    add(g, new THREE.CylinderGeometry(0.045, 0.06, 0.12, 12), gold, 0, 1.36, -0.12);
    add(g, new THREE.SphereGeometry(0.05, 12, 8), gold, 0, 1.46, -0.12);
    add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), std(0x94a3b8), 0.88, 0.95, -0.12);
    add(g, new THREE.PlaneGeometry(0.26, 0.15), new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide }), 1.01, 1.1, -0.12);
    round(g, -0.95, 0.62, 1); round(g, 0.98, 0.62, 0.9); round(g, -0.98, -0.55, 0.8, 0x3fbf74, 0x2aa564);
    blob(g, 0, 0, 2.2, 1.5, 0.35);
    const chip = win(0.92, 0.26, dtex(460, 130, (x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2563eb'; x.beginPath(); x.arc(56, 65, 30, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(56, 48); x.lineTo(84, 62); x.lineTo(56, 76); x.lineTo(28, 62); x.closePath(); x.fill();
      x.fillRect(44, 72, 24, 14);
      txt(x, 'Industry programs', 108, 62, 26, '#0b1730', 800); txt(x, 'Partnerships · Internships', 108, 92, 17, '#64748b', 500);
    }));
    chip.position.set(-0.1, 1.8, 0.5); g.add(chip); fl(chip, 0.04, 1.1);
  }

  // ---------- COMPANY: glass office towers ----------
  function mCompany(g: THREE.Object3D) {
    let seed = 1;
    const mul = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const facade = (cols: number, rows: number, hue: [string, string, string]) => dtex(256, 512, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hue[0]); gr.addColorStop(0.55, hue[1]); gr.addColorStop(1, hue[2]);
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const v = mul();
        x.fillStyle = v > 0.62 ? 'rgba(255,238,190,.95)' : v > 0.3 ? 'rgba(170,215,255,.35)' : 'rgba(255,255,255,.1)';
        x.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
      }
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2;
      for (let i = 0; i <= cols; i++) { x.beginPath(); x.moveTo(i * cw, 0); x.lineTo(i * cw, h); x.stroke(); }
      const sh = x.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)');
      x.fillStyle = sh; x.fillRect(0, 0, w, h);
    });
    const mat = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, metalness: 0.55, roughness: 0.2, envMapIntensity: 0.8, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.16 });
    const roof = std(0xcfd9ea, { metalness: 0.4, roughness: 0.4 });
    const tower = (w: number, h: number, d: number, x: number, z: number, t: THREE.Texture) => {
      const m = mat(t); add(g, new THREE.BoxGeometry(w, h, d), [m, m, roof, roof, m, m], x, h / 2 + 0.02, z);
      add(g, new THREE.BoxGeometry(w * 0.62, 0.18, d * 0.62), roof, x, h + 0.11, z);
    };
    tower(0.82, 2.05, 0.82, 0.18, -0.3, facade(6, 20, ['#7ad0ff', '#2563eb', '#1e3a8a']));
    tower(0.7, 1.4, 0.7, -0.7, 0.12, facade(5, 14, ['#9be4ff', '#3b82f6', '#1d4ed8']));
    tower(0.68, 1.0, 0.68, 0.82, 0.42, facade(5, 10, ['#a5f3fc', '#38bdf8', '#2563eb']));
    add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), std(0xb6c2d8), 0.18, 2.4, -0.3);
    add(g, new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }), 0.18, 2.7, -0.3);
    const ring = add(g, new THREE.TorusGeometry(0.26, 0.022, 8, 32), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }), 0.18, 2.16, -0.3);
    ring.rotation.x = Math.PI / 2;
    round(g, -1.0, -0.55, 0.9); round(g, 0.2, 0.72, 0.8); round(g, 1.1, -0.35, 0.85, 0x3fbf74, 0x2aa564);
    blob(g, 0, 0.05, 2.2, 1.6, 0.35);
    const chip = win(0.9, 0.28, dtex(450, 140, (x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2563eb'; rect(x, 20, 34, 70, 70, 16); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(36, 58, 38, 28);
      x.beginPath(); x.moveTo(48, 58); x.lineTo(48, 50); x.lineTo(62, 50); x.lineTo(62, 58); x.stroke();
      txt(x, 'Real challenges', 108, 64, 28, '#0b1730', 800); txt(x, 'Hire from proven work', 108, 98, 19, '#64748b', 500);
    }));
    chip.position.set(-0.2, 1.72, 0.85); chip.rotation.y = 0.1; g.add(chip); fl(chip, 0.04, 1.0);
  }

  // ---------- PROJECTS: floating app windows ----------
  function mProjects(g: THREE.Object3D) {
    const code = dtex(560, 380, (x, w, h) => {
      x.fillStyle = '#0f172a'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#1e293b'; x.fillRect(0, 0, w, 44);
      ['#fb7185', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 22, 6, 0, 7); x.fill(); });
      rect(x, 100, 8, 150, 30, 8); x.fillStyle = '#0f172a'; x.fill(); txt(x, 'App.tsx', 116, 29, 15, '#cbd5e1', 600);
      const L: [number, [string, string][]][] = [
        [0, [['#c084fc', 'const'], ['#7dd3fc', ' project'], ['#e2e8f0', ' = {']]],
        [1, [['#e2e8f0', 'title: '], ['#fcd34d', "'Carbon Ledger'"]]],
        [1, [['#e2e8f0', 'team: '], ['#86efac', '['], ['#fcd34d', "'Maya'"], ['#e2e8f0', ', '], ['#fcd34d', "'Alex'"], ['#86efac', ']']]],
        [1, [['#e2e8f0', 'status: '], ['#fcd34d', "'building'"]]],
        [0, [['#e2e8f0', '}']]],
        [0, [['#c084fc', 'export'], ['#7dd3fc', ' default'], ['#e2e8f0', ' project']]],
        [0, [['#64748b', '// verified commits']]],
        [0, [['#c084fc', 'await'], ['#7dd3fc', ' verify'], ['#e2e8f0', '(project)']]],
      ];
      L.forEach(([ind, toks], i) => {
        const y = 84 + i * 34;
        txt(x, String(i + 1), 24, y, 17, '#475569', 500);
        let px = 60 + ind * 26;
        toks.forEach(([c, s]) => { x.font = '500 18px ui-monospace,Menlo,monospace'; x.fillStyle = c; x.textAlign = 'left'; x.fillText(s, px, y); px += x.measureText(s).width; });
      });
    });
    const chart = dtex(560, 380, (x, w, h) => {
      x.fillStyle = '#f8fbff'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#e6edfb'; x.fillRect(0, 0, w, 44);
      ['#fb7185', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 22, 6, 0, 7); x.fill(); });
      txt(x, 'Project insights', 36, 88, 22, '#0b1730', 800);
      const pts: [number, number][] = [[40, 300], [120, 250], [190, 270], [270, 190], [350, 215], [430, 140], [520, 110]];
      const gr = x.createLinearGradient(0, 110, 0, 320); gr.addColorStop(0, 'rgba(37,99,235,.35)'); gr.addColorStop(1, 'rgba(37,99,235,0)');
      x.beginPath(); x.moveTo(40, 320); pts.forEach((p) => x.lineTo(p[0], p[1])); x.lineTo(520, 320); x.closePath(); x.fillStyle = gr; x.fill();
      x.strokeStyle = '#2563eb'; x.lineWidth = 5; x.lineJoin = 'round';
      x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
      pts.forEach((p) => { x.fillStyle = '#fff'; x.strokeStyle = '#2563eb'; x.lineWidth = 4; x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.stroke(); });
      x.strokeStyle = '#dbe4f5'; x.lineWidth = 1;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(40, 120 + i * 66); x.lineTo(520, 120 + i * 66); x.stroke(); }
      pill(x, 'Commits', 40, 350, 15, '#1d4ed8', '#dbeafe'); pill(x, 'Tasks', 150, 350, 15, '#6d28d9', '#ede9fe');
    });
    const board = dtex(560, 380, (x, w, h) => {
      x.fillStyle = '#f4f7fd'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#e6edfb'; x.fillRect(0, 0, w, 44);
      ['#fb7185', '#fbbf24', '#34d399'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 22, 6, 0, 7); x.fill(); });
      (([['To do', '#64748b', 2], ['In progress', '#2563eb', 3], ['Done', '#16a34a', 2]] as [string, string, number][])).forEach(([n, c, k], i) => {
        const px = 24 + i * 176; txt(x, n, px, 82, 17, c, 800);
        for (let j = 0; j < k; j++) {
          rect(x, px, 98 + j * 84, 160, 70, 12); x.fillStyle = '#fff'; x.fill();
          x.strokeStyle = '#e2e8f0'; x.lineWidth = 1.5; x.stroke();
          x.fillStyle = c; rect(x, px + 12, 114 + j * 84, 70, 8, 4); x.fill();
          x.fillStyle = '#cbd5e1'; rect(x, px + 12, 134 + j * 84, 120, 7, 3); x.fill(); rect(x, px + 12, 150 + j * 84, 86, 7, 3); x.fill();
          const ks = ['alex', 'maya', 'daniel', 'sara'][(i + j) % 4]; avDraw(x, ks, px + 138, 148 + j * 84, 11);
        }
      });
    });
    const a = win(1.0, 0.68, code), b = win(1.0, 0.68, chart, 0x8b5cf6), c = win(1.0, 0.68, board, 0x34d399);
    a.position.set(-0.62, 1.0, -0.4); a.rotation.set(-0.06, 0.38, 0);
    b.position.set(0.02, 0.86, -0.05); b.rotation.set(-0.08, 0.02, 0);
    c.position.set(0.68, 0.72, 0.36); c.rotation.set(-0.06, -0.36, 0);
    [a, b, c].forEach((p, i) => { g.add(p); fl(p, 0.035, 1 + i * 0.15); });
    blob(g, 0, 0, 2.0, 1.4, 0.4);
  }

  // ---------- TEAMS: avatar network ----------
  function mTeams(g: THREE.Object3D) {
    const ring = dtex(512, 512, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      [240, 190, 140, 90].forEach((r, i) => { x.strokeStyle = `rgba(56,189,248,${0.55 - i * 0.1})`; x.lineWidth = 4; x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); });
      x.strokeStyle = 'rgba(56,189,248,.25)'; x.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        x.beginPath(); x.moveTo(256 + Math.cos(a) * 90, 256 + Math.sin(a) * 90); x.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); x.stroke();
      }
    });
    const disc = add(g, new THREE.PlaneGeometry(1.95, 1.95), new THREE.MeshBasicMaterial({ map: ring, transparent: true, depthWrite: false }), 0, 0.015, 0.05);
    disc.rotation.x = -Math.PI / 2; (disc.userData as any).noShadow = true;
    const keys = ['alex', 'maya', 'daniel', 'sara'];
    const P: [number, number, number][] = [[-0.95, 0.8, -0.15], [-0.32, 0.98, 0.25], [0.32, 0.98, 0.25], [0.95, 0.8, -0.15]];
    const cyan = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.8 });
    const gl = std(0xffffff, { roughness: 0.1, metalness: 0.1, envMapIntensity: 0.7 });
    const node = add(g, new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }), 0, 0.6, 0.1);
    (node.userData as any).noShadow = true; fl(node, 0.04, 1.4);
    keys.forEach((k, i) => {
      const m = new THREE.Group(); const p = P[i]; m.position.set(p[0], p[1], p[2]);
      add(m, new THREE.CylinderGeometry(0.35, 0.35, 0.045, 36), gl, 0, 0, 0).rotation.x = Math.PI / 2;
      const rm = add(m, new THREE.TorusGeometry(0.355, 0.028, 10, 40), new THREE.MeshBasicMaterial({ color: [0x38bdf8, 0x34d399, 0xf472b6, 0xa78bfa][i] }), 0, 0, 0.01);
      (rm.userData as any).noShadow = true;
      const im = add(m, new THREE.CircleGeometry(0.31, 40), new THREE.MeshBasicMaterial({
        map: dtex(256, 256, (x, w, h) => { avDraw(x, k, w / 2, h / 2, w / 2); }), toneMapped: false,
      }), 0, 0, 0.027);
      (im.userData as any).noShadow = true;
      const lb = dtex(320, 100, (x, w) => {
        rect(x, 4, 8, 312, 84, 40); x.fillStyle = 'rgba(255,255,255,.96)'; x.fill();
        txt(x, PEOPLE[k].n, w / 2, 46, 28, '#0b1730', 800, 'center'); txt(x, PEOPLE[k].r, w / 2, 74, 18, '#64748b', 500, 'center');
      });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lb, transparent: true })); sp.scale.set(0.8, 0.25, 1); sp.position.set(0, -0.52, 0.05);
      (sp.userData as any).noShadow = true; m.add(sp);
      g.add(m); fl(m, 0.04, 1 + i * 0.12);
      const ln = new THREE.LineCurve3(new THREE.Vector3(0, 0.6, 0.1), new THREE.Vector3(p[0], p[1] - 0.05, p[2]));
      add(g, new THREE.TubeGeometry(ln, 2, 0.012, 6, false), cyan).userData.noShadow = true;
      if (i < 3) {
        const l2 = new THREE.LineCurve3(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(P[i + 1][0], P[i + 1][1], P[i + 1][2]));
        add(g, new THREE.TubeGeometry(l2, 2, 0.008, 6, false), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.45 })).userData.noShadow = true;
      }
    });
    blob(g, 0, 0.05, 1.9, 1.5, 0.3);
  }

  // ---------- platforms + core ----------
  const plats: { g: THREE.Group; m: THREE.Group; glow: THREE.Mesh; base: THREE.Vector3; h: number; ap: number; e: EntityDef }[] = [];
  const hit: THREE.Object3D[] = [];
  const slabMat = glassy(0xe6f0ff, { transparent: true, opacity: 0.92, roughness: 0.08, envMapIntensity: 0.5 });
  const topMat = std(0xf6faff, { roughness: 0.35, transparent: true, opacity: 0.95, envMapIntensity: 0.4 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x22d3ee, emissiveIntensity: 0.8, roughness: 0.4 });
  const builders = [mStudent, mUni, mCompany, mProjects, mTeams];
  ENTITIES.forEach((e, i) => {
    const g = new THREE.Group(); const p = pos(e); g.position.copy(p);
    const glow = add(g, new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }), 0, -0.34, 0);
    glow.rotation.x = -Math.PI / 2;
    add(g, rr(2.7, 2.3, 0.07, 0.36, 0.03), edgeMat, 0, -0.1, 0);
    add(g, rr(2.56, 2.16, 0.22, 0.34, 0.05), slabMat, 0, -0.03, 0);
    add(g, rr(2.3, 1.92, 0.03, 0.3, 0.02), topMat, 0, 0.23, 0).receiveShadow = true;
    const m = new THREE.Group(); m.position.y = 0.25; g.add(m);
    builders[i](m);
    m.scale.setScalar(e.k === 'teams' ? 1.2 : 1.32); m.position.x = e.mx || 0;
    m.traverse((o: any) => { if (o.isMesh && !o.userData.noShadow) o.castShadow = true; });
    g.traverse((o: any) => { if (o.isMesh && o !== glow) { o.userData.i = i; hit.push(o); } });
    world.add(g); plats.push({ g, m, glow, base: p.clone(), h: 0, ap: 0, e });
  });

  const core = new THREE.Group(); world.add(core);
  const coreGlow = add(core, new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }), 0, -0.3, 0);
  coreGlow.rotation.x = -Math.PI / 2;
  add(core, new THREE.CylinderGeometry(1.85, 1.95, 0.34, 64), std(0x0b2a6b, { emissive: 0x0b66c9, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.4 }), 0, 0.02, 0);
  const ring1 = add(core, new THREE.TorusGeometry(1.85, 0.05, 10, 96), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }), 0, 0.2, 0); ring1.rotation.x = Math.PI / 2;
  const dome = add(core, new THREE.SphereGeometry(1.55, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2), glassy(0x1f56e6, { emissive: 0x1237b8, emissiveIntensity: 0.45 }), 0, 0.18, 0);
  dome.scale.set(1, 0.62, 1);
  const label = tex(512, 300, (x) => {
    x.textAlign = 'center'; x.lineCap = 'round';
    const gr = x.createLinearGradient(130, 0, 380, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#bdefff');
    x.strokeStyle = gr; x.lineWidth = 20; x.shadowColor = 'rgba(0,40,120,.6)'; x.shadowBlur = 12;
    x.beginPath(); x.moveTo(256, 70); x.bezierCurveTo(226, 20, 150, 20, 150, 70); x.bezierCurveTo(150, 120, 226, 120, 256, 70);
    x.bezierCurveTo(286, 20, 362, 20, 362, 70); x.bezierCurveTo(362, 120, 286, 120, 256, 70); x.stroke();
    x.fillStyle = '#fff'; x.font = '800 78px Inter,system-ui,sans-serif'; x.fillText('WebLoop', 256, 205);
    x.font = '600 30px Inter,system-ui,sans-serif'; x.fillText('Project Ecosystem', 256, 255);
  });
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: label, transparent: true, depthTest: false }));
  spr.scale.set(3.1, 1.82, 1); spr.position.set(0, 0.85, 0.25); spr.renderOrder = 5; core.add(spr);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });
  const ell: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2; ell.push(new THREE.Vector3(RX * 0.78 * Math.cos(a), 0.02, RZ * 0.74 * Math.sin(a))); }
  const ringC = new THREE.CatmullRomCurve3(ell, true);
  add(world, new THREE.TubeGeometry(ringC, 160, 0.03, 6, true), lineMat);
  const spokes = ENTITIES.map((e) => {
    const p = pos(e), d = p.clone().normalize(), a = d.clone().multiplyScalar(1.95), b = p.clone().sub(d.clone().multiplyScalar(1.5));
    const c = new THREE.LineCurve3(a.setY(0.05), b.setY(0.05));
    add(world, new THREE.TubeGeometry(c, 2, 0.025, 6, false), lineMat);
    return c;
  });
  const pulses: { m: THREE.Mesh; c: THREE.Curve<THREE.Vector3>; t: number; v: number }[] = [];
  const pm = new THREE.MeshBasicMaterial({ color: 0xbff3ff });
  spokes.forEach((c, i) => { for (let k = 0; k < 2; k++) { const m = add(world, new THREE.SphereGeometry(0.07, 10, 8), pm); pulses.push({ m, c, t: k * 0.5 + i * 0.13, v: 0.16 + i * 0.015 }); } });
  for (let k = 0; k < 6; k++) { const m = add(world, new THREE.SphereGeometry(0.07, 10, 8), pm); pulses.push({ m, c: ringC, t: k / 6, v: 0.045 }); }

  let light = document.documentElement.classList.contains('light');
  function applyTheme() {
    light = document.documentElement.classList.contains('light');
    hemi.intensity = light ? 0.5 : 0.6; dir.intensity = light ? 0.8 : 0.7; pl.intensity = light ? 0.5 : 1.5;
    slabMat.color.set(light ? 0x8db5ef : 0x16335f); slabMat.opacity = light ? 0.95 : 0.88;
    topMat.color.set(light ? 0xc4dbff : 0x1c3d70);
    edgeMat.emissiveIntensity = light ? 0.9 : 1; edgeMat.color.set(light ? 0x4aa3ff : 0x38bdf8); edgeMat.emissive.set(light ? 0x2d8cff : 0x22d3ee);
    lineMat.color.set(light ? 0x3b82f6 : 0x38bdf8); lineMat.opacity = light ? 0.6 : 0.7;
    plats.forEach((p) => {
      (p.glow.material as THREE.MeshBasicMaterial).opacity = light ? 0.4 : 0.85;
      (p.glow.material as THREE.MeshBasicMaterial).blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      (p.glow.material as THREE.MeshBasicMaterial).needsUpdate = true;
    });
    (coreGlow.material as THREE.MeshBasicMaterial).opacity = light ? 0.4 : 0.9;
    (coreGlow.material as THREE.MeshBasicMaterial).blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    (coreGlow.material as THREE.MeshBasicMaterial).needsUpdate = true;
    if (!running) render();
  }

  let W = 1, H = 1;
  const T = Math.tan((27 * Math.PI) / 360);
  function size() {
    W = stage.clientWidth || 1; H = stage.clientHeight || 1;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    const hw = 5.9, hh = 4.2, d = Math.max(hw / (T * camera.aspect), hh / T) * 1.02;
    camera.position.set(0, d * 0.78, d * 0.63); camera.lookAt(0, 0.4, 0.35); camera.updateProjectionMatrix();
  }

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let yaw = 0, pitch = 0, tyaw = 0, tpitch = 0, drag: { x: number; y: number; yaw: number; pitch: number } | null = null, moved = 0;
  const LY = 0.4, LP = 0.14;
  let hover = -1;
  function pick(ev: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects(hit, false);
    return h.length ? (h[0].object.userData as any).i : -1;
  }
  const onPointerDown = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, yaw: tyaw, pitch: tpitch }; moved = 0; canvas.setPointerCapture(e.pointerId); };
  const onPointerMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      tyaw = clamp(drag.yaw + dx * 0.005, -LY, LY); tpitch = clamp(drag.pitch + dy * 0.003, -LP, LP);
      if (!running) render();
    } else if (e.pointerType !== 'touch') {
      const i = pick(e);
      if (i !== hover) { hover = i; canvas.style.cursor = i >= 0 ? 'pointer' : 'grab'; opts.onHoverChange?.(i); }
    }
  };
  const end = (e: PointerEvent) => { if (drag) { drag = null; try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ } } };
  const onPointerUp = (e: PointerEvent) => {
    const wasDrag = moved > 6; end(e);
    if (!wasDrag) { const i = pick(e); if (i >= 0) opts.onNavigate(ENTITIES[i]); }
  };
  const onPointerLeave = () => { if (!drag) { hover = -1; opts.onHoverChange?.(-1); } };
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key;
    if (k === 'ArrowLeft') tyaw = clamp(tyaw - 0.06, -LY, LY);
    else if (k === 'ArrowRight') tyaw = clamp(tyaw + 0.06, -LY, LY);
    else if (k === 'ArrowUp') tpitch = clamp(tpitch - 0.04, -LP, LP);
    else if (k === 'ArrowDown') tpitch = clamp(tpitch + 0.04, -LP, LP);
    else if (k === 'Home' || k === 'Escape') { tyaw = 0; tpitch = 0; if (RM) render(); return; }
    else return;
    e.preventDefault(); if (RM) render();
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('keydown', onKeyDown);

  const v3 = new THREE.Vector3();
  const ease = (t: number) => { const c = 1.70158; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  let clock = 0, last = performance.now(), running = false, raf = 0;

  function place() {
    const layouts = plats.map((p, i) => {
      const ou = new THREE.Vector3(p.base.x, 0, p.base.z).normalize().multiplyScalar(2.05);
      v3.set(p.base.x + ou.x, 0, p.base.z + ou.z).applyMatrix4(world.matrixWorld).project(camera);
      const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
      const { w: cw, h: ch } = opts.getCardSize(i);
      const cx = clamp(x, cw / 2 + 4, W - cw / 2 - 4), cy = clamp(y + 4, 4, H - ch - 4);
      const on = hover === i;
      const alpha = p.ap > 0.5 ? (p.ap > 0.98 ? 1 : 0.001 + (p.ap - 0.5) * 2) : 0;
      return { i, x: cx, y: cy, alpha, on };
    });
    opts.onCardLayout?.(layouts);
  }
  function frame(dt: number) {
    clock += dt; yaw += (tyaw - yaw) * 0.14; pitch += (tpitch - pitch) * 0.14;
    world.rotation.y = yaw; world.rotation.x = pitch; world.updateMatrixWorld(true);
    const act = hover;
    plats.forEach((p, i) => {
      p.ap = RM ? 1 : clamp((clock - 0.15 - i * 0.13) / 1.0, 0, 1);
      const a = ease(p.ap), tg = i === act ? 1 : 0;
      p.h += (tg - p.h) * Math.min(1, dt * 9);
      const bob = RM ? 0 : Math.sin(clock * 1.1 + i * 1.3) * 0.035;
      p.g.position.set(p.base.x, p.base.y + (1 - a) * -2.6 + p.h * 0.2 + bob, p.base.z);
      p.g.scale.setScalar(Math.max(0.001, 0.2 + 0.8 * a) * (1 + p.h * 0.05));
      (p.glow.material as THREE.MeshBasicMaterial).opacity = (light ? 0.4 : 0.85) * (0.7 + 0.6 * p.h) * a;
      edgeMat.emissiveIntensity = light ? 0.9 : 1;
    });
    if (!RM) floaters.forEach((f) => { f.o.position.y = (f.o.userData as any).by + Math.sin(clock * f.sp + f.ph) * f.a; });
    const ca = RM ? 1 : ease(clamp(clock / 0.9, 0, 1));
    core.scale.setScalar(Math.max(0.001, ca) * 0.86);
    ring1.rotation.z = clock * 0.3;
    pulses.forEach((q) => {
      if (!RM) q.t = (q.t + q.v * dt) % 1;
      q.c.getPoint(q.t, q.m.position);
      q.m.visible = ca > 0.9;
    });
  }
  function render() { if (RM) frame(0); renderer.render(scene, camera); place(); }
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!RM) frame(dt);
    else { yaw += (tyaw - yaw) * 0.3; pitch += (tpitch - pitch) * 0.3; world.rotation.y = yaw; world.rotation.x = pitch; world.updateMatrixWorld(true); }
    renderer.render(scene, camera); place();
    raf = running ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  applyTheme();
  window.addEventListener('themechange', applyTheme);
  size();
  const onResize = () => { size(); if (!running) render(); };
  window.addEventListener('resize', onResize);
  let ro: ResizeObserver | null = null;
  if ('ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(stage); }
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.02 });
  io.observe(stage);
  const onContextLost = (e: Event) => { e.preventDefault(); stop(); };
  canvas.addEventListener('webglcontextlost', onContextLost);
  if (RM) { clock = 9; render(); } else start();

  return {
    dispose() {
      stop();
      window.removeEventListener('themechange', applyTheme);
      window.removeEventListener('resize', onResize);
      ro?.disconnect(); io.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        if (o.material) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); }); }
      });
      renderer.dispose();
    },
  };
}
