// @ts-nocheck
/* Companies — 3D business district, ported from the approved HTML
 * reference (webloop-motion-demo_2.html, section 13 + its "17. REVISION"
 * overrides + the `companies()` IIFE's 3D-scene half). Raycasting glass
 * office towers with lit-window canvas textures and a company sign on
 * two faces, a reflective plaza with a mirrored duplicate of the whole
 * district, trees/lamps, procedural equirectangular env maps for glass
 * reflections, adaptive pixel ratio under load. Driven by real company
 * profiles (not the reference's fixed demo building list) — each
 * building's position/size is derived from a stable hash of the
 * company's id, so the layout is deterministic per company but not
 * hand-placed. */
import * as THREE from 'three';

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
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

export interface CityCompany {
  id: string;
  name: string;
  initial: string;
  industry: string;
  avatarUrl: string | null;
  tint: number;
  tintCss: string;
}

export function buildCityCompanies(list: { id: string; display_name: string; avatar_url: string | null; bio: string | null }[]): CityCompany[] {
  const TINTS: [number, string][] = [[0x4ad9a8, '#4ad9a8'], [0xa58bff, '#a58bff'], [0xff9d5c, '#ff9d5c'], [0xe27cff, '#e27cff'], [0x35e3c8, '#35e3c8'], [0x57a8ff, '#57a8ff']];
  return list.slice(0, 9).map((c, i) => ({
    id: c.id,
    name: c.display_name,
    initial: c.display_name.trim()[0]?.toUpperCase() ?? '?',
    industry: c.bio?.split('.')[0]?.slice(0, 28) ?? 'Company',
    avatarUrl: c.avatar_url,
    tint: TINTS[i % TINTS.length][0],
    tintCss: TINTS[i % TINTS.length][1],
  }));
}

export interface CityHandle {
  /** Highlight a building from outside the canvas (e.g. a hovered company card). */
  setHover(id: string | null): void;
  dispose(): void;
}

export function createCityEngine(
  view: HTMLElement,
  canvas: HTMLCanvasElement,
  companies: CityCompany[],
  opts: {
    onHoverChange?: (id: string | null, external: boolean) => void;
    onOpen?: (id: string) => void;
    onTipPosition?: (x: number, y: number) => void;
  },
): CityHandle {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return { setHover() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  const SHADOWS = innerWidth > 900;
  renderer.shadowMap.enabled = SHADOWS;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 200);
  const world = new THREE.Group(); scene.add(world);
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  let light = document.documentElement.classList.contains('light');

  function envCanvas(isLight: boolean) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 512);
    if (isLight) { g.addColorStop(0, '#6fa6ec'); g.addColorStop(0.45, '#bcd7f7'); g.addColorStop(0.5, '#eef6ff'); g.addColorStop(0.62, '#86a6cf'); g.addColorStop(1, '#4d6c98'); }
    else { g.addColorStop(0, '#061226'); g.addColorStop(0.42, '#12406a'); g.addColorStop(0.5, '#2aa0c8'); g.addColorStop(0.56, '#0a2038'); g.addColorStop(1, '#02060d'); }
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    const box = (px: number, py: number, w: number, h: number, col: string, a: number) => {
      const r = x.createRadialGradient(px, py, 0, px, py, Math.max(w, h));
      r.addColorStop(0, col); r.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalAlpha = a; x.fillStyle = r; x.fillRect(px - w, py - h, w * 2, h * 2); x.globalAlpha = 1;
    };
    ([[150, 150, 90, 60], [420, 130, 110, 50], [700, 160, 100, 60], [930, 120, 80, 50]] as const).forEach(([px, py, w, h]) => box(px, py, w, h, '#ffffff', isLight ? 0.9 : 0.75));
    x.fillStyle = isLight ? 'rgba(255,255,255,.9)' : 'rgba(180,235,255,.85)';
    [60, 300, 520, 760, 980].forEach((px, i) => x.fillRect(px, 236 + (i % 2) * 6, 120 + i * 14, 5));
    return c;
  }
  const pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader();
  const ENV: Record<string, THREE.Texture> = {};
  [false, true].forEach((l) => {
    const t = new THREE.CanvasTexture(envCanvas(l)); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    ENV[String(l)] = pm.fromEquirectangular(t).texture; t.dispose();
  });

  const glassList: { m: THREE.MeshPhysicalMaterial; base: number }[] = [];
  const coreList: { m: THREE.MeshStandardMaterial; base: number }[] = [];
  const edgeList: THREE.Material[] = [];
  const slabList: THREE.MeshStandardMaterial[] = [];
  const winList: { cv: HTMLCanvasElement; wt: THREE.CanvasTexture; seed: number; cols: number; rows: number }[] = [];
  const signList: THREE.CanvasTexture[] = [];

  function paintWin(cv: HTMLCanvasElement, seed: number, L: boolean, cols: number, rows: number) {
    const c = cv.getContext('2d')!; const r = mulberry32(seed); const cw = cv.width / cols, rh = cv.height / rows;
    c.fillStyle = L ? '#1c5fc4' : '#061226'; c.fillRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = r() < (L ? 0.32 : 0.5);
      const col = L
        ? (lit ? ['#d9f6ff', '#9ff0ff', '#ffffff', '#7be8d8', '#bfe9ff'] : ['#2c84ec', '#2a9bf2', '#1f70d6', '#1fa6e4', '#2b8bf0'])[Math.floor(r() * 5)]
        : (lit ? ['#ffd9a0', '#a6ecff', '#ffffff', '#8fb8ff', '#ffe9c4'] : ['#0a1c36', '#0c2240', '#08152a'])[Math.floor(r() * (lit ? 5 : 3))];
      c.fillStyle = col; c.fillRect(x * cw + 2, y * rh + 3, cw - 4, rh - 6);
    }
    c.fillStyle = L ? 'rgba(210,238,255,.9)' : 'rgba(130,210,255,.4)';
    for (let y = 0; y <= rows; y++) c.fillRect(0, y * rh - 1.5, cv.width, 3);
    for (let x = 0; x <= cols; x += 2) c.fillRect(x * cw - 1, 0, 2, cv.height);
  }
  function signTex(co: CityCompany) {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 224;
    const c = cv.getContext('2d')!; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = aniso;
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    };
    const draw = (img: HTMLImageElement | null) => {
      c.clearRect(0, 0, 640, 224);
      const g = c.createLinearGradient(0, 0, 0, 224); g.addColorStop(0, '#0d2038'); g.addColorStop(1, '#050e1d');
      c.fillStyle = g; rr(6, 6, 628, 212, 34); c.fill();
      c.lineWidth = 3; c.strokeStyle = co.tintCss; c.globalAlpha = 0.9; rr(6, 6, 628, 212, 34); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = '#fff'; rr(30, 32, 160, 160, 34); c.fill();
      if (img) { c.save(); rr(30, 32, 160, 160, 34); c.clip(); c.drawImage(img, 30, 32, 160, 160); c.restore(); }
      else { c.fillStyle = co.tintCss; c.font = '700 90px Figtree,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(co.initial, 110, 118); }
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.font = '700 56px Figtree,Segoe UI,Arial,sans-serif'; c.textBaseline = 'alphabetic';
      c.fillText(co.name.slice(0, 16), 214, 112);
      c.fillStyle = co.tintCss; c.font = '600 26px Figtree,Segoe UI,Arial,sans-serif'; c.fillText(co.industry.toUpperCase().slice(0, 24), 216, 158);
      tx.needsUpdate = true;
    };
    draw(null);
    if (co.avatarUrl) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => draw(im); im.src = co.avatarUrl; }
    return tx;
  }

  interface BuildDef { id: string; co: CityCompany; x: number; z: number; w: number; d: number; h: number }
  const DEF: BuildDef[] = companies.map((co, i) => {
    const rng = mulberry32(hashSeed(co.id));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const idx = i + 0.5;
    const r = 2.2 + Math.sqrt(idx / companies.length) * 5.3;
    const a = idx * golden;
    return { id: co.id, co, x: Math.cos(a) * r, z: Math.sin(a) * r, w: 2.2 + rng() * 1.4, d: 2.2 + rng() * 1.2, h: 3.5 + rng() * 7.2 };
  });

  const bGroup = new THREE.Group(); world.add(bGroup);
  const hit: THREE.Object3D[] = [];
  const builds: { g: THREE.Group; d: BuildDef; glassM: THREE.MeshPhysicalMaterial; coreM: THREE.MeshStandardMaterial; em: THREE.LineBasicMaterial; hl: number; top: THREE.Vector3 }[] = [];
  const boxG = new THREE.BoxGeometry(1, 1, 1);

  DEF.forEach((d, n) => {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z);
    const cols = Math.max(3, Math.round(d.w / 0.52)), rows = Math.max(4, Math.round(d.h / 0.62)), fh = d.h / rows;
    const cv = document.createElement('canvas'); cv.width = cols * 24; cv.height = rows * 32;
    const wt = new THREE.CanvasTexture(cv); wt.colorSpace = THREE.SRGBColorSpace; wt.anisotropy = aniso;
    winList.push({ cv, wt, seed: n * 13 + 3, cols, rows });
    const coreM = new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.55, metalness: 0.25 });
    coreList.push({ m: coreM, base: 1 });
    const core = new THREE.Mesh(boxG, coreM); core.scale.set(d.w * 0.94, d.h, d.d * 0.94); core.position.y = d.h / 2; core.castShadow = SHADOWS; g.add(core);
    const glassM = new THREE.MeshPhysicalMaterial({ color: d.co.tint, metalness: 0.2, roughness: 0.04, transparent: true, opacity: 0.26, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5, depthWrite: false });
    glassList.push({ m: glassM, base: 0.26 });
    const shell = new THREE.Mesh(boxG, glassM); shell.scale.set(d.w, d.h + 0.04, d.d); shell.position.y = d.h / 2; shell.renderOrder = 2; g.add(shell);
    const eg = new THREE.EdgesGeometry(boxG), em = new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.5 });
    edgeList.push(em);
    const edge = new THREE.LineSegments(eg, em); edge.scale.copy(shell.scale); edge.position.copy(shell.position); g.add(edge);
    const sm = new THREE.MeshStandardMaterial({ color: 0x17314f, roughness: 0.35, metalness: 0.55, envMapIntensity: 1 });
    slabList.push(sm);
    const slabs = new THREE.InstancedMesh(boxG, sm, rows + 1); const mt = new THREE.Matrix4();
    for (let i = 0; i <= rows; i++) { mt.compose(new THREE.Vector3(0, i * fh, 0), new THREE.Quaternion(), new THREE.Vector3(d.w * 1.03, i === rows ? 0.2 : 0.07, d.d * 1.03)); slabs.setMatrixAt(i, mt); }
    g.add(slabs);
    const roofM = new THREE.MeshStandardMaterial({ color: 0x213f60, roughness: 0.4, metalness: 0.6 }); slabList.push(roofM);
    const r1 = new THREE.Mesh(boxG, roofM); r1.scale.set(d.w * 0.6, 0.5, d.d * 0.6); r1.position.y = d.h + 0.25; g.add(r1);
    if (d.h > 6) {
      const r2 = new THREE.Mesh(boxG, roofM); r2.scale.set(d.w * 0.3, 0.7, d.d * 0.3); r2.position.y = d.h + 0.85; g.add(r2);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6, 6), roofM); ant.position.y = d.h + 1.9; g.add(ant);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), new THREE.MeshBasicMaterial({ color: d.co.tintCss })); bl.position.y = d.h + 2.75; g.add(bl);
    }
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(boxG), new THREE.LineBasicMaterial({ color: d.co.tint, transparent: true, opacity: 0.95 }));
    rim.scale.set(d.w * 1.03, 0.2, d.d * 1.03); rim.position.y = d.h; g.add(rim);

    const sw = Math.min(d.w * 0.92, 2.9), sh = (sw * 224) / 640, tx = signTex(d.co); signList.push(tx);
    const mkSign = () => new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false }));
    const y = d.h > 7 ? d.h * 0.78 : d.h > 4 ? d.h * 0.72 : d.h * 0.66;
    const s1 = mkSign(); s1.position.set(0, y, d.d / 2 + 0.05); g.add(s1);
    const s2 = mkSign(); s2.rotation.y = Math.PI / 2; s2.position.set(d.w / 2 + 0.05, y, 0); g.add(s2);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.35, sh * 1.7), new THREE.MeshBasicMaterial({ color: d.co.tint, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, y, d.d / 2 + 0.03); g.add(glow);
    [s1, s2].forEach((m) => { (m.userData as any).cid = d.id; hit.push(m); });
    (edge.userData as any).cid = d.id;

    builds.push({ g, d, glassM, coreM, em, hl: 0, top: new THREE.Vector3(d.x, d.h + 0.8, d.z) });
    bGroup.add(g);
  });

  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 1024;
  const gtex = new THREE.CanvasTexture(gcv); gtex.colorSpace = THREE.SRGBColorSpace; gtex.anisotropy = aniso;
  function paintGround(L: boolean) {
    const c = gcv.getContext('2d')!;
    c.fillStyle = L ? '#c9d8ec' : '#0a1626'; c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = L ? 'rgba(255,255,255,.9)' : 'rgba(110,200,255,.25)'; c.lineWidth = 3;
    for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(i * 102.4, 0); c.lineTo(i * 102.4, 1024); c.moveTo(0, i * 102.4); c.lineTo(1024, i * 102.4); c.stroke(); }
    c.fillStyle = L ? 'rgba(120,190,150,.55)' : 'rgba(40,160,120,.22)';
    ([[120, 780, 160, 120], [780, 740, 140, 150], [470, 880, 120, 90], [760, 150, 120, 100]] as const).forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
    c.setLineDash([14, 14]); c.strokeStyle = L ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.3)';
    c.beginPath(); c.arc(512, 512, 330, 0, 7); c.stroke(); c.beginPath(); c.arc(512, 512, 420, 0, 7); c.stroke();
    gtex.needsUpdate = true;
  }
  const platM = new THREE.MeshStandardMaterial({ map: gtex, roughness: 0.28, metalness: 0.55, envMapIntensity: 0.9, transparent: true, opacity: 0.84 });
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.6, 0.5, 96), platM); plat.position.y = -0.25; plat.receiveShadow = SHADOWS; world.add(plat);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(10.45, 0.07, 10, 128), new THREE.MeshBasicMaterial({ color: 0x35d8ff, transparent: true, opacity: 0.95 }));
  ring1.rotation.x = Math.PI / 2; ring1.position.y = 0.02; world.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(10.9, 11.1, 128), new THREE.MeshBasicMaterial({ color: 0x35d8ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = -0.3; world.add(ring2);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(11.6, 11.8, 0.35, 96), new THREE.MeshStandardMaterial({ color: 0x0c1a2e, roughness: 0.4, metalness: 0.7 }));
  base.position.y = -0.68; world.add(base);
  const refl = bGroup.clone(true); refl.scale.y = -1; refl.position.y = -0.02; world.add(refl);

  const rt = mulberry32(11);
  const treeM = new THREE.MeshStandardMaterial({ color: 0x2fb47a, roughness: 0.7, emissive: 0x0b4a30, emissiveIntensity: 0.5 });
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 0), treeM, 48); const tm = new THREE.Matrix4(); let tn = 0;
  const free = (x: number, z: number) => !DEF.some((d) => Math.abs(x - d.x) < d.w / 2 + 0.7 && Math.abs(z - d.z) < d.d / 2 + 0.7);
  for (let i = 0; i < 400 && tn < 48; i++) {
    const a = rt() * 6.283, r = 3 + rt() * 6.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!free(x, z)) continue;
    const s = 0.7 + rt() * 0.9;
    tm.compose(new THREE.Vector3(x, 0.3 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.2, s)); trees.setMatrixAt(tn++, tm);
  }
  trees.count = tn; trees.castShadow = SHADOWS; world.add(trees);
  const lampM = new THREE.MeshBasicMaterial({ color: 0xaee9ff });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 8), lampM, 22);
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283; tm.compose(new THREE.Vector3(Math.cos(a) * 9.2, 0.55, Math.sin(a) * 9.2), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); lamps.setMatrixAt(i, tm); }
  world.add(lamps);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5), new THREE.MeshStandardMaterial({ color: 0x2a4466 }), 22);
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283; tm.compose(new THREE.Vector3(Math.cos(a) * 9.2, 0.27, Math.sin(a) * 9.2), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); posts.setMatrixAt(i, tm); }
  world.add(posts);

  const hemi = new THREE.HemisphereLight(0x9fd0ff, 0x061020, 0.5); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1); key.position.set(9, 16, 11); key.castShadow = SHADOWS;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  key.shadow.bias = -0.0006; key.shadow.radius = 3; scene.add(key);
  const rimL = new THREE.DirectionalLight(0x4fc3ff, 0.9); rimL.position.set(-10, 6, -12); scene.add(rimL);
  const pl = [new THREE.PointLight(0x35d8ff, 1.1, 16, 2), new THREE.PointLight(0x7a8cff, 0.8, 14, 2)];
  pl[0].position.set(-2, 1.5, 5); pl[1].position.set(5, 1.5, -1); pl.forEach((p) => scene.add(p));

  function applyTheme() {
    light = document.documentElement.classList.contains('light');
    scene.environment = ENV[String(light)];
    renderer.toneMappingExposure = light ? 0.9 : 1.15;
    winList.forEach((w) => { paintWin(w.cv, w.seed, light, w.cols, w.rows); w.wt.needsUpdate = true; });
    paintGround(light);
    coreList.forEach((c) => { c.base = light ? 0.28 : 1; });
    glassList.forEach((g) => { g.base = light ? 0.2 : 0.24; });
    edgeList.forEach((e: any) => e.color?.set(light ? 0x2fb4ff : 0xbfe8ff));
    slabList.forEach((s) => s.color.set(light ? 0x7fb8ee : 0x17314f));
    platM.opacity = light ? 0.78 : 0.84;
    hemi.color.set(light ? 0xffffff : 0x9fd0ff); hemi.groundColor.set(light ? 0xb8cde8 : 0x061020); hemi.intensity = light ? 0.55 : 0.5;
    key.intensity = light ? 1.25 : 0.85; rimL.intensity = light ? 0.3 : 0.9;
    pl.forEach((p) => { p.intensity = light ? 0.2 : 1; });
    (ring1.material as THREE.MeshBasicMaterial).color.set(light ? 0x1f8fe0 : 0x35d8ff);
    ring2.visible = !light;
    lampM.color.set(light ? 0x6fa4e8 : 0xaee9ff);
  }

  let hoverId: string | null = null, extHover = false, W = 1, H = 1, vis = false, raf = 0;
  let mx = 0, my = 0, tx = 0, ty = 0;
  let drag: { x: number; y: number; tx0: number; ty0: number; moved: number; mouse: boolean } | null = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3();

  function setHover(id: string | null, ext = false) {
    if (hoverId === id) return;
    hoverId = id; extHover = ext;
    view.classList.toggle('hover', !!id && !ext);
    opts.onHoverChange?.(id, ext);
  }
  function pick(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hit, false)[0];
    return h ? ((h.object.userData as any).cid as string) : null;
  }
  const onPointerMove = (e: PointerEvent) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (drag.moved > 5) { tx = clamp(drag.tx0 - dx * 0.24, -42, 42); if (drag.mouse) ty = clamp(drag.ty0 + dy * 0.12, -10, 16); setHover(null); }
      return;
    }
    setHover(pick(e), false);
  };
  const onPointerLeave = () => { if (!extHover && !drag) setHover(null); };
  const onPointerDown = (e: PointerEvent) => {
    if (e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, tx0: tx, ty0: ty, moved: 0, mouse: e.pointerType === 'mouse' };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag; drag = null; view.classList.remove('grab');
    if (d && d.moved < 6) { const id = pick(e); if (id) opts.onOpen?.(id); }
  };
  const onPointerCancel = () => { drag = null; view.classList.remove('grab'); };
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  let last = performance.now();
  function size() { W = view.clientWidth; H = view.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  function place() {
    const az = ((-30 + mx) * Math.PI) / 180, el = ((21 + my) * Math.PI) / 180;
    const D = Math.max(34, 25 / (0.4986 * camera.aspect)), ty0 = 4.2;
    camera.position.set(Math.sin(az) * Math.cos(el) * D, ty0 + Math.sin(el) * D, Math.cos(az) * Math.cos(el) * D);
    camera.lookAt(0, ty0 - 0.2, 0);
  }
  function render() {
    mx += (tx - mx) * 0.14; my += (ty - my) * 0.14;
    builds.forEach((b) => { const tgt = b.d.id === hoverId ? 1 : 0; b.hl += (tgt - b.hl) * 0.14; if (Math.abs(tgt - b.hl) < 0.002) b.hl = tgt; });
    builds.forEach((b) => {
      const gi = glassList.find((x) => x.m === b.glassM)!, ci = coreList.find((x) => x.m === b.coreM)!;
      b.glassM.opacity = gi.base + b.hl * 0.2; b.coreM.emissiveIntensity = ci.base * (1 + b.hl * 0.9); b.em.opacity = 0.5 + b.hl * 0.5;
    });
    place(); renderer.render(scene, camera);
    if (hoverId) {
      const b = builds.find((x) => x.d.id === hoverId)!;
      v3.copy(b.top); world.localToWorld(v3); v3.project(camera);
      opts.onTipPosition?.((v3.x * 0.5 + 0.5) * W, (-v3.y * 0.5 + 0.5) * H);
    }
  }
  let ema = 16, pr = Math.min(devicePixelRatio, 1.75), slow = 0;
  function adapt(raw: number) {
    ema = ema * 0.9 + raw * 0.1;
    if (ema > 42 && pr > 0.55) {
      if (++slow > 5) { slow = 0; pr = Math.max(0.55, pr * 0.75); renderer.setPixelRatio(pr); size(); ema = 16; }
    } else slow = 0;
  }
  function loop(now: number) {
    const raw = Math.min(500, now - last); last = now;
    adapt(raw); render();
    raf = vis ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (vis) return; vis = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { vis = false; cancelAnimationFrame(raf); }

  applyTheme(); size(); place();
  window.addEventListener('themechange', applyTheme);
  const ro = new ResizeObserver(() => { size(); if (!vis) render(); }); ro.observe(view);
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.02 });
  io.observe(view);
  const onContextLost = (e: Event) => { e.preventDefault(); stop(); };
  canvas.addEventListener('webglcontextlost', onContextLost);

  return {
    setHover: (id: string | null) => setHover(id, true),
    dispose() {
      stop();
      window.removeEventListener('themechange', applyTheme);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        if (o.material) { const mats = Array.isArray(o.material) ? o.material : [o.material]; mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); }); }
      });
      renderer.dispose();
    },
  };
}
