// @ts-nocheck
/* Scene E — Infinity, ported directly from the approved HTML reference
 * (webloop-motion-demo_2.html, section "9. E — INFINITY (Three.js)" +
 * the `infinity()` IIFE). A particle cloud scattered in space gathers
 * onto a shader-drawn infinity ribbon (4 twisted strands + a core tube),
 * three labeled DOM nodes fade in along the path (Students/Companies/
 * Projects), then glowing connection arcs with travelling comet
 * particles link them. GSAP ScrollTrigger pins the section and scrubs a
 * single progress value 0..1 that drives every stage. Same shader code,
 * geometry and camera math as the reference; only cross-page navigation
 * (go) and the DOM node elements are supplied by the React wrapper. */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;
function ensureGSAP() {
  if (!registered) { gsap.registerPlugin(ScrollTrigger); registered = true; }
}

export interface InfNodeDef {
  k: 'students' | 'companies' | 'projects';
  l: string;
  s: string;
  p: [number, number, number];
  go: 'gallery' | 'companies' | 'explore';
  at: number;
}

export const INF_NODES: InfNodeDef[] = [
  { k: 'students', l: 'Students', s: 'Find your people', p: [-3.75, 2.2, 0.9], go: 'gallery', at: 0.5 },
  { k: 'companies', l: 'Companies', s: 'Discover talent', p: [3.75, 2.2, 0.9], go: 'companies', at: 0.6 },
  { k: 'projects', l: 'Projects', s: 'Turn ideas into reality', p: [0, -2.45, 1.3], go: 'explore', at: 0.7 },
];

export const INF_STEPS: [string, string, number][] = [
  ['Particles appear', 'Small points of light begin drifting on their own.', 0],
  ['Particles gather', 'They move towards the centre and start to form two loops.', 0.13],
  ['Infinity forms', 'The particles join into one flowing 3D infinity path.', 0.36],
  ['Students', 'Find your people. The first node lights up.', 0.5],
  ['Companies', 'Discover talent. The second node appears.', 0.6],
  ['Projects', 'Turn ideas into reality. The third node completes the set.', 0.7],
  ['Connections activate', 'Light travels the loop: students reach companies through projects.', 0.8],
  ['Complete ecosystem', 'Three nodes, one continuous, connected loop.', 0.93],
];

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface InfinityHandle {
  dispose(): void;
  replay(): void;
  goToStep(i: number): void;
  setHover(i: number): void;
}

export function createInfinityEngine(
  section: HTMLElement,
  view: HTMLElement,
  canvas: HTMLCanvasElement,
  opts: {
    reduceMotion: boolean;
    onHoverChange?: (i: number) => void;
    onStepChange?: (i: number) => void;
    onProgress?: (p: number) => void;
    onNodeLayout?: (layouts: { i: number; x: number; y: number; alpha: number; scale: number }[]) => void;
  },
): InfinityHandle {
  const RM = opts.reduceMotion;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return { dispose() {}, replay() {}, goToStep() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  const group = new THREE.Group(); scene.add(group);

  const A = 3.7;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 360; i++) {
    const t = (i / 360) * Math.PI * 2, d = 1 + Math.sin(t) ** 2;
    pts.push(new THREE.Vector3((A * Math.cos(t)) / d * 1.12, (A * Math.sin(t) * Math.cos(t)) / d * 1.25, 0.7 * Math.sin(t)));
  }
  pts.pop();
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const SEG = 700;
  const frames = curve.computeFrenetFrames(SEG, true);
  const samp: THREE.Vector3[] = [];
  for (let i = 0; i <= SEG; i++) samp.push(curve.getPointAt(i / SEG));

  const PAL = 'uniform vec3 cA,cB,cC,cD;vec3 pal(float x){x=fract(x)*4.;return x<1.?mix(cA,cB,x):x<2.?mix(cB,cC,x-1.):x<3.?mix(cC,cD,x-2.):mix(cD,cA,x-3.);}';
  const mats: THREE.ShaderMaterial[] = [];
  const colors = { dark: ['#22d3ee', '#2dd4bf', '#3b82f6', '#a78bfa'], light: ['#0891b2', '#0d9488', '#2563eb', '#7c3aed'] };
  const uni = (o: Record<string, unknown>) => Object.assign({ cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, cC: { value: new THREE.Color() }, cD: { value: new THREE.Color() }, uLight: { value: 0 }, uT: { value: 0 } }, o);

  const rvert = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const rfrag = `varying vec2 vUv;uniform float uGlow,uPh,uRev,uT,uLight;${PAL}
  void main(){float u=vUv.x;if(u>uRev)discard;float head=smoothstep(uRev,uRev-.04,u);vec3 c=pal(u+uT*.03);float p=.5+.5*sin(u*50.-uT*1.5+uPh);float a=uLight>.5?.94:(.4+.55*p)*min(uGlow,1.4);gl_FragColor=vec4(c*(.8+.5*p*uGlow),a*head);}`;
  const mk = (ph: number) => {
    const m = new THREE.ShaderMaterial({ vertexShader: rvert, fragmentShader: rfrag, transparent: true, depthWrite: false, uniforms: uni({ uGlow: { value: 1 }, uPh: { value: ph }, uRev: { value: 0 } }) });
    mats.push(m); return m;
  };
  const STR = 4, TW = 7;
  const ribbon = new THREE.Group(); group.add(ribbon);
  for (let s = 0; s < STR; s++) {
    const ps: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i += 2) {
      const u = i / SEG, th = u * Math.PI * 2 * TW + (s * Math.PI * 2) / STR, r = 0.34 + 0.06 * Math.sin(u * Math.PI * 6 + s);
      const N = frames.normals[i], B = frames.binormals[i], P = samp[i];
      ps.push(new THREE.Vector3(
        P.x + (N.x * Math.cos(th) + B.x * Math.sin(th)) * r,
        P.y + (N.y * Math.cos(th) + B.y * Math.sin(th)) * r,
        P.z + (N.z * Math.cos(th) + B.z * Math.sin(th)) * r,
      ));
    }
    ps.pop();
    const c = new THREE.CatmullRomCurve3(ps, true);
    ribbon.add(new THREE.Mesh(new THREE.TubeGeometry(c, 800, 0.028, 6, true), mk(s * 1.7)));
  }
  const coreM = mk(0);
  ribbon.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 0.05, 8, true), coreM));
  const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 0.2, 16, true), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, depthWrite: false }));
  group.add(halo);

  // particle cloud: scattered -> gathers onto the loop
  const N = innerWidth < 700 ? 7000 : 15000;
  const rng = mulberry32(42);
  const P_ = new Float32Array(N * 3), cen = new Float32Array(N * 3), off = new Float32Array(N * 3), scat = new Float32Array(N * 3);
  const seed = new Float32Array(N), aU = new Float32Array(N), aS = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rng(); const P = samp[Math.floor(u * SEG) % SEG];
    const a = rng() * 6.283, r = Math.pow(rng(), 0.7) * 0.34;
    cen.set([P.x, P.y, P.z], i * 3);
    off.set([Math.cos(a) * r, Math.sin(a) * r, (rng() - 0.5) * r], i * 3);
    const th = rng() * 6.283, ph = Math.acos(2 * rng() - 1), R = 2.4 + rng() * 5.2;
    scat.set([R * Math.sin(ph) * Math.cos(th) * 1.25, R * Math.sin(ph) * Math.sin(th) * 0.72, R * Math.cos(ph) * 0.55], i * 3);
    seed[i] = rng(); aU[i] = u; aS[i] = 0.6 + rng() * 1.4;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(P_, 3));
  pg.setAttribute('aCen', new THREE.BufferAttribute(cen, 3));
  pg.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  pg.setAttribute('aScat', new THREE.BufferAttribute(scat, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  pg.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  pg.setAttribute('aSize', new THREE.BufferAttribute(aS, 1));
  const pm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: uni({ uForm: { value: 0 }, uAppear: { value: 0 }, uTight: { value: 0 }, uPulse: { value: 0 }, uPA: { value: 0 }, uPx: { value: 1 }, uSize: { value: 3 } }),
    vertexShader: `attribute vec3 aCen,aOff,aScat;attribute float aSeed,aU,aSize;uniform float uForm,uAppear,uTight,uPulse,uPA,uPx,uSize,uT;varying float vA,vMix,vGlow;
   void main(){float f=clamp(uForm*1.5-aSeed*.5,0.,1.);f=f*f*(3.-2.*f);
    vec3 s=aScat+vec3(sin(uT*.5+aSeed*40.),cos(uT*.42+aSeed*31.),sin(uT*.36+aSeed*17.))*.3;
    vec3 t=aCen+aOff*mix(2.2,1.,uTight)+vec3(0.,0.,sin(uT*1.2+aU*30.))*.02;
    vec3 p=mix(s,t,f);float an=f*(1.-f)*2.6*(aSeed-.5);float c=cos(an),sn=sin(an);p.xy=mat2(c,sn,-sn,c)*p.xy;
    float d=abs(fract(aU-uPulse+.5)-.5);vGlow=smoothstep(.07,0.,d)*f*uPA;vMix=aU;vA=smoothstep(aSeed*.7,aSeed*.7+.3,uAppear)*mix(.55,1.,f);
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=uSize*aSize*uPx*(1.+vGlow*1.8)*(11./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vA,vMix,vGlow;uniform float uLight;${PAL}
   void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);a*=a;vec3 c=pal(vMix*2.);c=mix(c,uLight>.5?vec3(.05,.45,.8):vec3(.85,1.,1.),vGlow*.75);gl_FragColor=vec4(c,a*vA*(uLight>.5?.95:.6+vGlow*.5));}`,
  });
  mats.push(pm);
  const points = new THREE.Points(pg, pm); points.frustumCulled = false; group.add(points);

  // travelling comets
  const COM = 64;
  const cpos = new Float32Array(COM * 3), csiz = new Float32Array(COM), calp = new Float32Array(COM), ccol = new Float32Array(COM * 3);
  const comets = Array.from({ length: COM }, () => ({ u: rng(), v: 0.018 + rng() * 0.03, th: rng() * 6.28, r: 0.1 + rng() * 0.5, w: rng() * 6.28 }));
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
  cg.setAttribute('aSize', new THREE.BufferAttribute(csiz, 1));
  cg.setAttribute('aAlpha', new THREE.BufferAttribute(calp, 1));
  cg.setAttribute('aCol', new THREE.BufferAttribute(ccol, 3));
  const cm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uPx: { value: 1 } },
    vertexShader: 'attribute float aSize;attribute float aAlpha;attribute vec3 aCol;varying float vA;varying vec3 vC;uniform float uPx;void main(){vA=aAlpha;vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uPx*(9./-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);a*=a;gl_FragColor=vec4(vC,a*vA);}',
  });
  const comp = new THREE.Points(cg, cm); comp.frustumCulled = false; group.add(comp);

  // connection arcs between nodes
  const arcs = ([[0, 2, -0.5], [2, 1, -0.5], [0, 1, 0.8]] as [number, number, number][]).map(([a, b, bend], k) => {
    const A_ = new THREE.Vector3(...INF_NODES[a].p), B_ = new THREE.Vector3(...INF_NODES[b].p);
    const M = A_.clone().add(B_).multiplyScalar(0.5); M.y += bend; M.z += 0.5;
    const cv = new THREE.QuadraticBezierCurve3(A_, M, B_);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: uni({ uAmt: { value: 0 }, uHi: { value: 0 }, uDir: { value: k === 1 ? -1 : 1 }, uK: { value: k } }),
      vertexShader: rvert,
      fragmentShader: `varying vec2 vUv;uniform float uAmt,uHi,uDir,uT,uK,uLight;${PAL}void main(){float d=abs(fract(vUv.x-uT*.22*uDir*(1.+uHi*1.5)+uK*.3+.5)-.5);float pl=smoothstep(.16,0.,d);vec3 c=pal(vUv.x*.5+uK*.25);float base=.22+.5*uHi;gl_FragColor=vec4(mix(c,uLight>.5?vec3(.0,.25,.6):vec3(.9,1.,1.),pl*.4),uAmt*(base+pl*.9));}`,
    });
    mats.push(m);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(cv, 64, 0.022, 6, false), m); group.add(mesh);
    return { a, b, m };
  });

  const tmp = new THREE.Color(); const cc = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];
  const o3 = [0, 0, 0];
  function at(u: number, th: number, r: number, out: number[]) {
    const f = (((u % 1) + 1) % 1) * SEG, i = Math.floor(f), j = Math.min(SEG, i + 1), k = f - i;
    const P = samp[i], Q = samp[j], Nn = frames.normals[i], B = frames.binormals[i];
    const c = Math.cos(th) * r, s = Math.sin(th) * r;
    out[0] = P.x + (Q.x - P.x) * k + Nn.x * c + B.x * s;
    out[1] = P.y + (Q.y - P.y) * k + Nn.y * c + B.y * s;
    out[2] = P.z + (Q.z - P.z) * k + Nn.z * c + B.z * s;
  }
  let light = document.documentElement.classList.contains('light');
  let trav = 0;
  function applyTheme() {
    light = document.documentElement.classList.contains('light');
    const cs = colors[light ? 'light' : 'dark'];
    cc.forEach((c, i) => c.set(cs[i]));
    mats.forEach((m) => {
      (['cA', 'cB', 'cC', 'cD'] as const).forEach((k, i) => (m.uniforms[k].value as THREE.Color).copy(cc[i]));
      m.uniforms.uLight.value = light ? 1 : 0;
      m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.needsUpdate = true;
    });
    cm.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; cm.needsUpdate = true;
    (halo.material as THREE.MeshBasicMaterial).color.set(light ? 0x3b82f6 : 0x22d3ee);
    if (!running) render();
  }
  function updateComets(t: number, dt: number) {
    const sp = 1 + arcs.reduce((a, x) => a + x.m.uniforms.uHi.value, 0) * 0.5;
    for (let i = 0; i < COM; i++) {
      const c = comets[i]; c.u = (c.u + c.v * dt * sp) % 1;
      at(c.u, c.th + t * 0.6, c.r, o3);
      cpos[i * 3] = o3[0]; cpos[i * 3 + 1] = o3[1]; cpos[i * 3 + 2] = o3[2];
      csiz[i] = light ? 11 : 12; calp[i] = (light ? 0.9 : 0.75) * trav;
      const q = ((c.u * 4) % 4 + 4) % 4, ci = Math.floor(q);
      tmp.copy(cc[ci]).lerp(cc[(ci + 1) % 4], q - ci);
      ccol[i * 3] = tmp.r; ccol[i * 3 + 1] = tmp.g; ccol[i * 3 + 2] = tmp.b;
    }
    (cg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (cg.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (cg.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (cg.attributes.aCol as THREE.BufferAttribute).needsUpdate = true;
  }

  // bounded drag rotation
  let yaw = 0, pitch = 0, tyaw = 0, tpitch = 0;
  let drag: { x: number; y: number; yw: number; pt: number; mouse: boolean } | null = null;
  let dragMoved = 0;
  const LY = 38, LP = 20;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button > 0 || (e.target as HTMLElement).closest('.inf-node,.rot-hint')) return;
    drag = { x: e.clientX, y: e.clientY, yw: tyaw, pt: tpitch, mouse: e.pointerType === 'mouse' };
    dragMoved = 0;
    try { view.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    dragMoved = Math.max(dragMoved, Math.hypot(dx, dy));
    if (dragMoved < 5) return;
    view.classList.add('grab');
    tyaw = clamp(drag.yw + dx * 0.25, -LY, LY);
    if (drag.mouse) tpitch = clamp(drag.pt + dy * 0.18, -LP, LP);
    if (!running) render();
  };
  const endDrag = () => { drag = null; view.classList.remove('grab'); setTimeout(() => { dragMoved = 0; }, 0); };
  view.addEventListener('pointerdown', onPointerDown);
  view.addEventListener('pointermove', onPointerMove);
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);

  // progress -> scene
  let target = 0, pS = 0;
  const S = (a: number, b: number) => { const x = clamp((pS - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const v3 = new THREE.Vector3();
  let W = 1, H = 1, clock = 0, last = performance.now(), running = false, raf = 0;
  let hoverI = -1, stepI = -1;

  function place() {
    const layouts = INF_NODES.map((n, i) => {
      const a = S(n.at, n.at + 0.07);
      v3.set(n.p[0], n.p[1], n.p[2]); group.localToWorld(v3); v3.project(camera);
      return { i, x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, alpha: a, scale: 0.55 + 0.45 * a };
    });
    opts.onNodeLayout?.(layouts);
  }
  function setStep(i: number) {
    if (i === stepI) return;
    stepI = i;
    opts.onStepChange?.(i);
  }
  function size() {
    W = view.clientWidth; H = view.clientHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.position.set(0, 0, Math.max(10.2, (camera.aspect < 1 ? 6.4 : 4.9) / (0.344 * camera.aspect)));
    camera.updateProjectionMatrix();
    const px = (H / 620) * renderer.getPixelRatio() * 1.1;
    pm.uniforms.uPx.value = px; cm.uniforms.uPx.value = px;
  }
  function frameState() {
    pm.uniforms.uAppear.value = S(0, 0.12);
    pm.uniforms.uForm.value = S(0.12, 0.38);
    pm.uniforms.uTight.value = S(0.3, 0.5);
    pm.uniforms.uPA.value = S(0.7, 0.8);
    pm.uniforms.uPulse.value = (clock * 0.12) % 1;
    const rev = S(0.36, 0.52);
    mats.forEach((m) => { if (m.uniforms.uRev) m.uniforms.uRev.value = rev; });
    (halo.material as THREE.MeshBasicMaterial).opacity = (light ? 0.07 : 0.1) * rev;
    trav = S(0.76, 0.84);
    const am = S(0.78, 0.9);
    arcs.forEach((x) => {
      x.m.uniforms.uAmt.value = am;
      const t = hoverI < 0 ? 0 : x.a === hoverI || x.b === hoverI ? 1 : -0.6;
      x.m.uniforms.uHi.value += (Math.max(t, 0) - x.m.uniforms.uHi.value) * 0.15;
      x.m.uniforms.uAmt.value = am * (t < 0 ? 0.45 : 1);
    });
    let si = 0; INF_STEPS.forEach((s, i) => { if (pS >= s[2] - 0.0001) si = i; });
    setStep(si);
    opts.onProgress?.(pS);
  }
  function render() {
    group.rotation.y = (yaw * Math.PI) / 180; group.rotation.x = (pitch * Math.PI) / 180;
    mats.forEach((m) => { m.uniforms.uT.value = clock; });
    frameState(); renderer.render(scene, camera); place();
  }
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    pS += (target - pS) * Math.min(1, dt * 7); if (Math.abs(target - pS) < 0.0004) pS = target;
    yaw += (tyaw - yaw) * 0.14; pitch += (tpitch - pitch) * 0.14;
    frameState(); updateComets(clock, dt); render();
    raf = running ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (RM || running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setP(v: number) {
    target = clamp(v, 0, 1);
    if (RM) { pS = target; yaw = tyaw; pitch = tpitch; clock = 1.5; updateComets(clock, 0.016); render(); }
  }

  applyTheme();
  window.addEventListener('themechange', applyTheme);
  size();
  const onResize = () => { size(); if (!running) render(); };
  const ro = new ResizeObserver(onResize); ro.observe(view);
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.02 });
  io.observe(view);
  const onContextLost = (e: Event) => { e.preventDefault(); stop(); };
  canvas.addEventListener('webglcontextlost', onContextLost);

  let st: ScrollTrigger | undefined;
  let auto: gsap.core.Tween | null = null;
  const killAuto = () => { if (auto) { auto.kill(); auto = null; } };
  const onDismiss = () => killAuto();
  (['wheel', 'touchstart', 'keydown'] as const).forEach((ev) => addEventListener(ev, onDismiss, { passive: true }));

  function replay() {
    killAuto();
    if (RM) { setP(1); return; }
    if (st) {
      const o = { y: st.start };
      window.scrollTo({ top: st.start, behavior: 'instant' as ScrollBehavior });
      target = 0; pS = 0;
      auto = gsap.to(o, { y: st.end - 2, duration: 11, ease: 'none', delay: 0.35, onUpdate: () => window.scrollTo({ top: o.y, behavior: 'instant' as ScrollBehavior }), onComplete: () => { auto = null; } });
    } else {
      const o = { p: 0 }; target = 0; pS = 0;
      auto = gsap.to(o, { p: 1, duration: 11, ease: 'none', delay: 0.3, onUpdate: () => { target = o.p; } });
    }
  }

  ensureGSAP();
  if (RM) {
    setP(1);
  } else {
    st = ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=420%', pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => { target = self.progress; },
    });
  }
  if (!RM) render();

  return {
    dispose() {
      stop(); killAuto();
      window.removeEventListener('themechange', applyTheme);
      (['wheel', 'touchstart', 'keydown'] as const).forEach((ev) => removeEventListener(ev, onDismiss));
      ro.disconnect(); io.disconnect();
      view.removeEventListener('pointerdown', onPointerDown);
      view.removeEventListener('pointermove', onPointerMove);
      view.removeEventListener('pointerup', endDrag);
      view.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      st?.kill();
      scene.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      renderer.dispose();
    },
    replay,
    goToStep(i: number) {
      const p = INF_STEPS[i][2] + 0.005;
      killAuto();
      if (st) window.scrollTo({ top: st.start + (st.end - st.start) * p, behavior: RM ? 'auto' : 'smooth' });
      else target = p;
    },
    setHover(i: number) { hoverI = i; opts.onHoverChange?.(i); if (!running) render(); },
  };
}
