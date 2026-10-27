// @ts-nocheck
/* Scroll-driven particle stage (ported from the approved WebLoop home demo).
   One persistent WebGL canvas morphs between shapes as each home section scrolls into view.
   Reads anchor elements by id (anchorHero, anchorCV, anchorLoop, anchorLogo). */
import * as THREE from 'three';

// the demo was tuned on three r128 (no colour management) — keep hex colours as authored
THREE.ColorManagement.enabled = false;

export function startParticleStage(): () => void {
  let raf = 0;
  if (!document.getElementById('particles')) return () => {};
  const canvas = document.getElementById('particles');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  const group = new THREE.Group(); scene.add(group);

  const N = innerWidth < 700 ? 4500 : 8000;
  const rnd = new Float32Array(N * 3).map(() => Math.random());
  const golden = Math.PI * (3 - Math.sqrt(5));

  // 1. sphere: the community
  const SPH = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i, R = 3 * (0.96 + rnd[i * 3] * 0.08);
    SPH[i * 3] = Math.cos(th) * r * R; SPH[i * 3 + 1] = y * R; SPH[i * 3 + 2] = Math.sin(th) * r * R;
  }
  // 3. CV card: your verified profile
  const CARD = new Float32Array(N * 3);
  (function () {
    const W = 4.6, H = 6, pts = [], add = (x, y) => pts.push([x, y]);
    const line = (x1, y1, x2, y2, n) => { for (let q = 0; q < n; q++) { const t = q / (n - 1); add(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); } };
    const circle = (cx, cy, r, n) => { for (let q = 0; q < n; q++) { const a = q / n * Math.PI * 2; add(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
    const star = (cx, cy, r, n) => { const v = []; for (let q = 0; q < 10; q++) { const a = Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? r * 0.45 : r; v.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } for (let q = 0; q < 10; q++) line(...v[q], ...v[(q + 1) % 10], n); };
    const hw = W / 2, hh = H / 2, cr = 0.35;
    line(-hw + cr, hh, hw - cr, hh, 120); line(-hw + cr, -hh, hw - cr, -hh, 120); line(-hw, hh - cr, -hw, -hh + cr, 150); line(hw, hh - cr, hw, -hh + cr, 150);
    [[hw - cr, hh - cr, 0], [-hw + cr, hh - cr, 1], [-hw + cr, -hh + cr, 2], [hw - cr, -hh + cr, 3]].forEach(([cx, cy, q]) => { for (let z = 0; z <= 12; z++) { const a = (q + z / 12) * Math.PI / 2; add(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr); } });
    circle(-1.3, 1.9, 0.62, 140); circle(-1.3, 2.02, 0.22, 50);
    line(-0.45, 2.15, 1.7, 2.15, 90); line(-0.45, 1.7, 1.0, 1.7, 60);
    for (let row = 0; row < 3; row++) { const y = 0.6 - row * 1.15; line(-1.9, y, 0.9, y, 100); line(-1.9, y - 0.38, 0.2, y - 0.38, 70); circle(1.65, y - 0.18, 0.3, 60); line(1.5, y - 0.2, 1.62, y - 0.33, 8); line(1.62, y - 0.33, 1.84, y - 0.02, 12); }
    for (let q = 0; q < 5; q++) star(-1.6 + q * 0.62, -2.55, 0.24, 14);
    const M = pts.length;
    for (let i = 0; i < N; i++) { const p = pts[i % M], sp = i < M ? 0.015 : 0.06; CARD[i * 3] = p[0] + (rnd[i * 3] - 0.5) * sp * 2; CARD[i * 3 + 1] = p[1] + (rnd[i * 3 + 1] - 0.5) * sp * 2; CARD[i * 3 + 2] = (rnd[i * 3 + 2] - 0.5) * 0.12; }
  })();
  // 2. the loop and 4. the infinity (both flow)
  const LR = 3.3, Lr = 0.5;
  function torusAt(i, t, out) {
    const u = rnd[i * 3] * 6.283 + (reduce ? 0 : t * 0.25 * (0.6 + rnd[i * 3 + 2] * 0.4)), v = rnd[i * 3 + 1] * 6.283 + (reduce ? 0 : t * 0.3), rr = Lr * (0.4 + rnd[i * 3 + 2] * 0.6);
    out[0] = (LR + rr * Math.cos(v)) * Math.cos(u); out[1] = (LR + rr * Math.cos(v)) * Math.sin(u); out[2] = rr * Math.sin(v);
  }
  function infAt(i, t, out) {
    const a = 3.6, sp = rnd[i * 3] * 6.283 + (reduce ? 0 : t * 0.35), d = 1 + Math.sin(sp) ** 2, v = rnd[i * 3 + 1] * 6.283, rr = 0.32 * (0.3 + rnd[i * 3 + 2] * 0.7);
    out[0] = a * Math.cos(sp) / d + Math.cos(v) * rr * 0.6; out[1] = a * Math.sin(sp) * Math.cos(sp) / d + Math.sin(v) * rr; out[2] = Math.cos(v) * rr;
  }
  // ---------- Hero: the headline acted out (Build → Find your team → Prove your skills) ----------
  const CYCLE = 12;
  const SCAT = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const r = 3.4 + rnd[i * 3] * 2.2, a = rnd[i * 3 + 1] * 6.283, b = Math.acos(2 * rnd[i * 3 + 2] - 1); SCAT[i * 3] = r * Math.sin(b) * Math.cos(a); SCAT[i * 3 + 1] = r * Math.cos(b) * 0.75; SCAT[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) * 0.6; }
  const TEAMS = [[0.55, 0.62, 0.56], [-0.2, 0.35, 0.92], [0.85, -0.2, 0.49], [0.15, -0.6, 0.79], [-0.75, -0.25, 0.61], [0.6, 0.1, -0.79], [-0.5, 0.75, -0.43]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
  const CAP = Math.cos(0.32);
  const teamOf = new Int8Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const x = SPH[i * 3] / 3, y = SPH[i * 3 + 1] / 3, z = SPH[i * 3 + 2] / 3;
    TEAMS.forEach((c, k) => { if (x * c[0] + y * c[1] + z * c[2] > CAP) teamOf[i] = k; });
  }
  const ph = { build: 1, team: 0, prove: 0, out: 0, idx: 0, pt: 0 };
  function updatePhase(t) {
    if (reduce) { Object.assign(ph, { build: 1, team: 1, prove: 1, out: 0, idx: 2, pt: 11 }); return; }
    const pt = t % CYCLE; ph.pt = pt;
    ph.build = pt < 0.2 ? 0 : clamp((pt - 0.2) / 2.6);
    ph.team = ease(clamp((pt - 4) / 1.2)) * (1 - ease(clamp((pt - 11) / 0.5)));
    ph.prove = ease(clamp((pt - 8) / 0.8)) * (1 - ease(clamp((pt - 11) / 0.5)));
    ph.out = ease(clamp((pt - 11.3) / 0.7));
    ph.idx = pt < 4 ? 0 : pt < 8 ? 1 : 2;
  }
  function heroAt(i, t, o) {
    const q = i * 3;
    let x = SPH[q], y = SPH[q + 1], z = SPH[q + 2];
    const tm = teamOf[i];
    if (tm >= 0 && ph.team > 0) {             // team members pull together into a tight group
      const c = TEAMS[tm], l = 1.08;
      const cx = c[0] * 3 * l, cy = c[1] * 3 * l, cz = c[2] * 3 * l, k = ph.team * 0.62;
      x += (cx - x) * k; y += (cy - y) * k; z += (cz - z) * k;
      const pulse = 1 + ph.prove * 0.06 * Math.sin(t * 4 + tm);
      x *= pulse; y *= pulse; z *= pulse;
    }
    const kb = clamp(ph.build * 1.3 - rnd[q + 1] * 0.3), e = ease(kb);   // build: fly in from scattered
    const ko = ph.out;                                                     // end of cycle: drift apart again
    const sx = SCAT[q], sy = SCAT[q + 1], sz = SCAT[q + 2];
    o[0] = lerp(sx, x, e) * (1 - ko) + sx * ko; o[1] = lerp(sy, y, e) * (1 - ko) + sy * ko; o[2] = lerp(sz, z, e) * (1 - ko) + sz * ko;
  }

  const SHAPES = [
    heroAt,
    (i, t, o) => { o[0] = CARD[i * 3]; o[1] = CARD[i * 3 + 1]; o[2] = CARD[i * 3 + 2]; },
    torusAt,
    infAt,
  ];

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const vs = 'attribute vec3 color; varying vec3 vC; uniform float uSize; uniform float uPix; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize * uPix / -mv.z; gl_Position = projectionMatrix * mv; }';
  const fs = 'varying vec3 vC; uniform float uOpacity; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC, a * a * uOpacity); }';
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: vs, fragmentShader: fs, uniforms: { uSize: { value: 26 }, uPix: { value: renderer.getPixelRatio() }, uOpacity: { value: 0.85 } } });
  group.add(new THREE.Points(geo, mat));
  const beadPos = new Float32Array(9), beadCol = new Float32Array(9);
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute('position', new THREE.BufferAttribute(beadPos, 3));
  bgeo.setAttribute('color', new THREE.BufferAttribute(beadCol, 3));
  const bmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: vs, fragmentShader: fs, uniforms: { uSize: { value: 260 }, uPix: { value: renderer.getPixelRatio() }, uOpacity: { value: 0 } } });
  group.add(new THREE.Points(bgeo, bmat));

  // lines that connect each team
  const LINK_PER = 5, linkPos = new Float32Array(TEAMS.length * LINK_PER * 2 * 2 * 3);
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const lmat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, color: 0x0e7490 });
  group.add(new THREE.LineSegments(lgeo, lmat));
  const nodeOffsets = TEAMS.map((c) => {
    const up = Math.abs(c[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = [c[1] * up[2] - c[2] * up[1], c[2] * up[0] - c[0] * up[2], c[0] * up[1] - c[1] * up[0]], ul = Math.hypot(...u); u.forEach((_, k) => (u[k] /= ul));
    const w = [c[1] * u[2] - c[2] * u[1], c[2] * u[0] - c[0] * u[2], c[0] * u[1] - c[1] * u[0]];
    return Array.from({ length: LINK_PER }, (_, k) => { const a = k / LINK_PER * 6.283 + 0.4; return [Math.cos(a), Math.sin(a), u, w]; });
  });
  const chips = TEAMS.map(() => { const d = document.createElement('span'); d.className = 'vchip'; d.textContent = '✓ Team verified'; document.getElementById('vchips').appendChild(d); return d; });
  const baseCol = new Float32Array(N * 3), proveCol = new THREE.Color(), teamCol = new THREE.Color();
  const steps = Array.from(document.querySelectorAll('.hstep'));
  const phrases = Array.from(document.querySelectorAll('.ph')), h1 = document.querySelector('h1');
  const PHASE_CAP = ['Build: everyone starts on their own and comes together', 'Find your team: students group up around a project', 'Prove your skills: every team’s work gets verified'];

  let light = true;
  function applyTheme() {
    light = document.documentElement.classList.contains('light');
    const a = new THREE.Color(light ? '#0E7490' : '#00827C'), b = new THREE.Color(light ? '#06B6D4' : '#CBFFFC'), v = new THREE.Color(light ? '#7C3AED' : '#FAD1FF'), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const k = (SPH[i * 3 + 1] / 3 + 1) / 2;
      if (!light && rnd[i * 3 + 2] < 0.05) c.set('#FFFFFF'); else if (k < 0.5) c.copy(a).lerp(b, k * 2); else c.copy(b).lerp(v, (k - 0.5) * 2);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    baseCol.set(col);
    teamCol.set(light ? '#7C3AED' : '#F0ABFC'); proveCol.set(light ? '#059669' : '#6EE7B7');
    lmat.color.set(light ? '#0E7490' : '#CBFFFC');
    geo.attributes.color.needsUpdate = true;
    [v, b, a].forEach((cc, q) => { beadCol[q * 3] = cc.r; beadCol[q * 3 + 1] = cc.g; beadCol[q * 3 + 2] = cc.b; });
    bgeo.attributes.color.needsUpdate = true;
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    bmat.blending = mat.blending;
    mat.needsUpdate = true; bmat.needsUpdate = true;
    mat.uniforms.uSize.value = light ? 30 : 26;
  }
  window.addEventListener('themechange', applyTheme);
  applyTheme();

  // stages follow your sections: hero → why webloop → the loop → finale
  const STAGES = [
    { el: document.getElementById('heroSec'), anchor: ['anchorHero', 'anchorHeroMobile'], size: 6.2, tilt: -0.08, cap: '' },
    { el: document.getElementById('anchorCV'), anchor: ['anchorCV'], size: 6.6, tilt: 0, cap: '' },
    { el: document.getElementById('anchorLoop'), anchor: ['anchorLoop'], size: 8.2, tilt: 0.5, cap: '' },
    { el: document.getElementById('anchorLogo'), anchor: ['anchorLogo'], inf: true, tilt: 0, cap: '' },
  ];
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;
  let A = 0, B = 0, f = 0, fsm = 0, fraw = 0, lastA = 0, mobile = false, visH = 8.28, visW = 15;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onPointerMove);

  function measure() {
    const vh = innerHeight, y = scrollY;
    const centers = STAGES.map((st) => { const r = st.el.getBoundingClientRect(); return r.top + y + r.height / 2 - vh / 2; });
    centers[0] = 0;
    let i = 0;
    while (i < centers.length - 1 && y >= centers[i + 1]) i++;
    if (i >= centers.length - 1) { A = B = centers.length - 1; f = 0; return; }
    const raw = (y - centers[i]) / (centers[i + 1] - centers[i]);
    A = i; B = i + 1; f = ease(clamp((raw - 0.2) / 0.6));
  }
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', measure);

  const ov = { core: document.getElementById('core'), who: document.getElementById('coreWho'), verb: document.getElementById('coreVerb'), tag: document.getElementById('coreTag'), beads: Array.from(document.querySelectorAll('.bead')), fw: document.getElementById('fw'), L: document.getElementById('fwL'), R: document.getElementById('fwR'), cap: document.getElementById('caption') };
  const WORDS = [['Students', 'build', 'real projects'], ['Companies', 'hire', 'proven talent'], ['Universities', 'teach', 'with real evidence']];
  let coreIdx = -1, lastCap = -1;
  const ta = [0, 0, 0], tb = [0, 0, 0], v3 = new THREE.Vector3();
  const toScreen = (x, y, z) => { v3.set(x, y, z); group.localToWorld(v3); v3.project(camera); return [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight]; };

  function frame(ms) {
    raf = requestAnimationFrame(frame);
    const t = ms / 1000;
    // when the page passes a stage, carry the progress over instead of jumping (fixes the flash between shapes)
    if (A !== lastA) { if (A === lastA + 1) fraw -= 1; else if (A === lastA - 1) fraw += 1; else fraw = f; lastA = A; }
    fraw += (f - fraw) * (reduce ? 1 : 0.08);
    fsm = clamp(fraw);
    pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
    updatePhase(t);
    const heroW = A === 0 ? 1 - fsm : 0;   // how much the hero story is on screen
    // colours: teams turn violet, then green when verified
    const ct = ph.team * heroW, cp = ph.prove * heroW;
    col.set(baseCol);
    for (let i = 0; i < N; i++) {
      if (teamOf[i] < 0) continue;
      const q = i * 3;
      col[q] = baseCol[q] + (teamCol.r - baseCol[q]) * ct; col[q + 1] = baseCol[q + 1] + (teamCol.g - baseCol[q + 1]) * ct; col[q + 2] = baseCol[q + 2] + (teamCol.b - baseCol[q + 2]) * ct;
      col[q] += (proveCol.r - col[q]) * cp; col[q + 1] += (proveCol.g - col[q + 1]) * cp; col[q + 2] += (proveCol.b - col[q + 2]) * cp;
    }
    geo.attributes.color.needsUpdate = true;
    // team lines + badges
    let li = 0;
    TEAMS.forEach((c, k) => {
      const C = [c[0] * 3.25, c[1] * 3.25, c[2] * 3.25];
      const nodes = nodeOffsets[k].map(([ca, sa, u, w]) => { const r = 0.55; return [C[0] + (u[0] * ca + w[0] * sa) * r, C[1] + (u[1] * ca + w[1] * sa) * r, C[2] + (u[2] * ca + w[2] * sa) * r]; });
      nodes.forEach((n, j) => { const m = nodes[(j + 1) % nodes.length]; [C, n, n, m].forEach((p) => { linkPos[li++] = p[0]; linkPos[li++] = p[1]; linkPos[li++] = p[2]; }); });
      v3.set(C[0] * 1.12, C[1] * 1.12, C[2] * 1.12); group.localToWorld(v3);
      const facing = v3.z > group.position.z + 0.8;
      v3.project(camera);
      chips[k].style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; chips[k].style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
      chips[k].style.opacity = facing && !mobile ? cp : 0;
    });
    lgeo.attributes.position.needsUpdate = true;
    lmat.opacity = ct * (light ? 0.55 : 0.45);
    // headline follows the story
    h1.classList.toggle('playing', heroW > 0.5 && !reduce);
    phrases.forEach((el, k) => el.classList.toggle('on', k === ph.idx));
    const prog = [clamp(ph.pt / 4), clamp((ph.pt - 4) / 4), clamp((ph.pt - 8) / 4)];
    steps.forEach((el, k) => { el.classList.toggle('on', k === ph.idx); el.querySelector('.hbar').style.width = (ph.out > 0 ? (1 - ph.out) * 100 : prog[k] * 100) + '%'; });

    const shA = SHAPES[A], shB = SHAPES[B], breathe = reduce ? 1 : 1 + Math.sin(t * 1.2) * 0.012;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      shA(i, t, ta); shB(i, t, tb);
      const k = clamp(fsm * 1.25 - rnd[o + 1] * 0.25);
      pos[o] = lerp(ta[0], tb[0], k) * breathe; pos[o + 1] = lerp(ta[1], tb[1], k) * breathe; pos[o + 2] = lerp(ta[2], tb[2], k) * breathe;
    }
    geo.attributes.position.needsUpdate = true;

    const sA = STAGES[A], sB = STAGES[B];
    // each shape sits inside its own section and scrolls with it
    const place2 = (st) => {
      const el = st.anchor.map((id) => document.getElementById(id)).find((e) => e && e.offsetParent !== null) || st.el;
      const r = el.getBoundingClientRect(), k = visH / innerHeight;
      const x = ((r.left + r.width / 2) / innerWidth - 0.5) * visH * camera.aspect, y = -((r.top + r.height / 2) / innerHeight - 0.5) * visH;
      let sc;
      if (st.inf) { const em = Math.min(r.width * 0.5 / 4.3, r.height * 0.8, 120); sc = (em * 1.15 / 2 * k) / 3.6; }
      else sc = Math.min(r.width * k / st.size, r.height * k / st.size, 1.15);
      return [x, y, sc];
    };
    const pa = place2(sA), pb = sB === sA ? pa : place2(sB);
    group.position.set(lerp(pa[0], pb[0], fsm), lerp(pa[1], pb[1], fsm), 0);
    group.scale.setScalar(lerp(pa[2], pb[2], fsm));
    const tilt = lerp(sA.tilt, sB.tilt, fsm);
    const spin = (reduce ? 0 : t * 0.07) * (A === 0 ? 1 - fsm : 0);
    const cardTurn = (A === 1 ? 1 - fsm : B === 1 ? fsm : 0) * (reduce ? 0 : Math.sin(t * 0.5) * 0.2);
    group.rotation.set(tilt + pointer.y * 0.12, spin + pointer.x * 0.2 + cardTurn, 0);
    const showing = fsm > 0.5 ? B : A;
    const dim = (A !== B ? 1 - 0.65 * Math.sin(Math.PI * fsm) : 1);   // particles fade while travelling between sections
    mat.uniforms.uOpacity.value = (light ? 0.9 : 0.85) * dim;

    // the loop: beads + centre text
    const beadOn = clamp((A === 2 ? 1 - fsm : B === 2 ? fsm : 0) * 5 - 4);   // only once the ring has fully formed
    bmat.uniforms.uOpacity.value = beadOn * dim;
    let best = 0, bestD = 9;
    for (let q = 0; q < 3; q++) {
      const u = (reduce ? 0 : t * 0.35) + q * (Math.PI * 2 / 3);
      beadPos[q * 3] = LR * Math.cos(u); beadPos[q * 3 + 1] = LR * Math.sin(u); beadPos[q * 3 + 2] = 0;
      const d = Math.abs(Math.atan2(Math.sin(u - Math.PI / 2), Math.cos(u - Math.PI / 2))); if (d < bestD) { bestD = d; best = q; }
      const [bx, by] = toScreen(beadPos[q * 3], beadPos[q * 3 + 1], 0);
      ov.beads[q].style.left = bx + 'px'; ov.beads[q].style.top = by + 'px'; ov.beads[q].style.opacity = mobile ? 0 : beadOn;
    }
    bgeo.attributes.position.needsUpdate = true;
    if (best !== coreIdx) {
      coreIdx = best; [ov.who.textContent, ov.verb.textContent, ov.tag.textContent] = WORDS[best];
      ov.verb.style.animation = 'none'; void ov.verb.offsetWidth; ov.verb.style.animation = '';
      ov.beads.forEach((L, q) => { L.style.color = q === best ? 'rgb(var(--signal-violet))' : ''; });
    }
    const [cx, cy] = toScreen(0, 0, 0);
    ov.core.style.left = cx + 'px'; ov.core.style.top = cy + 'px'; ov.core.style.opacity = mobile ? 0 : beadOn;

    // WebL ∞ p
    const wOn = A === 3 ? 1 : B === 3 ? clamp(fsm * 5 - 4) : 0;
    ov.fw.style.opacity = wOn;
    if (wOn > 0) {
      const [xl] = toScreen(-3.6, 0, 0), [xr, yc] = toScreen(3.6, 0, 0);
      const size = (xr - xl) / 1.15, top = yc - size * 0.6;
      ov.L.style.fontSize = ov.R.style.fontSize = size + 'px';
      ov.L.style.transform = `translate(${xl - size * 0.05}px, ${top}px) translateX(-100%)`;
      ov.R.style.transform = `translate(${xr + size * 0.03}px, ${top}px)`;
    }

    const capKey = showing === 0 ? 'h' + ph.idx : showing;
    if (capKey !== lastCap) { lastCap = capKey; ov.cap.textContent = showing === 0 ? PHASE_CAP[ph.idx] : STAGES[showing].cap; }
    ov.cap.style.opacity = Math.abs(fsm - 0.5) > 0.3 || A === B ? 1 : 0;
    renderer.render(scene, camera);
  }
  function resize() {
    const w = innerWidth, h = innerHeight;
    mobile = w < 1024;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.position.z = 10; camera.updateProjectionMatrix();
    const depth = camera.position.z + (mobile ? 3 : 0);
    visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    visW = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    STAGES[3].fit = (mobile ? 0.21 : 0.2) * visW / 7.2;
  }
  addEventListener('resize', resize);
  resize(); measure();
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', measure); removeEventListener('resize', measure); removeEventListener('resize', resize);
    removeEventListener('pointermove', onPointerMove); window.removeEventListener('themechange', applyTheme);
    chips.forEach((c) => c.remove()); geo.dispose(); bgeo.dispose(); lgeo.dispose(); mat.dispose(); bmat.dispose(); lmat.dispose(); renderer.dispose();
  };
}
