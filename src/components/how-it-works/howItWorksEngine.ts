// @ts-nocheck
/* Scroll-driven 3D "How it works" stage — ported from the approved WebLoop demo
   (three.js r128 original) onto the app's own dark/light theme tokens and three r0.186.
   Mounts into the DOM rendered by HowItWorksStage.tsx + HowItWorksPage.tsx:
   #howgl canvas, .how-tabs buttons[data-mode], .how-hud (#howCount/#howState/#howHudLabel),
   .how-set[data-mode] > .how-intro / .how-step / .how-outro. */
import * as THREE from 'three';

// keep hex/rgb colours exactly as authored, no gamma-correction surprises
THREE.ColorManagement.enabled = false;

function cssColor(expr: string): string {
  const probe = document.createElement('div');
  probe.style.color = expr;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

// Cyan/teal dominant, matching the home page's particle stage hue family
// (particleEngine.ts applyTheme()), with a restrained blue top-end and a desaturated
// indigo reserved only for the rarer "spotlight" elements (ring, connector lines).
// No near-white/pale stops — those read as grey/washed, which is what we're fixing.
const NEON = {
  dark: {
    tile: '#1C2440', muted: '#64748B',
    levels: ['#1C2440', '#0E7490', '#06B6D4', '#22D3EE', '#38BDF8'],
    indigo: '#818CF8',
  },
  light: {
    tile: '#E3F3F8', muted: '#64748B',
    levels: ['#E3F3F8', '#14B8A6', '#06B6D4', '#0284C7', '#2563EB'],
    indigo: '#4F46E5',
  },
};
const ACCENT = '#06B6D4';
const ACCENT_DEEP = '#0E7490';
const AMBER = '#FBBF24';
const PILL_SOLID = '#0891B2';
const CARD_BG = '#FFFFFF';
const CARD_BG_SOFT = '#F5F7FC';
const CARD_LINE = '#E2E8F0';
const CARD_INK = '#0F172A';
const CARD_MUTED = '#475569';
const CARD_MUTED_2 = '#334155';
const CARD_DASH = '#CBD5E1';
const GRID_SHADES = ['#E2E8F0', '#5EEAD4', '#06B6D4', '#0284C7', '#2563EB'];
function isLightTheme() {
  return document.documentElement.classList.contains('light');
}

export function startHowItWorksStage(): () => void {
  let raf = 0;
  const canvas = document.getElementById('howgl') as HTMLCanvasElement | null;
  if (!canvas) return () => {};
  const countEl = document.getElementById('howCount');
  const hudLabel = document.getElementById('howHudLabel');
  const stateEl = document.getElementById('howState');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a8, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(-12, 20, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 50, top: 20, bottom: -20, far: 90 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 140), new THREE.ShadowMaterial({ opacity: 0.1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let pal: any = {};
  function readPalette() {
    const bg = new THREE.Color(cssColor('rgb(var(--ink-950))'));
    const N = isLightTheme() ? NEON.light : NEON.dark;
    pal = {
      bg,
      tile: new THREE.Color(N.tile),
      muted: new THREE.Color(N.muted),
      // tile (unfilled) -> the same teal -> cyan -> violet walk the home hero colours its sphere with
      s: N.levels.map((hex) => new THREE.Color(hex)),
      indigo: new THREE.Color(N.indigo),
    };
    scene.fog = new THREE.Fog(bg, 22, 62);
  }
  readPalette();
  window.addEventListener('themechange', readPalette);

  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const ease = (x: number) => x * x * (3 - 2 * x);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rand = (i: number) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const FONT = 'Manrope, Inter, system-ui, sans-serif';
  const tmp = new THREE.Color();
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function stars(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, size: number) {
    ctx.font = `700 ${size}px ${FONT}`;
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < n ? AMBER : '#D9DEE8'; ctx.fillText('★', x + i * size * 1.05, y); }
  }
  function card(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.clearRect(0, 0, W, H); rr(ctx, 0, 0, W, H, 28); ctx.fillStyle = CARD_BG; ctx.fill(); ctx.strokeStyle = CARD_LINE; ctx.lineWidth = 3; ctx.stroke();
  }
  function txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color: string, align?: CanvasTextAlign) {
    ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); ctx.textAlign = 'left';
  }
  function logo(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, label: string) {
    rr(ctx, x, y, s, s, s * 0.2); ctx.fillStyle = CARD_INK; ctx.fill(); txt(ctx, label, x + s / 2, y + s * 0.64, s * 0.4, 800, '#FFFFFF', 'center');
  }
  function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.22); ctx.strokeStyle = PILL_SOLID; ctx.lineWidth = 8; rr(ctx, -150, -52, 300, 104, 16); ctx.stroke(); txt(ctx, label, 0, 22, 56, 800, PILL_SOLID, 'center'); ctx.restore();
  }

  function makeSheet(group: any, w: number, h: number, pw: number, ph: number) {
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    group.add(mesh);
    return { ctx: cv.getContext('2d'), tex, mat, mesh, w, h, W: pw, H: ph };
  }
  function fadeSheet(sh: any, a: number, base: number, axis: 'x' | 'y', dist: number) {
    sh.mat.opacity = a; sh.mesh.visible = a > 0.01;
    sh.mesh.position[axis] = base - (1 - a) * dist;
  }

  // ================= STUDENT STORY =================
  function buildStudent() {
    const g = new THREE.Group(); scene.add(g);
    const COLS = 52, ROWS = 7, GAP = 1.15, BASE = 0.12, FOCUS = 34 * ROWS + 3;
    const bars: any[] = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const i = c * ROWS + r, v = rand(i) * (0.5 + c / COLS);
      const lvl = v < 0.3 ? 0 : v < 0.55 ? 1 : v < 0.8 ? 2 : v < 1.05 ? 3 : 4;
      const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, emissiveIntensity: 0.4 }));
      m.scale.set(0.9, BASE, 0.9);
      m.position.set((c - (COLS - 1) / 2) * GAP, 0, (r - (ROWS - 1) / 2) * GAP);
      m.castShadow = true; g.add(m);
      bars.push({ m, c, lvl, h: i === FOCUS ? 2.6 : 0.35 + lvl * 0.7 });
    }
    const focus = bars[FOCUS], fx = focus.m.position.x, fz = focus.m.position.z;

    const ENTRIES = [
      { project: 'Carbon Ledger', by: 'Company project', task: 'Designed the emissions data model', stars: 5 },
      { project: 'Studyflow', by: 'Student project', task: 'Built the spaced-repetition scheduler', stars: 5 },
      { project: 'Northstack CLI', by: 'University capstone', task: 'Wrote the Node scaffolding template', stars: 4 },
      { project: 'Carbon Ledger', by: 'Company project', task: 'Added CSV import with validation', stars: 5 },
    ];
    const avg = (ENTRIES.reduce((a, e) => a + e.stars, 0) / ENTRIES.length).toFixed(1);

    const cv = makeSheet(g, 8.4, 10.9, 900, 1168);
    cv.mesh.position.set(12, 6.2, -7); cv.mesh.rotation.y = 0.36;
    const ROW_Y0 = 430, ROW_H = 158;
    function drawCV(shown: number) {
      const c = cv.ctx; card(c, cv.W, cv.H);
      c.fillStyle = '#CFFAFE'; c.beginPath(); c.arc(110, 120, 52, 0, Math.PI * 2); c.fill();
      txt(c, 'SN', 110, 134, 40, 800, ACCENT_DEEP, 'center');
      txt(c, '[Student name]', 190, 112, 46, 800, CARD_INK);
      txt(c, 'Full-stack developer, verified on WebLoop', 190, 156, 28, 500, CARD_MUTED);
      for (let col = 0; col < 26; col++) for (let r = 0; r < 7; r++) { c.fillStyle = GRID_SHADES[bars[(col + 26) * 7 + r].lvl]; rr(c, 60 + col * 30, 210 + r * 18, 24, 13, 3); c.fill(); }
      txt(c, 'Verified experience', 60, 392, 32, 800, CARD_INK);
      ENTRIES.forEach((e, i) => {
        const y = ROW_Y0 + i * ROW_H;
        rr(c, 50, y, 800, ROW_H - 18, 18);
        if (i < shown) {
          c.fillStyle = CARD_BG_SOFT; c.fill();
          txt(c, e.project, 80, y + 48, 32, 800, CARD_INK);
          txt(c, e.by, 80, y + 84, 24, 500, CARD_MUTED);
          txt(c, e.task, 80, y + 120, 26, 500, CARD_MUTED_2);
          stars(c, 600, y + 52, e.stars, 30);
          rr(c, 660, y + 74, 160, 40, 20); c.fillStyle = PILL_SOLID; c.fill();
          txt(c, '✓ Verified', 682, y + 101, 22, 700, '#FFFFFF');
        } else { c.setLineDash([12, 10]); c.strokeStyle = CARD_DASH; c.lineWidth = 3; c.stroke(); c.setLineDash([]); }
      });
      txt(c, shown ? `Average rating ${avg} from ${shown} reviewed task${shown > 1 ? 's' : ''}` : 'Waiting for verified tasks', 60, 1110, 26, 600, CARD_MUTED);
      cv.tex.needsUpdate = true;
    }
    const offer = makeSheet(g, 7.2, 4.3, 900, 538);
    offer.mesh.position.set(20.5, 4.3, -1.2); offer.mesh.rotation.y = 0.5;
    function drawOffer(hired: boolean) {
      const c = offer.ctx; card(c, offer.W, offer.H);
      logo(c, 50, 50, 96, 'CL');
      txt(c, 'Carbon Ledger', 170, 92, 40, 800, CARD_INK);
      txt(c, 'sent you an offer', 170, 132, 26, 500, CARD_MUTED);
      txt(c, 'Junior Backend Developer', 50, 240, 46, 800, CARD_INK);
      txt(c, `Based on ${ENTRIES.length} verified tasks, ${avg} average rating`, 50, 290, 26, 500, CARD_MUTED);
      stars(c, 50, 360, 5, 36);
      if (hired) stamp(c, 680, 420, 'HIRED');
      offer.tex.needsUpdate = true;
    }

    const sources = bars.filter((b) => b.lvl === 4 && b.c > 28).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 4)) === 0).slice(0, 4);
    const tokMat = new THREE.MeshStandardMaterial({ color: 0x22D3EE, emissive: 0x22D3EE, emissiveIntensity: 0.45, fog: false });
    const tokens = sources.map(() => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), tokMat); t.visible = false; g.add(t); return t; });
    const v0 = new THREE.Vector3(), v1 = new THREE.Vector3();
    let lastShown = -1, lastHired: boolean | null = null;

    return {
      group: g, label: 'Verified tasks',
      keys: [
        { pos: [-24, 13, 28], look: [4, 0, 0] },
        { pos: [fx + 6, 8, fz + 11], look: [fx - 4, 0, fz] },
        { pos: [fx + 4.5, 4.8, fz + 7], look: [fx, 0.6, fz] },
        { pos: [fx + 4, 3.8, fz + 6], look: [fx, 1.5, fz] },
        { pos: [10, 16, 32], look: [2, 0.6, 0] },
        { pos: [25, 9, 22], look: [12, 5.6, -7] },
        { pos: [31, 8, 21], look: [17, 4.8, -4] },
      ],
      reset() { lastShown = -1; lastHired = null; },
      update(p: number, t: number) {
        tokMat.color.copy(pal.s[3]); tokMat.emissive.copy(pal.s[3]);
        let verified = 0;
        const a2 = ease(clamp(p - 0.3)), a3 = ease(clamp(p - 1.3));
        for (const b of bars) {
          let h, col;
          if (b === focus) {
            h = lerp(lerp(BASE, 0.8, a2), b.h, a3);
            if (a2 > 0 && a3 < 1 && !reduce) h += Math.sin(t * 3) * 0.06 * (1 - a3);
            col = tmp.copy(pal.tile).lerp(pal.s[1], a2).lerp(pal.s[4], a3);
            if (a3 > 0.5) verified++;
          } else {
            const w = ease(clamp((p - 2.3) * 1.8 - (b.c / COLS) * 0.8));
            h = lerp(BASE, b.lvl ? b.h : BASE, w);
            col = tmp.copy(pal.tile).lerp(pal.s[b.lvl], w);
            if (b.lvl && w > 0.5) verified++;
          }
          b.m.scale.y = Math.max(0.01, h); b.m.material.color.copy(col); b.m.material.emissive.copy(col);
        }
        fadeSheet(cv, ease(clamp((p - 3.3) * 1.6)), 6.2, 'y', 2);
        let shown = 0;
        sources.forEach((b, i) => {
          const tt = clamp((p - 3.7) * 2.4 - i * 0.4), tok = tokens[i];
          if (tt >= 0.98) shown++;
          tok.visible = tt > 0.02 && tt < 0.98;
          if (!tok.visible) return;
          const e = ease(tt);
          v0.set(b.m.position.x, b.m.scale.y + 0.3, b.m.position.z);
          v1.set(-cv.w * 0.25, (0.5 - (ROW_Y0 + i * ROW_H + 70) / cv.H) * cv.h, 0.1);
          cv.mesh.localToWorld(v1);
          tok.position.lerpVectors(v0, v1, e); tok.position.y += Math.sin(e * Math.PI) * 4;
          tok.rotation.set(e * 6, e * 4, 0);
        });
        if (shown !== lastShown) { drawCV(shown); lastShown = shown; }
        fadeSheet(offer, ease(clamp((p - 4.35) * 2)), 20.5, 'x', -6);
        const hired = p > 4.8;
        if (hired !== lastHired) { drawOffer(hired); lastHired = hired; }
        return {
          count: verified,
          state: p < -0.4 ? 'Scroll to begin' : p < 0.6 ? 'New profile' : p < 1.6 ? 'Task in progress' : p < 2.6 ? 'Task verified' : p < 3.5 ? 'Building a track record' : p < 4.5 ? 'CV updating itself' : p < 4.8 ? 'Offer received' : 'Hired',
        };
      },
    };
  }

  // ================= COMPANY STORY =================
  function buildCompany() {
    const g = new THREE.Group(); scene.add(g);
    const LANES = [-5, 0, 5];

    const laneMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const lanes = LANES.map((x) => { const m = new THREE.Mesh(box, laneMat); m.scale.set(4.2, 0.06, 11); m.position.set(x, 0, -0.2); m.receiveShadow = true; g.add(m); return m; });
    const laneLabels = ['To do', 'In review', 'Done'].map((s, i) => {
      const sh = makeSheet(g, 4, 1, 512, 128);
      txt(sh.ctx, s, 256, 84, 60, 800, CARD_MUTED, 'center'); sh.tex.needsUpdate = true;
      sh.mesh.rotation.x = -Math.PI / 2; sh.mesh.position.set(LANES[i], 0.08, -6.6);
      return sh;
    });

    const TASKS: [string, number][] = [
      ['Set up database schema', 5], ['Build login flow', 4], ['Emissions chart', 5], ['CSV import', 5],
      ['API rate limiting', 4], ['Parser unit tests', 5], ['Dashboard filters', 5], ['Deploy pipeline', 4],
    ];
    const tasks = TASKS.map((tk, i) => {
      const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ roughness: 0.5, emissiveIntensity: 0.4 }));
      m.position.set(LANES[0], 0.06, -4.6 + i * 1.2); m.scale.set(3.4, 0.01, 0.9);
      m.castShadow = true; g.add(m);
      return { m, i, name: tk[0], stars: tk[1] };
    });

    const brief = makeSheet(g, 9, 5.4, 900, 540);
    brief.mesh.position.set(0, 4.4, -10);
    (function () {
      const c = brief.ctx; card(c, brief.W, brief.H);
      logo(c, 50, 50, 96, 'CL');
      txt(c, 'Carbon Ledger', 170, 92, 40, 800, CARD_INK);
      txt(c, 'posted a new project', 170, 132, 26, 500, CARD_MUTED);
      txt(c, 'Emissions Dashboard', 50, 240, 52, 800, CARD_INK);
      txt(c, 'Looking for: Backend, Frontend, QA', 50, 296, 28, 500, CARD_MUTED_2);
      txt(c, '8 tasks with acceptance criteria, about 6 weeks', 50, 340, 26, 500, CARD_MUTED);
      ['React', 'PostgreSQL', 'TypeScript'].forEach((s, i) => { rr(c, 50 + i * 200, 400, 180, 56, 28); c.fillStyle = '#ECFEFF'; c.fill(); txt(c, s, 140 + i * 200, 437, 24, 700, ACCENT_DEEP, 'center'); });
      brief.tex.needsUpdate = true;
    })();

    const APPS = [
      { name: 'Student A', avg: '4.2', n: 5, power: 0.55 },
      { name: 'Student B', avg: '4.5', n: 7, power: 0.75 },
      { name: 'Student C', avg: '4.8', n: 12, power: 1.15 },
      { name: 'Student D', avg: '3.9', n: 3, power: 0.4 },
      { name: 'Student E', avg: '4.4', n: 6, power: 0.65 },
    ];
    const BEST = 2;
    const apps = APPS.map((a, j) => {
      const cx = 14 + j * 6.2, bars: any[] = [];
      for (let c = 0; c < 6; c++) for (let r = 0; r < 5; r++) {
        const v = rand(j * 97 + c * 5 + r + 3) * a.power;
        const lvl = v < 0.25 ? 0 : v < 0.45 ? 1 : v < 0.65 ? 2 : v < 0.85 ? 3 : 4;
        const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ roughness: 0.55, emissiveIntensity: 0.4 }));
        m.position.set(cx + (c - 2.5) * 0.8, 0, (r - 2) * 0.8); m.scale.set(0.65, 0.01, 0.65);
        m.castShadow = true; g.add(m); bars.push({ m, lvl, h: 0.3 + lvl * 0.75 });
      }
      const lab = makeSheet(g, 4.6, 1.5, 600, 196);
      const c = lab.ctx; card(c, 600, 196);
      txt(c, a.name, 36, 78, 44, 800, CARD_INK);
      txt(c, `★ ${a.avg} average, ${a.n} verified tasks`, 36, 140, 28, 600, CARD_MUTED);
      lab.tex.needsUpdate = true;
      lab.mesh.position.set(cx, 0.9, 2.9); lab.mesh.rotation.x = -0.35;
      return { cx, bars, lab };
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.4, 64), new THREE.MeshBasicMaterial({ color: 0x06B6D4, transparent: true, opacity: 0, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(apps[BEST].cx, 0.05, 0); g.add(ring);

    const panel = makeSheet(g, 6.4, 5.6, 760, 666);
    panel.mesh.position.set(10.6, 3.6, -3.2); panel.mesh.rotation.y = -0.35;
    function drawPanel(n: number) {
      const c = panel.ctx; card(c, panel.W, panel.H);
      txt(c, 'Your reviews', 44, 76, 40, 800, CARD_INK);
      txt(c, `${n} of ${TASKS.length} tasks accepted`, 44, 120, 26, 500, CARD_MUTED);
      const list = tasks.slice(Math.max(0, n - 4), n).reverse();
      for (let k = 0; k < 4; k++) {
        const y = 160 + k * 118;
        rr(c, 36, y, 688, 100, 18);
        const tk = list[k];
        if (tk) { c.fillStyle = CARD_BG_SOFT; c.fill(); txt(c, tk.name, 64, y + 44, 28, 800, CARD_INK); stars(c, 64, y + 82, tk.stars, 26); rr(c, 548, y + 30, 150, 40, 20); c.fillStyle = PILL_SOLID; c.fill(); txt(c, '✓ Accepted', 623, y + 57, 21, 700, '#FFFFFF', 'center'); }
        else { c.setLineDash([12, 10]); c.strokeStyle = CARD_DASH; c.lineWidth = 3; c.stroke(); c.setLineDash([]); }
      }
      panel.tex.needsUpdate = true;
    }

    const offer = makeSheet(g, 7.2, 4.3, 900, 538);
    offer.mesh.position.set(apps[BEST].cx + 1.5, 4.6, 3.2); offer.mesh.rotation.y = 0.3;
    function drawOffer(acc: boolean) {
      const c = offer.ctx; card(c, offer.W, offer.H);
      c.fillStyle = '#CFFAFE'; c.beginPath(); c.arc(98, 98, 48, 0, Math.PI * 2); c.fill();
      txt(c, 'SC', 98, 112, 36, 800, ACCENT_DEEP, 'center');
      txt(c, 'Offer sent to Student C', 170, 92, 38, 800, CARD_INK);
      txt(c, 'from Carbon Ledger', 170, 132, 26, 500, CARD_MUTED);
      txt(c, 'Junior Backend Developer', 50, 240, 46, 800, CARD_INK);
      txt(c, 'Backed by 12 verified tasks, 4.8 average rating', 50, 290, 26, 500, CARD_MUTED);
      stars(c, 50, 360, 5, 36);
      if (acc) stamp(c, 680, 420, 'ACCEPTED');
      offer.tex.needsUpdate = true;
    }

    let lastN = -1, lastAcc: boolean | null = null;
    return {
      group: g, label: 'Tasks done',
      keys: [
        { pos: [-14, 16, 26], look: [10, 0, 0] },
        { pos: [3, 7, 13], look: [0, 3, -5] },
        { pos: [26, 10, 19], look: [26.4, 0.5, 0] },
        { pos: [2, 13, 13], look: [0, 0, -0.5] },
        { pos: [9, 7, 10], look: [5, 1.2, -1] },
        { pos: [26, 9, 17], look: [26.4, 1.5, 0] },
        { pos: [30, 6.5, 15], look: [27.5, 3.8, 2] },
      ],
      reset() { lastN = -1; lastAcc = null; },
      update(p: number, t: number) {
        laneMat.color.copy(pal.tile);
        ring.material.color.copy(pal.indigo);
        const lanesOn = ease(clamp((p + 0.2) * 2));
        lanes.forEach((l) => { l.scale.y = 0.06 * lanesOn + 0.001; });
        laneLabels.forEach((l) => { l.mat.opacity = lanesOn; l.mesh.visible = lanesOn > 0.01; });
        fadeSheet(brief, ease(clamp(p * 2)), 4.4, 'y', 2);

        let done = 0;
        for (const tk of tasks) {
          const appear = ease(clamp(p * 2.2 - tk.i * 0.12));
          const m1 = ease(clamp((p - 1.8) * 3 - tk.i * 0.25));
          const m2 = ease(clamp((p - 2.3) * 3 - tk.i * 0.25));
          const rated = ease(clamp((p - 2.9) * 3 - tk.i * 0.3));
          tk.m.position.x = LANES[0] + 5 * m1 + 5 * m2;
          tk.m.position.y = 0.06 + Math.sin(m1 * Math.PI) * 0.8 + Math.sin(m2 * Math.PI) * 0.8;
          tk.m.scale.y = Math.max(0.01, 0.3 * appear + rated * 0.3);
          { const tc = pal.s[0].clone().lerp(pal.s[1], m1).lerp(pal.s[2], m2).lerp(pal.s[4], rated); tk.m.material.color.copy(tc); tk.m.material.emissive.copy(tc); }
          if (rated > 0.9) done++;
        }
        if (done !== lastN) { drawPanel(done); lastN = done; }
        fadeSheet(panel, ease(clamp((p - 2.8) * 2.5)) * (1 - ease(clamp((p - 3.9) * 3))), 3.6, 'y', 1.5);

        const appIn = ease(clamp((p - 0.6) * 1.6));
        const rise = ease(clamp((p - 3.4) * 1.8));
        apps.forEach((a, j) => {
          const best = j === BEST;
          a.bars.forEach((b) => {
            const hFlat = 0.12, hFull = b.lvl ? b.h : 0.12;
            b.m.scale.y = Math.max(0.01, appIn * lerp(hFlat + b.lvl * 0.08, hFull, rise));
            const base = tmp.copy(pal.tile).lerp(pal.s[b.lvl], appIn);
            if (!best) base.lerp(pal.muted, rise * 0.75 * (b.lvl ? 1 : 0));
            b.m.material.color.copy(base); b.m.material.emissive.copy(base);
          });
          const la = appIn * (best ? 1 : 1 - rise * 0.6);
          a.lab.mat.opacity = la; a.lab.mesh.visible = la > 0.01;
        });
        ring.material.opacity = rise * (0.75 + (reduce ? 0 : Math.sin(t * 2.5) * 0.25));

        fadeSheet(offer, ease(clamp((p - 4.35) * 2)), apps[BEST].cx + 1.5, 'x', -5);
        const acc = p > 4.8;
        if (acc !== lastAcc) { drawOffer(acc); lastAcc = acc; }

        return {
          count: `${done}/${TASKS.length}`,
          state: p < -0.4 ? 'Scroll to begin' : p < 0.6 ? 'Project posted' : p < 1.6 ? 'Applications coming in' : p < 2.6 ? 'Work in progress' : p < 3.5 ? 'Reviewing work' : p < 4.5 ? 'Comparing applicants' : p < 4.8 ? 'Offer sent' : 'Hired',
        };
      },
    };
  }

  // ================= UNIVERSITY STORY =================
  function buildUniversity() {
    const g = new THREE.Group(); scene.add(g);
    const TEAM_X = [-6, 0, 6], COUNTS = [5, 7, 4];

    const brief = makeSheet(g, 9, 5.4, 900, 540);
    brief.mesh.position.set(0, 4.4, -10);
    function drawBrief() {
      const c = brief.ctx; card(c, brief.W, brief.H);
      logo(c, 50, 50, 96, 'U');
      txt(c, 'University of [Name]', 170, 92, 38, 800, CARD_INK);
      txt(c, 'Software Engineering course', 170, 132, 26, 500, CARD_MUTED);
      txt(c, 'Northstack CLI capstone', 50, 240, 50, 800, CARD_INK);
      txt(c, '3 teams of 4 students, about 8 weeks', 50, 296, 28, 500, CARD_MUTED_2);
      txt(c, 'Graded on verified tasks and reviewer ratings', 50, 340, 26, 500, CARD_MUTED);
      ['Node.js', 'TypeScript', 'Git'].forEach((s, i) => { rr(c, 50 + i * 200, 400, 180, 56, 28); c.fillStyle = '#ECFEFF'; c.fill(); txt(c, s, 140 + i * 200, 437, 24, 700, ACCENT_DEEP, 'center'); });
      brief.tex.needsUpdate = true;
    }

    const discMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const discs = TEAM_X.map((x) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.05, 48), discMat); d.position.set(x, 0.025, 2); d.receiveShadow = true; g.add(d); return d; });
    const teamLabels = TEAM_X.map((x, j) => { const sh: any = makeSheet(g, 3, 0.75, 512, 128); sh.mesh.rotation.x = -Math.PI / 2; sh.mesh.position.set(x, 0.07, 4.4); sh.draw = () => { sh.ctx.clearRect(0, 0, 512, 128); txt(sh.ctx, `Team ${j + 1}`, 256, 84, 60, 800, CARD_MUTED, 'center'); sh.tex.needsUpdate = true; }; return sh; });

    const bodyGeo = new THREE.CylinderGeometry(0.26, 0.36, 0.8, 24); bodyGeo.translate(0, 0.4, 0);
    const headGeo = new THREE.SphereGeometry(0.26, 24, 16); headGeo.translate(0, 1.08, 0);
    const pawns: any[] = [];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
      const pg = new THREE.Group();
      const b = new THREE.Mesh(bodyGeo, mat), h = new THREE.Mesh(headGeo, mat);
      b.castShadow = h.castShadow = true; pg.add(b, h); g.add(pg);
      const team = i % 3, mIdx = Math.floor(i / 3);
      pawns.push({
        g: pg, mat, team,
        from: new THREE.Vector3((rand(i + 40) - 0.5) * 14, 0, (rand(i + 80) - 0.5) * 6 + 1),
        to: new THREE.Vector3(TEAM_X[team] + ((mIdx % 2) - 0.5) * 1.3, 0, 2 + (Math.floor(mIdx / 2) - 0.5) * 1.3),
      });
    }

    const blocks: any[] = [];
    COUNTS.forEach((n, j) => { for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ roughness: 0.5, emissiveIntensity: 0.4 }));
      m.scale.set(1.5, 0.44, 1.5); m.castShadow = true; m.visible = false; g.add(m);
      blocks.push({ m, j, k, lvl: 1 + Math.min(3, Math.floor(k / 2)) });
    } });

    const TEAMS = [
      { name: 'Team 1', n: 5, avg: '4.6', grade: '4.5' },
      { name: 'Team 2', n: 7, avg: '4.8', grade: '5.0' },
      { name: 'Team 3', n: 4, avg: '4.2', grade: '4.0' },
    ];
    const grading = makeSheet(g, 7, 5, 840, 600);
    grading.mesh.position.set(11, 3.8, -2.4); grading.mesh.rotation.y = -0.25;
    function drawGrading() {
      const c = grading.ctx; card(c, grading.W, grading.H);
      txt(c, 'Grading overview', 44, 76, 40, 800, CARD_INK);
      txt(c, 'Backed by verified tasks and reviewer ratings', 44, 120, 26, 500, CARD_MUTED);
      ['Team', 'Tasks', 'Rating', 'Suggested grade'].forEach((h, i) => txt(c, h, [44, 260, 410, 570][i], 186, 22, 700, '#64748B'));
      TEAMS.forEach((tm, i) => {
        const y = 210 + i * 120;
        rr(c, 30, y, 780, 100, 18); c.fillStyle = CARD_BG_SOFT; c.fill();
        txt(c, tm.name, 56, y + 62, 30, 800, CARD_INK);
        txt(c, String(tm.n), 270, y + 62, 30, 700, CARD_MUTED_2);
        txt(c, `★ ${tm.avg}`, 410, y + 62, 30, 700, CARD_MUTED_2);
        rr(c, 600, y + 24, 150, 52, 26); c.fillStyle = PILL_SOLID; c.fill();
        txt(c, tm.grade, 675, y + 61, 28, 800, '#FFFFFF', 'center');
      });
      grading.tex.needsUpdate = true;
    }

    const PARTNERS = [['CL', 'Carbon Ledger'], ['NW', 'Northwind Labs'], ['BB', 'Brightbox']];
    const partners = PARTNERS.map((pt, k) => {
      const sh: any = makeSheet(g, 4.4, 1.6, 660, 240);
      sh.mesh.position.set(12 + k * 5, 2.6, -8);
      sh.draw = () => { const c = sh.ctx; card(c, 660, 240); logo(c, 36, 52, 136, pt[0]); txt(c, pt[1], 200, 110, 42, 800, CARD_INK); txt(c, 'Industry partner', 200, 160, 28, 500, CARD_MUTED); sh.tex.needsUpdate = true; };
      return sh;
    });
    const LINKS: [number, number][] = [[0, 1], [0, 7], [1, 4], [1, 10], [2, 2], [2, 8], [0, 5]];
    const lineMat = new THREE.LineBasicMaterial({ color: 0x06B6D4, transparent: true, opacity: 0, fog: false });
    const links = LINKS.map(([pi, wi]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geo, lineMat); g.add(line);
      return { pi, wi, line, pos: geo.attributes.position };
    });

    const report = makeSheet(g, 7.4, 5.4, 900, 657);
    report.mesh.position.set(22, 4.6, 0.8); report.mesh.rotation.y = 0.35;
    function drawReport(done: boolean) {
      const c = report.ctx; card(c, report.W, report.H);
      txt(c, 'Cohort report', 50, 86, 46, 800, CARD_INK);
      txt(c, 'Software Engineering capstone (demo data)', 50, 130, 26, 500, CARD_MUTED);
      ([['12', 'students'], ['16', 'verified tasks'], ['4.6', 'average rating'], ['9', 'interview requests'], ['3', 'job offers']] as [string, string][]).forEach(([v, l], i) => {
        const col = i % 3, row = Math.floor(i / 3), x = 50 + col * 270, y = 180 + row * 190;
        rr(c, x, y, 250, 160, 20); c.fillStyle = i === 4 ? ACCENT : CARD_BG_SOFT; c.fill();
        txt(c, v, x + 28, y + 82, 60, 800, i === 4 ? '#FFFFFF' : CARD_INK);
        txt(c, l, x + 28, y + 128, 24, 600, i === 4 ? '#ECFEFF' : CARD_MUTED);
      });
      if (done) stamp(c, 720, 560, 'EXPORTED');
      report.tex.needsUpdate = true;
    }

    let lastDone: boolean | null = null;
    function drawAll() { drawBrief(); teamLabels.forEach((l: any) => l.draw()); drawGrading(); partners.forEach((pt: any) => pt.draw()); lastDone = null; }
    drawAll();
    const v = new THREE.Vector3();

    return {
      group: g, label: 'Tasks verified',
      keys: [
        { pos: [-16, 15, 26], look: [6, 0, 0] },
        { pos: [2, 7, 13], look: [0, 3, -5] },
        { pos: [0, 12, 14.5], look: [0, 0, 1] },
        { pos: [3, 8.5, 12.5], look: [0, 1.6, -1] },
        { pos: [9, 7, 11.5], look: [9.5, 3, -2] },
        { pos: [10, 12, 19], look: [9, 1.5, -3] },
        { pos: [27, 7.5, 15], look: [21.5, 4, 0] },
      ],
      reset() { drawAll(); },
      update(p: number, t: number) {
        lineMat.color.copy(pal.indigo);
        fadeSheet(brief, ease(clamp(p * 2)), 4.4, 'y', 2);
        const pawnIn = 1;
        const form = ease(clamp((p - 0.7) * 1.6));
        discMat.color.copy(pal.tile);
        discs.forEach((d) => { d.scale.set(form + 0.001, 1, form + 0.001); });
        teamLabels.forEach((l: any) => { l.mat.opacity = form; l.mesh.visible = form > 0.01; });

        const linkOn = ease(clamp((p - 3.5) * 1.6));
        const linked = new Set(LINKS.map((l) => l[1]));
        pawns.forEach((pw, i) => {
          pw.g.position.lerpVectors(pw.from, pw.to, form);
          pw.g.position.y = Math.sin(form * Math.PI) * 0.6;
          if (!reduce && form > 0 && form < 1) pw.g.position.y += Math.abs(Math.sin(t * 6 + i)) * 0.15;
          pw.g.scale.setScalar(Math.max(0.001, pawnIn));
          const c = tmp.copy(pal.tile).lerp(pal.s[2], form);
          if (linked.has(i)) c.lerp(pal.s[4], linkOn);
          pw.mat.color.copy(c);
        });

        let verified = 0;
        blocks.forEach((b) => {
          const sh = ease(clamp((p - 1.7) * 2.2 - b.k * 0.16 - b.j * 0.06));
          b.m.visible = sh > 0.01;
          b.m.position.set(TEAM_X[b.j], b.k * 0.5 + (1 - sh) * 4, -1.4);
          b.m.material.color.copy(pal.s[b.lvl]); b.m.material.emissive.copy(pal.s[b.lvl]);
          if (sh > 0.95) verified++;
        });

        fadeSheet(grading, ease(clamp((p - 2.8) * 2.5)) * (1 - ease(clamp((p - 3.9) * 3))), 3.8, 'y', 1.5);

        partners.forEach((pt, k) => fadeSheet(pt, ease(clamp((p - 3.4) * 2 - k * 0.2)), 2.6, 'y', 1.5));
        lineMat.opacity = linkOn * 0.9;
        links.forEach((l) => {
          const pt = partners[l.pi].mesh.position, pw = pawns[l.wi].g.position;
          l.pos.setXYZ(0, pt.x, pt.y - 0.8, pt.z + 0.05);
          v.set(pt.x, pt.y - 0.8, pt.z).lerp(new THREE.Vector3(pw.x, 1.3, pw.z), linkOn);
          l.pos.setXYZ(1, v.x, v.y, v.z);
          l.pos.needsUpdate = true;
          l.line.visible = linkOn > 0.01;
        });

        fadeSheet(report, ease(clamp((p - 4.35) * 2)), 22, 'x', -5);
        const done = p > 4.8;
        if (done !== lastDone) { drawReport(done); lastDone = done; }

        return {
          count: verified,
          state: p < -0.4 ? 'Scroll to begin' : p < 0.6 ? 'Capstone published' : p < 1.6 ? 'Teams formed' : p < 2.6 ? 'Work in progress' : p < 3.5 ? 'Grading' : p < 4.5 ? 'Industry partners connected' : p < 4.8 ? 'Building the report' : 'Report exported',
        };
      },
    };
  }

  const stories: Record<string, any> = { student: buildStudent(), company: buildCompany(), university: buildUniversity() };
  let mode = 'student', story = stories.student, steps: Element[] = [];
  let target = -1, p = -1;

  function setMode(m: string) {
    mode = m; story = stories[m];
    Object.entries(stories).forEach(([k, s]) => { s.group.visible = k === m; s.reset(); });
    document.querySelectorAll('.how-set').forEach((el) => { (el as HTMLElement).hidden = (el as HTMLElement).dataset.mode !== m; });
    document.querySelectorAll('.how-tabs button').forEach((b) => b.setAttribute('aria-selected', String((b as HTMLElement).dataset.mode === m)));
    if (hudLabel) hudLabel.textContent = story.label;
    steps = Array.from(document.querySelectorAll(`.how-set[data-mode="${m}"] .how-intro, .how-set[data-mode="${m}"] .how-step`));
    window.scrollTo({ top: 0, behavior: 'instant' });
    target = p = -1;
    measure();
  }
  const tabButtons = Array.from(document.querySelectorAll('.how-tabs button'));
  const onTabClick = (b: Element) => () => { if (b.getAttribute('data-mode') !== mode) setMode(b.getAttribute('data-mode')!); };
  const tabHandlers = tabButtons.map((b) => { const h = onTabClick(b); b.addEventListener('click', h); return { b, h }; });

  function measure() {
    const mid = window.innerHeight * 0.55;
    let prog = 0;
    steps.forEach((s, i) => {
      const r = s.getBoundingClientRect(), t = (mid - r.top) / r.height;
      if (t >= 0) prog = Math.max(prog, i + Math.min(1, t));
      s.classList.toggle('on', r.top < mid && r.bottom > mid);
    });
    target = Math.min(5, Math.max(-1, prog - 1.5));
  }
  window.addEventListener('scroll', measure, { passive: true });

  const look = new THREE.Vector3();
  let mobile = false;
  function frame(time: number) {
    raf = requestAnimationFrame(frame);
    p += (target - p) * (reduce ? 1 : 0.07);
    const t = time / 1000, q = p + 1, keys = story.keys;
    const k = Math.min(keys.length - 2, Math.floor(q)), f = ease(clamp(q - k));
    const A = keys[k], B = keys[k + 1], zoom = mobile ? 1.3 : 1;
    camera.position.set(lerp(A.pos[0], B.pos[0], f), lerp(A.pos[1], B.pos[1], f) * zoom, lerp(A.pos[2], B.pos[2], f) * zoom);
    look.set(lerp(A.look[0], B.look[0], f), lerp(A.look[1], B.look[1], f), lerp(A.look[2], B.look[2], f));
    if (!reduce) {
      const idle = Math.max(clamp(-p), clamp(p - 4.6) * 0.3);
      camera.position.x += Math.sin(t * 0.2) * 3 * idle;
      camera.position.y += Math.sin(t * 0.3) * 0.6 * idle;
    }
    camera.lookAt(look);
    const hud = story.update(p, t);
    if (countEl) countEl.textContent = String(hud.count);
    if (stateEl) stateEl.textContent = hud.state;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    mobile = w < 860;
    renderer.setSize(w, h, false);
    camera.aspect = (mobile ? w : w * 1.4) / h;
    camera.fov = mobile ? 50 : 35;
    if (mobile) camera.clearViewOffset(); else camera.setViewOffset(w * 1.4, h, 0, 0, w, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  if ((document as any).fonts && (document as any).fonts.ready) (document as any).fonts.ready.then(() => Object.values(stories).forEach((s: any) => s.reset()));
  setMode('student');
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', measure);
    window.removeEventListener('resize', resize);
    window.removeEventListener('themechange', readPalette);
    tabHandlers.forEach(({ b, h }) => b.removeEventListener('click', h));
    renderer.dispose();
  };
}
