// @ts-nocheck
/* Scroll-driven particle stage — faithful port of the approved WebLoop home
   demo (webloop-home-demo.html) onto a persistent three.js canvas.
   Shapes per section: hero -> rotating loop (3 role labels ride it),
   build -> sphere, verify -> a 4x4 grid of particle blocks whose heights
   keep rising and falling (solid translucent faces fade in once the
   particles have converged, then dissolve back when scrolling on),
   found -> the dense ring with 3 orbiting beads + centre text, finale ->
   particles gather into the WebL[loop]p wordmark; the W/e/b/L/p letters
   (sampled from Geist Bold on an offscreen canvas, same as the demo's
   buildWordmark) then turn solid on the SAME canvas — there is only ever
   one wordmark, never a second DOM copy.
   Reads anchor elements by id (anchorHero, anchorBuild, anchorVerify,
   anchorFound, anchorLogo) that the home page provides. */
import * as THREE from 'three';

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

  // fewer particles on mobile — matches the demo's own budget
  const N = innerWidth < 700 ? 4600 : 7600;

  function mulberry(a: number) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rng = mulberry(20261028);
  const g = () => (rng() + rng() + rng() - 1.5) * 0.8;
  const loopPt = (t: number) => { const d = 1 + Math.sin(t) ** 2; return [Math.cos(t) / d, (Math.sin(t) * Math.cos(t)) / d, Math.sin(t) * 0.22]; };

  // 0: loop (hero)
  const LOOP = new Float32Array(N * 3);
  // 1: sphere (build) — the community — demo's exact radius, not an inflated "world scale"
  const SPH = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = rng(), v = rng(), w = rng();
    const tp = u * Math.PI * 2, p = loopPt(tp);
    LOOP[i * 3] = p[0] + g() * 0.04; LOOP[i * 3 + 1] = p[1] + g() * 0.04; LOOP[i * 3 + 2] = p[2] + g() * 0.04;
    const zz = 2 * v - 1, ph = w * Math.PI * 2, r = Math.sqrt(1 - zz * zz), R = 0.85 * (0.96 + 0.08 * rng());
    SPH[i * 3] = r * Math.cos(ph) * R; SPH[i * 3 + 1] = zz * R; SPH[i * 3 + 2] = r * Math.sin(ph) * R;
  }

  // 2: cubes (verify) — a 4x4 grid of particle blocks, heights fluctuate per cell — demo's exact dimensions
  const CELLS = 4, PITCH = 0.44, CS = 0.165, CBASE = -0.42;
  const NC = CELLS * CELLS;
  const cph1 = new Float32Array(NC), cph2 = new Float32Array(NC);
  for (let c = 0; c < NC; c++) { cph1[c] = rng(); cph2[c] = rng() * 6.28; }
  const cXZ = Array.from({ length: NC }, (_, c) => [((c % CELLS) - (CELLS - 1) / 2) * PITCH, (Math.floor(c / CELLS) - (CELLS - 1) / 2) * PITCH]);
  const accentCells = new Set<number>(); while (accentCells.size < 4) accentCells.add(Math.floor(rng() * NC));
  const cCell = new Uint8Array(N), cSide = new Uint8Array(N), cA = new Float32Array(N), cB = new Float32Array(N);
  for (let i = 0; i < N; i++) { cCell[i] = Math.floor(rng() * NC); cSide[i] = rng() < 0.42 ? 0 : 1 + Math.floor(rng() * 4); cA[i] = rng() * 2 - 1; cB[i] = rng(); }
  const hts = new Float32Array(NC);
  function updateCubeHeights(t: number) { for (let c = 0; c < NC; c++) hts[c] = 0.16 + 0.66 * (0.5 + 0.5 * Math.sin(t * (0.6 + cph1[c] * 0.7) + cph2[c])); }
  function cubesAt(i: number, _t: number, o: number[]) {
    const c = cCell[i], X = cXZ[c][0], Z = cXZ[c][1], side = cSide[i], h = hts[c];
    let x: number, y: number, z: number;
    if (side === 0) { x = X + cA[i] * CS; z = Z + (cB[i] * 2 - 1) * CS; y = CBASE + h; }
    else { y = CBASE + cB[i] * h;
      if (side === 1) { x = X - CS; z = Z + cA[i] * CS; } else if (side === 2) { x = X + CS; z = Z + cA[i] * CS; }
      else if (side === 3) { z = Z - CS; x = X + cA[i] * CS; } else { z = Z + CS; x = X + cA[i] * CS; } }
    o[0] = x; o[1] = y; o[2] = z;
  }

  // 3: ring (found) — demo's exact RING_R; tube radius Lr = RING_R*(.5/3.3)
  const RING_R = 0.92, LR = RING_R, Lr = RING_R * (0.5 / 3.3);
  const rPh = new Float32Array(N), rPs = new Float32Array(N), rRr = new Float32Array(N);
  for (let i = 0; i < N; i++) { rPh[i] = rng() * 6.283; rPs[i] = rng() * 6.283; rRr[i] = rng(); }
  function torusAt(i: number, t: number, o: number[]) {
    const w = rRr[i];
    const u = rPh[i] + (reduce ? 0 : t * 0.25 * (0.6 + w * 0.4)), v = rPs[i] + (reduce ? 0 : t * 0.3);
    const rr = Lr * (0.4 + w * 0.6), q = LR + rr * Math.cos(v);
    o[0] = q * Math.cos(u); o[1] = q * Math.sin(u); o[2] = rr * Math.sin(v);
  }

  // 4: WebL[loop]p wordmark — sampled from Geist Bold text on an offscreen canvas
  // (same source metrics drive both the particle cloud AND the solid canvas-texture
  // reveal below, so there is exactly one wordmark, never two).
  let WORD: Float32Array | null = null;
  let WM: { w: number; h: number } | null = null;
  const FAM = 'Inter,"Helvetica Neue",Arial,sans-serif';
  const TC_W = 1600, TC_H = 480;
  const wordTexCanvas = document.createElement('canvas');
  wordTexCanvas.width = TC_W; wordTexCanvas.height = TC_H;
  const wordTex = new THREE.CanvasTexture(wordTexCanvas);
  function buildWordmark(targetWidth = 2.0) {
    const oc = document.createElement('canvas'); oc.width = 1500; oc.height = 420;
    const o = oc.getContext('2d', { willReadFrequently: true })!;
    o.font = `700 200px ${FAM}`; o.textBaseline = 'alphabetic';
    const wWebL = o.measureText('WebL').width, wOO = o.measureText('oo').width, wP = o.measureText('p').width;
    const x0 = 100, base = 300, mm = o.measureText('WebLp');
    const xh = o.measureText('o').actualBoundingBoxAscent;
    o.fillStyle = '#000'; o.fillText('WebL', x0, base); o.fillText('p', x0 + wWebL + wOO, base);
    const id = o.getImageData(0, 0, 1500, 420).data, cand: number[] = [];
    for (let y = 0; y < 420; y += 2) for (let x = 0; x < 1500; x += 2) if (id[(y * 1500 + x) * 4 + 3] > 128) cand.push(x, y);
    const total = wWebL + wOO + wP, xc = x0 + total / 2, yc = base - (mm.actualBoundingBoxAscent - mm.actualBoundingBoxDescent) / 2, k = targetWidth / total;
    const lcx = (x0 + wWebL + wOO / 2 - xc) * k, lcy = -(base - xh / 2 - yc) * k, lhw = wOO * 0.5 * k * 0.98;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      let x: number, y: number, z: number;
      if (rng() < 0.74 && cand.length) { const j = Math.floor((rng() * cand.length) / 2) * 2;
        x = (cand[j] - xc + (rng() - 0.5) * 2) * k; y = -(cand[j + 1] - yc + (rng() - 0.5) * 2) * k; z = g() * 0.03; }
      else { const p = loopPt(rng() * Math.PI * 2); x = lcx + p[0] * lhw + g() * 0.03; y = lcy + p[1] * lhw + g() * 0.03; z = p[2] * lhw * 0.3 + g() * 0.02; }
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
    }
    WORD = arr;

    // draw the SAME "WebL" + "p" glyphs (leaving the loop's gap empty) onto a canvas
    // where the text sits dead-centre, so the texture plane needs no offset to line
    // up with the particle cloud above — ink colour is applied via material tint.
    const tc = wordTexCanvas.getContext('2d')!;
    tc.clearRect(0, 0, TC_W, TC_H);
    tc.font = `700 200px ${FAM}`; tc.textBaseline = 'alphabetic';
    const tx0 = (TC_W - total) / 2, tbase = TC_H / 2 + (mm.actualBoundingBoxAscent - mm.actualBoundingBoxDescent) / 2;
    tc.fillStyle = '#fff';
    tc.fillText('WebL', tx0, tbase); tc.fillText('p', tx0 + wWebL + wOO, tbase);
    wordTex.needsUpdate = true;
    WM = { w: TC_W * k, h: TC_H * k };
  }
  buildWordmark();
  if (document.fonts && document.fonts.load) document.fonts.load('700 200px Inter').then(() => document.fonts.ready).then(() => buildWordmark()).catch(() => {});

  const SHAPES = [
    (i: number, _t: number, o: number[]) => { o[0] = LOOP[i * 3]; o[1] = LOOP[i * 3 + 1]; o[2] = LOOP[i * 3 + 2]; },
    (i: number, _t: number, o: number[]) => { o[0] = SPH[i * 3]; o[1] = SPH[i * 3 + 1]; o[2] = SPH[i * 3 + 2]; },
    cubesAt,
    torusAt,
    (i: number, _t: number, o: number[]) => { const w = WORD; if (!w) { o[0] = 0; o[1] = 0; o[2] = 0; return; } o[0] = w[i * 3]; o[1] = w[i * 3 + 1]; o[2] = w[i * 3 + 2]; },
  ];

  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const vs = 'attribute vec3 color; varying vec3 vC; uniform float uSize; uniform float uPix; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = uSize * uPix / -mv.z; gl_Position = projectionMatrix * mv; }';
  const fs = 'varying vec3 vC; uniform float uOpacity; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.52, 0.04, d); vec3 col = vC + vec3(a) * 0.18; gl_FragColor = vec4(col, a * a * uOpacity); }';
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: vs, fragmentShader: fs, uniforms: { uSize: { value: 26 }, uPix: { value: renderer.getPixelRatio() }, uOpacity: { value: 0.85 } } });
  const points = new THREE.Points(geo, mat); points.renderOrder = 2; group.add(points);

  const beadPos = new Float32Array(9), beadCol = new Float32Array(9);
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute('position', new THREE.BufferAttribute(beadPos, 3));
  bgeo.setAttribute('color', new THREE.BufferAttribute(beadCol, 3));
  const bmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: vs, fragmentShader: fs, uniforms: { uSize: { value: 260 }, uPix: { value: renderer.getPixelRatio() }, uOpacity: { value: 0 } } });
  const beadPoints = new THREE.Points(bgeo, bmat); beadPoints.renderOrder = 3; group.add(beadPoints);

  // solid translucent block faces — top cap vs. side walls get their own colour,
  // exactly like the demo's drawBlocks(): top/side/accent-top tones per theme.
  const sideGeo = new THREE.BoxGeometry(1, 1, 1);
  const sideMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const sideMesh = new THREE.InstancedMesh(sideGeo, sideMat, NC); sideMesh.renderOrder = 0; group.add(sideMesh);
  const topGeo = new THREE.PlaneGeometry(1, 1); topGeo.rotateX(-Math.PI / 2);
  const topMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const topMesh = new THREE.InstancedMesh(topGeo, topMat, NC); topMesh.renderOrder = 1;
  topMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NC * 3), 3);
  group.add(topMesh);
  const dummy = new THREE.Object3D();
  function layoutCubeMesh() {
    for (let c = 0; c < NC; c++) {
      const h = Math.max(hts[c], 0.02);
      dummy.position.set(cXZ[c][0], CBASE + h / 2, cXZ[c][1]);
      dummy.scale.set(CS * 1.85, h, CS * 1.85);
      dummy.updateMatrix();
      sideMesh.setMatrixAt(c, dummy.matrix);
      dummy.position.set(cXZ[c][0], CBASE + h, cXZ[c][1]);
      dummy.scale.set(CS * 1.85, 1, CS * 1.85);
      dummy.updateMatrix();
      topMesh.setMatrixAt(c, dummy.matrix);
    }
    sideMesh.instanceMatrix.needsUpdate = true;
    topMesh.instanceMatrix.needsUpdate = true;
  }

  // the wordmark's solid "WebL" + "p" reveal, drawn once from the same raster as the particles
  const wordPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const wordPlaneMat = new THREE.MeshBasicMaterial({ map: wordTex, transparent: true, opacity: 0, depthWrite: false });
  // drawn AFTER the points (renderOrder 3 > 2) so the solid ink letters fully cover the
  // teal letter-forming particles once they fade in — only the infinity gap stays see-through
  const wordPlane = new THREE.Mesh(wordPlaneGeo, wordPlaneMat); wordPlane.renderOrder = 4;
  group.add(wordPlane);

  const baseCol = new Float32Array(N * 3);
  let light = true;
  // exact demo tokens — particle gradient runs neutral -> accent; block faces per theme
  const THEMES = {
    light: { acc: [8, 145, 178], neu: [52, 68, 95], top: '#eef4f9', sA: '#cbd5e1', sB: '#dde6f0', accTop: '#0891b2', ink: '#0b1630' },
    dark: { acc: [34, 211, 238], neu: [180, 195, 216], top: '#15233a', sA: '#0c1a2e', sB: '#101e33', accTop: '#22d3ee', ink: '#eaf2fc' },
  };
  function applyTheme() {
    light = document.documentElement.classList.contains('light');
    const T = light ? THEMES.light : THEMES.dark;
    const acc = new THREE.Color(T.acc[0] / 255, T.acc[1] / 255, T.acc[2] / 255);
    const neu = new THREE.Color(T.neu[0] / 255, T.neu[1] / 255, T.neu[2] / 255);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const k = (SPH[i * 3 + 1] / 3 + 1) / 2;
      c.copy(neu).lerp(acc, k);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    baseCol.set(col);
    geo.attributes.color.needsUpdate = true;
    const mid = neu.clone().lerp(acc, 0.65);
    [mid, acc, neu].forEach((cc, q) => { beadCol[q * 3] = cc.r; beadCol[q * 3 + 1] = cc.g; beadCol[q * 3 + 2] = cc.b; });
    bgeo.attributes.color.needsUpdate = true;
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    bmat.blending = mat.blending;
    mat.needsUpdate = true; bmat.needsUpdate = true;
    mat.uniforms.uSize.value = light ? 34 : 30;

    sideMat.color.set(T.sA);
    const topNeutral = new THREE.Color(T.top), topAccent = new THREE.Color(T.accTop);
    for (let cI = 0; cI < NC; cI++) topMesh.setColorAt(cI, accentCells.has(cI) ? topAccent : topNeutral);
    if (topMesh.instanceColor) topMesh.instanceColor.needsUpdate = true;
    wordPlaneMat.color.set(T.ink);
  }
  window.addEventListener('themechange', applyTheme);
  applyTheme();

  // one anchor element per section, used only to find each section's scroll centre
  const STAGES = [
    document.getElementById('heroSec'),
    document.getElementById('anchorBuild'),
    document.getElementById('anchorVerify'),
    document.getElementById('anchorFound'),
    document.getElementById('anchorLogo'),
  ].filter(Boolean) as HTMLElement[];
  const lastIdx = STAGES.length - 1;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const ease = (x: number) => x * x * (3 - 2 * x);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let A = 0, B = 0, f = 0, mobile = false, visH = 8.28;
  const glow = document.getElementById('particleGlow');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e: PointerEvent) => { pointer.tx = e.clientX / W - 0.5; pointer.ty = e.clientY / H - 0.5; };
  addEventListener('pointermove', onPointerMove);
  let W = 0, H = 0;

  // [centerX, centerY, scale, tiltX, baseRotY, swayAmp, swaySpeed] — exact demo values
  const CFG_D = [[.73, .5, .88, .18, 0, .75, .35], [.7, .36, .62, .2, 0, .9, .2], [.73, .52, .7, .6, Math.PI / 4, .14, .3], [.73, .5, .84, 1.0, .2, .35, .25], [.5, .4, 1.1, 0, 0, 0, 0]];
  const CFG_M = [[.5, .3, .72, .18, 0, .75, .35], [.5, .26, .55, .2, 0, .9, .2], [.5, .3, .8, .6, Math.PI / 4, .14, .3], [.5, .28, .7, 1.0, .2, .35, .25], [.5, .34, .8, 0, 0, 0, 0]];

  // section holds; it only morphs between two adjacent centres (demo's exact window)
  function measure() {
    // demo's exact formula: section centres compared against scrollY + viewport-half (mid);
    // the shape holds at each section and only morphs between 30% and 80% of the way to the
    // next one. Each anchor's absolute page position comes from getBoundingClientRect() + scrollY
    // (not offsetTop — several of these anchors sit inside position:relative sections, which
    // would make offsetTop relative to that section instead of the page).
    const y = scrollY;
    const centers = STAGES.map((el) => { const r = el.getBoundingClientRect(); return r.top + y + r.height / 2; });
    const mid = y + innerHeight * 0.5;
    let i = 0; for (let k = 0; k <= centers.length - 1; k++) if (mid >= centers[k]) i = k;
    if (i >= centers.length - 1) { A = B = centers.length - 1; f = 0; return; }
    const frac = (mid - centers[i]) / (centers[i + 1] - centers[i] || 1);
    A = i; B = i + 1; f = ease(clamp((frac - 0.3) / 0.5, 0, 1));
  }
  addEventListener('scroll', measure, { passive: true });
  addEventListener('resize', measure);

  const $ = (id: string) => document.getElementById(id);
  const loopChips = [{ el: $('chipP'), t: 0.95 }, { el: $('chipC'), t: Math.PI + 0.75 }, { el: $('chipU'), t: -0.5 }].filter((c) => c.el) as any[];
  const beadEls = Array.from(document.querySelectorAll('.bead'));
  let last = 0, solidS = 0;

  // per-particle easing state: rate in [0.035, 0.095], frame-rate independent chase
  const seedRng = mulberry(77331);
  const seed = new Float32Array(N), rate = new Float32Array(N), cur = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seed[i] = seedRng(); rate[i] = reduce ? 1 : 0.035 + seedRng() * 0.06; cur[i * 3] = (seedRng() - 0.5) * 2; cur[i * 3 + 1] = (seedRng() - 0.5) * 2; cur[i * 3 + 2] = (seedRng() - 0.5) * 2; }

  const ov = { who: $('coreWho'), verb: $('coreVerb'), tag: $('coreTag'), core: $('core') };
  const WORDS = [['People', 'build', 'real projects'], ['Companies', 'hire', 'proven talent'], ['Universities', 'teach', 'with real evidence']];
  let coreIdx = -1, pinnedIdx: number | null = null;
  const ta: number[] = [0, 0, 0], tb: number[] = [0, 0, 0], v3 = new THREE.Vector3();
  const toScreen = (x: number, y: number, z: number) => { v3.set(x, y, z); group.localToWorld(v3); v3.project(camera); return [((v3.x + 1) / 2) * innerWidth, ((1 - v3.y) / 2) * innerHeight]; };

  beadEls.forEach((el, idx) => {
    el.addEventListener('click', () => { pinnedIdx = idx; coreIdx = -1; });
  });
  // clicking a hero loop label pins that role too, then scrolls down to the ring where the centre text lives
  loopChips.forEach((c, idx) => {
    c.el.addEventListener('click', () => {
      pinnedIdx = idx; coreIdx = -1;
      const foundEl = document.getElementById('anchorFound');
      foundEl?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
  });

  // overlap of the scroll position with a given stage index (demo's ov(k) helper) — drives
  // the hero loop labels and the dark-theme halo, which only shows behind found + finale
  const ovAt = (k: number) => Math.max(0, 1 - Math.abs(A + f - k) * 2.2);

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const t = reduce ? 1.2 : now / 1000;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;

    const fsm = f; // the shape holds at each section, morphing only in the demo's scroll window
    const ov0 = ovAt(0), ov3 = ovAt(3), ov4 = ovAt(lastIdx);

    if (A === 2 || B === 2) updateCubeHeights(t);

    const PA = SHAPES[A], PB = SHAPES[B];
    for (let i = 0; i < N; i++) {
      const fi = ease(clamp((fsm - seed[i] * 0.35) / 0.65, 0, 1));
      const k = 1 - Math.pow(1 - rate[i], dt * 60), j = i * 3;
      PA(i, t, ta); PB(i, t, tb);
      cur[j] += (lerp(ta[0], tb[0], fi) - cur[j]) * k;
      cur[j + 1] += (lerp(ta[1], tb[1], fi) - cur[j + 1]) * k;
      cur[j + 2] += (lerp(ta[2], tb[2], fi) - cur[j + 2]) * k;
      let x = cur[j], y = cur[j + 1], z = cur[j + 2];
      if (!reduce) { const s = seed[i] * 6.28; x += Math.sin(t * 0.8 + s) * 0.006; y += Math.cos(t * 0.7 + s) * 0.006; }
      pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;

    const C = mobile ? CFG_M : CFG_D, CA = C[A], CB = C[B];
    const tilt = lerp(CA[3], CB[3], fsm) + pointer.y * 0.1;
    // a continuous slow spin only belongs to the hero loop — every other stage (and the
    // settled finale) must hold still and readable, so this never applies past stage 0
    const heroSpin = (reduce ? 0 : t * 0.05) * Math.max(0, 1 - (A + fsm));
    const ry = lerp(CA[4] + Math.sin(t * CA[6]) * CA[5] * (reduce ? 0 : 1), CB[4] + Math.sin(t * CB[6]) * CB[5] * (reduce ? 0 : 1), fsm) + pointer.x * 0.25 + heroSpin;

    // solid blocks fade in once the particles have converged onto the grid, fade out scrolling away
    let conv = 0;
    if (A === 2 || B === 2) {
      let d = 0, n = 0; const tmp = [0, 0, 0];
      for (let i = 0; i < N; i += 11) { cubesAt(i, t, tmp); const j = i * 3; d += Math.abs(cur[j] - tmp[0]) + Math.abs(cur[j + 1] - tmp[1]) + Math.abs(cur[j + 2] - tmp[2]); n++; }
      conv = clamp(1 - (d / n) / 0.42, 0, 1);
    }
    solidS += (conv - solidS) * Math.min(1, dt * (conv > solidS ? 2.2 : 5));
    const solid = ease(clamp((solidS - 0.45) / 0.5, 0, 1));
    const showCubes = solid > 0.01 && (A === 2 || B === 2);
    if (showCubes) layoutCubeMesh();
    sideMesh.visible = topMesh.visible = showCubes;
    sideMat.opacity = topMat.opacity = solid * 0.85;

    mat.uniforms.uSize.value = (light ? 34 : 30) * (1 + 0.25 * (1 - solid) * ov0);

    // demo's exact camera placement: cx/cy/sc are fractions of the viewport, not DOM rects —
    // this is what makes every shape (including the ring and the finale) the correct size.
    const cxPx = lerp(CA[0], CB[0], fsm) * innerWidth, cyPx = lerp(CA[1], CB[1], fsm) * innerHeight;
    const scPx = lerp(CA[2], CB[2], fsm) * Math.min(innerWidth * 0.38, innerHeight * 0.46) * (mobile ? 1.5 : 1);
    const pxPerUnit = innerHeight / visH;
    group.position.set((cxPx / innerWidth - 0.5) * visH * camera.aspect, -(cyPx / innerHeight - 0.5) * visH, 0);
    group.scale.setScalar(scPx / pxPerUnit);
    group.rotation.set(tilt, ry, 0);

    const dim = A !== B ? 1 - 0.55 * Math.sin(Math.PI * fsm) : 1;
    mat.uniforms.uOpacity.value = (light ? 0.97 : 0.94) * dim;

    // hero: loop labels riding the shape — DOM transform only, and only while visible
    loopChips.forEach((c) => {
      const on = ov0 > 0.02;
      c.el.style.opacity = on ? String(ov0) : '0';
      if (on) { const p = loopPt(c.t); const [lx, ly] = toScreen(p[0], p[1], p[2]); c.el.style.translate = `${(lx + 14).toFixed(1)}px ${(ly - 8).toFixed(1)}px`; }
    });

    // found: orbiting beads + centre text (bead nearest the top drives it, unless a bead was clicked)
    const beadOn = ov3;
    bmat.uniforms.uOpacity.value = beadOn * dim;
    if (!(A === 3 || B === 3)) pinnedIdx = null;
    let best = pinnedIdx ?? 0, bestD = 9;
    const beadsOn = beadOn > 0.02;
    for (let q = 0; q < 3; q++) {
      const an = (reduce ? 0 : t * 0.35) + (q * Math.PI * 2) / 3;
      beadPos[q * 3] = LR * Math.cos(an); beadPos[q * 3 + 1] = LR * Math.sin(an); beadPos[q * 3 + 2] = 0;
      if (pinnedIdx === null) { const d = Math.abs(Math.atan2(Math.sin(an - Math.PI / 2), Math.cos(an - Math.PI / 2))); if (d < bestD) { bestD = d; best = q; } }
      const el = beadEls[q] as HTMLElement;
      el.style.opacity = mobile || !beadsOn ? '0' : String(beadOn);
      if (beadsOn && !mobile) { const [bx, by] = toScreen(beadPos[q * 3], beadPos[q * 3 + 1], 0); el.style.translate = `${bx.toFixed(1)}px ${by.toFixed(1)}px`; }
    }
    bgeo.attributes.position.needsUpdate = true;
    if (best !== coreIdx) {
      coreIdx = best;
      if (ov.who && ov.verb && ov.tag) { ov.who.textContent = WORDS[best][0]; ov.verb.textContent = WORDS[best][1]; ov.tag.textContent = WORDS[best][2];
        ov.verb.style.animation = 'none'; void ov.verb.offsetWidth; ov.verb.style.animation = ''; }
      beadEls.forEach((el, q) => el.classList.toggle('active', q === best));
    }
    if (ov.core) {
      (ov.core as HTMLElement).style.opacity = mobile || !beadsOn ? '0' : String(beadOn);
      if (beadsOn && !mobile) { const [ccx, ccy] = toScreen(0, 0, 0); (ov.core as HTMLElement).style.translate = `${ccx.toFixed(1)}px ${ccy.toFixed(1)}px`; }
    }

    // finale: the particle letters turn solid on the SAME canvas — one wordmark, no DOM copy
    const wOn = clamp((ov4 - 0.5) / 0.4, 0, 1);
    if (WM) {
      wordPlane.position.set(0, 0, 0.01);
      wordPlane.scale.set(WM.w, WM.h, 1);
    }
    wordPlaneMat.opacity = wOn;
    wordPlane.visible = wOn > 0.01;

    // soft bioluminescent halo — dark theme only, and only behind the ring + finale
    if (glow) {
      const haloOn = light ? 0 : (ov3 + ov4 * 0.8);
      if (haloOn > 0.01) {
        const [gx, gy] = toScreen(0, 0, 0);
        const pxPerUnit = innerHeight / visH;
        const r = 1.1 * group.scale.x * pxPerUnit;
        (glow as HTMLElement).style.translate = `${gx}px ${gy}px`;
        (glow as HTMLElement).style.width = r * 2.3 + 'px'; (glow as HTMLElement).style.height = r * 2.3 + 'px';
        (glow as HTMLElement).style.opacity = String(Math.max(0, mat.uniforms.uOpacity.value) * haloOn);
      } else {
        (glow as HTMLElement).style.opacity = '0';
      }
    }

    renderer.render(scene, camera);
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    mobile = W < 1024;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.position.z = 10; camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  addEventListener('resize', resize);
  resize(); measure();
  raf = requestAnimationFrame(frame);

  // pause the loop while the tab is hidden
  const onVisibility = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', measure); removeEventListener('resize', measure); removeEventListener('resize', resize);
    removeEventListener('pointermove', onPointerMove); window.removeEventListener('themechange', applyTheme);
    document.removeEventListener('visibilitychange', onVisibility);
    geo.dispose(); bgeo.dispose(); sideGeo.dispose(); topGeo.dispose(); wordPlaneGeo.dispose(); wordTex.dispose();
    mat.dispose(); bmat.dispose(); sideMat.dispose(); topMat.dispose(); wordPlaneMat.dispose(); renderer.dispose();
  };
}
