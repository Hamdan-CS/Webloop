import * as THREE from 'three';
import gsap from 'gsap';
import { IMG_W, IMG_H, REGIONS, viewRect, restView, focusView, imgToStage, stageToImg, hitRegion, type View } from './campusData';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tD, tL, tX, tA, tB;
uniform vec4 uRect;
uniform float uT, uTheme, uAmp;
uniform vec2 uM;
uniform vec3 uHA;
uniform vec2 uHB;
float nm(vec3 c){ return smoothstep(.52, .84, max(c.r, max(c.g, c.b))); }
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 tc(vec2 p){ return vec2(p.x, 1. - p.y); }
void main(){
  vec2 p = uRect.xy + uRect.zw * vec2(vUv.x, 1. - vUv.y);
  vec3 aux = texture2D(tX, tc(p)).rgb;
  vec2 q = p + uM * (aux.r - .4) * .012 * uAmp;
  q.x += sin(uT * 1.25 + q.y * 26. + q.x * 9.) * .0012 * aux.g * uAmp;
  q.y += sin(uT * 1.05 + q.x * 31.) * .0005 * aux.g * uAmp;
  q += vec2(sin(q.y * 260. + uT * 1.7), cos(q.x * 210. + uT * 1.3)) * .0008 * aux.b * uAmp;
  vec3 cd = texture2D(tD, tc(q)).rgb;
  vec3 cl = texture2D(tL, tc(q)).rgb;
  // theme blend: day -> night. Scene darkens first, then the lights (neon strips,
  // windows, lamps) switch on in a wave radiating from the water feature.
  float t = 1. - uTheme;                        // 0 = day, 1 = night
  float tb = smoothstep(0., .62, t);
  float n0 = nm(cd);
  vec3 darkBase = cd * (1. - .9 * n0);
  float s = clamp((t - .3) / .7, 0., 1.);
  float dl = .5 * distance(q * vec2(1.78, 1.), vec2(1.03, .72)) + .18 * h(floor(q * vec2(90., 50.)));
  float tl = smoothstep(dl, dl + .3, s * 1.45);
  vec3 c = mix(cl, darkBase, tb);
  c += cd * n0 * .9 * tl * step(.001, t);
  // soft bloom around lit pixels, night only
  vec3 hs = vec3(0.);
  for (int i = 0; i < 4; i++) {
    float a = 1.5708 * float(i) + .785;
    vec2 o1 = vec2(cos(a), sin(a)) * vec2(.0045, .008), o2 = o1 * 2.6;
    vec3 c1 = texture2D(tD, tc(q + o1)).rgb, c2 = texture2D(tD, tc(q + o2)).rgb;
    hs += c1 * nm(c1) + c2 * nm(c2) * .7;
  }
  c += hs * .075 * tl * tb;
  float lum = dot(cd, vec3(.299, .587, .114));
  float win = smoothstep(.62, .8, lum) * (1. - aux.g) * (1. - aux.b) * tl * tb;
  c += win * uAmp * (.03 + .028 * sin(uT * .7 + h(floor(q * vec2(160., 90.))) * 6.28)) * vec3(.4, .8, 1.);
  float sky = 1. - smoothstep(.0, .04, aux.r);
  c += sky * uAmp * .012 * sin(q.x * 9. + uT * .15) * (1. - uTheme * .5);

  vec3 mA = texture2D(tA, tc(p)).rgb;
  vec2 mB = texture2D(tB, tc(p)).rg;
  float wAny = max(max(max(uHA.x, uHA.y), max(uHA.z, uHB.x)), uHB.y);
  float hot = mA.r * uHA.x + mA.g * uHA.y + mA.b * uHA.z + mB.r * uHB.x + mB.g * uHB.y;
  float rim = 4. * (mA.r * (1. - mA.r) * uHA.x + mA.g * (1. - mA.g) * uHA.y + mA.b * (1. - mA.b) * uHA.z + mB.r * (1. - mB.r) * uHB.x + mB.g * (1. - mB.g) * uHB.y);
  float sel = clamp(hot / max(wAny, 1e-3), 0., 1.);
  c *= 1. - wAny * (1. - sel) * .30;
  c = mix(c, c * 1.12 + vec3(.01, .03, .05), hot * .6);
  vec3 rimC = mix(vec3(.13, .83, .93), vec3(.10, .42, .85), uTheme);
  c = mix(c, rimC, clamp(rim, 0., 1.) * .16);
  c += (h(gl_FragCoord.xy + fract(uT)) - .5) / 255.;
  gl_FragColor = vec4(c, 1.);
}`;

export interface PinLayout { x: number; y: number; on: boolean }

export interface CampusHandle {
  dispose(): void;
  focus(i: number): void;
  setHover(i: number): void;
  setTheme(light: boolean, animate?: boolean): void;
}

export interface CampusOpts {
  base: string;
  reduceMotion: boolean;
  light: boolean;
  stacked: () => boolean;
  onReady: () => void;
  onFail: () => void;
  onFrame: (pins: PinLayout[], view: View) => void;
  onHover: (i: number) => void;
  onFocus: (i: number) => void;
}

function maskTextures() {
  const mk = (cols: (string | null)[]) => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 180;
    const x = c.getContext('2d')!;
    x.fillStyle = '#000'; x.fillRect(0, 0, 320, 180);
    x.globalCompositeOperation = 'lighter';
    try { x.filter = 'blur(1px)'; } catch { /* older Safari */ }
    cols.forEach((col, i) => {
      if (!col) return;
      x.fillStyle = col; x.beginPath();
      REGIONS[i].poly.forEach(([px, py], k) => { const X = (px / IMG_W) * 320, Y = (py / IMG_H) * 180; k ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.closePath(); x.fill();
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  };
  // regions order: univ, comp, stud, team, proj
  return {
    A: mk(['rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)', null, null]),
    B: mk([null, null, null, 'rgb(255,0,0)', 'rgb(0,255,0)']),
  };
}

export function createCampusEngine(canvas: HTMLCanvasElement, stage: HTMLElement, o: CampusOpts): CampusHandle {
  const RM = o.reduceMotion;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch {
    o.onFail();
    return { dispose() {}, focus() {}, setHover() {}, setTheme() {} };
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const loader = new THREE.TextureLoader();
  const load = (f: string) => new Promise<THREE.Texture>((res, rej) => loader.load(o.base + f, (t) => {
    t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.anisotropy = 1; res(t);
  }, undefined, rej));

  let disposed = false, ready = false, dirty = true, visible = true, raf = 0;
  let W = 1, H = 1;
  const masks = maskTextures();
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  let mat: THREE.ShaderMaterial | null = null;

  const view: View = { z: 1.1, cx: 0.5, cy: 0.5 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const hov = [0, 0, 0, 0, 0]; // by region idx
  const hovT = [0, 0, 0, 0, 0];
  let hoverIdx = -1, focusIdx = -1;
  const st = { theme: o.light ? 1 : 0, amp: RM ? 0 : 0 };
  let themeTween: gsap.core.Tween | null = null;
  let viewTween: gsap.core.Tween | null = null;
  let tNow = 0, last = performance.now();

  const resize = () => {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    if (focusIdx < 0) { const rv = restView(W, H, o.stacked()); view.cx = rv.cx; view.cy = rv.cy; }
    else Object.assign(view, focusView(W, H, REGIONS[focusIdx], o.stacked()));
    dirty = true;
  };

  const setView = (target: View, dur: number) => {
    viewTween?.kill();
    if (RM || dur <= 0) { Object.assign(view, target); dirty = true; return; }
    viewTween = gsap.to(view, { ...target, duration: dur, ease: 'power3.inOut', onUpdate: () => { dirty = true; } });
  };

  const hit = (cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return -1;
    const [u, v] = stageToImg(W, H, view, x, y);
    return hitRegion(u, v);
  };

  const setHoverIdx = (i: number) => {
    if (i === hoverIdx) return;
    hoverIdx = i; hovT.fill(0);
    if (i >= 0) hovT[i] = 1;
    o.onHover(i); dirty = true;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    const tgt = e.target as HTMLElement;
    if (tgt.closest?.('.eco-pin')) return; // pins drive their own hover
    const i = hit(e.clientX, e.clientY);
    canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
    if (focusIdx < 0 || i === focusIdx || i < 0) setHoverIdx(focusIdx >= 0 ? focusIdx : i);
  };
  const onLeave = () => { mouse.tx = mouse.ty = 0; if (focusIdx < 0) setHoverIdx(-1); };
  const onClick = (e: MouseEvent) => {
    const i = hit(e.clientX, e.clientY);
    if (i >= 0 && i !== focusIdx) handle.focus(i);
    else if (i < 0 && focusIdx >= 0) handle.focus(-1);
  };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);

  const ro = new ResizeObserver(resize); ro.observe(stage);
  const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting ?? true; if (visible) { last = performance.now(); dirty = true; } }, { threshold: 0 });
  io.observe(stage);

  const pins: PinLayout[] = REGIONS.map(() => ({ x: 0, y: 0, on: false }));
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!ready || disposed || document.hidden || !visible) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!RM) {
      tNow += dt;
      const km = 1 - Math.exp(-dt * 4);
      mouse.x += (mouse.tx - mouse.x) * km; mouse.y += (mouse.ty - mouse.y) * km;
    }
    const kh = 1 - Math.exp(-dt * 9);
    for (let i = 0; i < 5; i++) { const d = hovT[i] - hov[i]; hov[i] += RM ? d : d * kh; if (Math.abs(d) > 0.002) dirty = true; }
    if (!RM || dirty) {
      const u = mat!.uniforms;
      u.uRect.value.set(...viewRect(W, H, view));
      u.uT.value = RM ? 0 : tNow; u.uTheme.value = st.theme; u.uAmp.value = st.amp;
      u.uM.value.set(mouse.x, mouse.y);
      u.uHA.value.set(hov[0], hov[1], hov[2]); u.uHB.value.set(hov[3], hov[4]);
      renderer.render(scene, cam);
      REGIONS.forEach((r, i) => {
        const dx = -mouse.x * (r.depth - 0.4) * 0.012 * IMG_W, dy = -mouse.y * (r.depth - 0.4) * 0.012 * IMG_H;
        const [x, y] = imgToStage(W, H, view, r.anchor[0] + dx, r.anchor[1] + dy);
        pins[i].x = x; pins[i].y = y; pins[i].on = hov[i] > 0.5 && focusIdx < 0;
      });
      o.onFrame(pins, view);
      dirty = false;
    }
  };

  Promise.all([load('campus-dark.webp'), load('campus-light.webp'), load('campus-aux.png')]).then(([d, l, x]) => {
    if (disposed) { d.dispose(); l.dispose(); x.dispose(); return; }
    mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tD: { value: d }, tL: { value: l }, tX: { value: x }, tA: { value: masks.A }, tB: { value: masks.B },
        uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uT: { value: 0 }, uTheme: { value: st.theme }, uAmp: { value: 0 },
        uM: { value: new THREE.Vector2() }, uHA: { value: new THREE.Vector3() }, uHB: { value: new THREE.Vector2() },
      },
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    ready = true; last = performance.now(); resize();
    // intro: gentle push-in + ambient motion ramps up
    if (RM) { view.z = restView(W, H, o.stacked()).z; st.amp = 0; }
    else {
      const rz = restView(W, H, o.stacked()).z;
      view.z = rz * 1.1;
      gsap.to(view, { z: rz, duration: 2.2, ease: 'power3.out', onUpdate: () => { dirty = true; } });
      gsap.to(st, { amp: 1, duration: 2.5, ease: 'power2.out' });
    }
    dirty = true; o.onReady();
  }).catch(() => { if (!disposed) o.onFail(); });

  raf = requestAnimationFrame(frame);

  const handle: CampusHandle = {
    focus(i) {
      focusIdx = i; o.onFocus(i);
      if (i >= 0) { setHoverIdx(i); setView(focusView(W, H, REGIONS[i], o.stacked()), 1.1); }
      else { setHoverIdx(-1); setView(restView(W, H, o.stacked()), 1.0); }
    },
    setHover(i) { if (focusIdx < 0) setHoverIdx(i); },
    setTheme(light, animate = true) {
      const to = light ? 1 : 0;
      themeTween?.kill();
      if (!animate || RM) { st.theme = to; dirty = true; return; }
      const t0 = performance.now(), from = st.theme;
      // wall-clock based so it never stalls on slow GPUs
      themeTween = gsap.to({}, { duration: 1.9, ease: 'none', onUpdate() {
        const k = Math.min(1, (performance.now() - t0) / 1900), e = k;
        st.theme = from + (to - from) * e; dirty = true;
      }, onComplete() { st.theme = to; dirty = true; } });
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      viewTween?.kill(); themeTween?.kill(); gsap.killTweensOf(view); gsap.killTweensOf(st);
      stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('click', onClick);
      ro.disconnect(); io.disconnect();
      if (mat) { Object.values(mat.uniforms).forEach((u) => (u.value as { dispose?: () => void })?.dispose?.()); mat.dispose(); }
      masks.A.dispose(); masks.B.dispose(); renderer.dispose();
    },
  };
  if (import.meta.env.DEV) gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) (window as unknown as { __campus?: CampusHandle }).__campus = handle;
  return handle;
}
