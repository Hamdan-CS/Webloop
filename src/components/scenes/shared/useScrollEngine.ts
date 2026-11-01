// @ts-nocheck
/* Shared scroll-driven Three.js engine wiring for scenes A/B/C/D/E.
 * One GSAP ScrollTrigger scrub drives a single progress value p (0..1) that
 * each engine's apply(p) turns into object transforms — a pure function of
 * scroll position, so it scrubs correctly forwards and backwards.
 *
 * Perf rules (do not regress):
 * - Scroll progress never touches React state. It lives in a ref and is
 *   broadcast to subscribers (PinnedScene's meter/steps) synchronously from
 *   the same ScrollTrigger onUpdate callback — no re-render per scroll tick.
 * - A scene's WebGL renderer/context is created only once it is actually on
 *   screen, and fully DISPOSED (not just paused) once it scrolls back out —
 *   not "pause rendering", literal context teardown. With five scroll scenes
 *   plus the page's own persistent particle canvas, letting every visited
 *   scene's context live forever runs into the browser's per-page WebGL
 *   context limit; Three.js doesn't fail soft when a new context is refused,
 *   it throws. Disposing off-screen scenes keeps the live count near 1-2
 *   regardless of how far the visitor has scrolled. Re-entering just rebuilds
 *   and calls apply(p) once — apply is a pure function of progress, so the
 *   scene snaps back to the exact right frame with no visible seam.
 * - DPR is capped (1.5 desktop / 1.25 mobile) — the other big fill-rate lever.
 * - ScrollTrigger.refresh() on resize is debounced, not called on every
 *   ResizeObserver callback. */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supportsWebGL, prefersReducedMotion } from '@/components/contributions/webgl';
import { readSceneTheme } from './canvasPanel';

let pluginRegistered = false;
function ensureGSAP() {
  if (!pluginRegistered) { gsap.registerPlugin(ScrollTrigger); pluginRegistered = true; }
}

export interface SceneCam { tx: number; ty: number; tz: number; zoom: number; az: number; el: number }

export interface SceneEngine {
  need: { w: number; h: number };
  cam: SceneCam;
  apply(p: number): void;
  tick?: (t: number, dt: number) => void;
  resize?: (w: number, h: number) => void;
  setDark?: (dark: boolean) => void;
  pickables?: THREE.Object3D[];
  onHover?: (hit: THREE.Intersection | null, ev: PointerEvent) => void;
  onClick?: (hit: THREE.Intersection | null) => void;
  dispose: () => void;
}

export interface EngineFactoryArgs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  isMobile: boolean;
  reduce: boolean;
}

export type EngineFactory = (args: EngineFactoryArgs) => SceneEngine;
export type ProgressListener = (p: number) => void;

export function useScrollEngine<E extends SceneEngine = SceneEngine>(factory: EngineFactory, lengthVh: number) {
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<E | null>(null);
  const progressRef = useRef(0);
  const listenersRef = useRef<Set<ProgressListener>>(new Set());
  const [visible, setVisible] = useState(false);
  const [supported, setSupported] = useState(true);
  const reduce = useRef(false);

  const subscribeProgress = useCallback((fn: ProgressListener) => {
    listenersRef.current.add(fn);
    fn(progressRef.current);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  useEffect(() => {
    reduce.current = prefersReducedMotion();
    const ok = supportsWebGL();
    setSupported(ok);
    if (!ok) return;

    ensureGSAP();
    const outer = outerRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!outer || !stage || !canvas) return;

    let raf = 0, engine: SceneEngine | null = null, renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null, camera: THREE.PerspectiveCamera | null = null;
    let base = 1, last = 0, p = 0, onScreen = false, resizeTimer = 0, lastRetry = 0;
    const isMobile = innerWidth < 760;
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

    const resize = () => {
      if (!engine || !renderer || !camera) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const t = Math.tan((camera.fov * Math.PI) / 360);
      // generous padding (1.32x) so zoomed-in moments never crop against the
      // camera's fitted frustum, at any aspect ratio (desktop/tablet/mobile)
      base = Math.max(engine.need.h / (2 * t), engine.need.w / (2 * t * camera.aspect)) * 1.32;
      engine.resize?.(w, h);
    };

    const init = () => {
      if (engine) return;
      let ctx: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        ctx = renderer.getContext();
      } catch {
        renderer = null;
      }
      if (!renderer || !ctx) {
        // the browser refused another WebGL context (too many live at once) —
        // fail soft, keep the DOM fallback showing, retry next time it's visible
        renderer = null;
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.25 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      const root = new THREE.Group(); scene.add(root);
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 6, 8); scene.add(key);
      const rim = new THREE.PointLight(0x22d3ee, 40, 0, 2); rim.position.set(-6, 2, 5); scene.add(rim);
      engine = factory({ renderer, scene, camera, root, isMobile, reduce: reduce.current });
      engineRef.current = engine as E;
      resize();
      engine.setDark?.(document.documentElement.classList.contains('dark'));
      engine.apply(p);
      last = performance.now();
    };

    const teardown = () => {
      if (!engine) return;
      engine.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      engine = null; renderer = null; scene = null; camera = null;
      engineRef.current = null;
    };

    const onThemeChange = () => engine?.setDark?.(document.documentElement.classList.contains('dark'));
    window.addEventListener('themechange', onThemeChange);

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      setVisible(onScreen);
      if (onScreen) init();
      else teardown();
    }, { threshold: 0, rootMargin: '20% 0px' });
    io.observe(outer);

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { resize(); ScrollTrigger.refresh(); }, 120);
    });
    ro.observe(stage);

    const st = ScrollTrigger.create({
      trigger: outer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        p = self.progress;
        progressRef.current = p;
        if (onScreen) {
          // self-healing: if a previous init() lost the race for a WebGL
          // context (too many live at once, a transient browser limit),
          // onScreen stays true but nothing ever retries — the scene would
          // sit blank forever. Retrying on every scroll tick while visible
          // means it recovers as soon as a context frees up, with no visible
          // seam once it does (apply(p) immediately paints the right frame).
          if (!engine && performance.now() - lastRetry > 400) { lastRetry = performance.now(); init(); }
          engine?.apply(p);
        }
        listenersRef.current.forEach((fn) => fn(p));
      },
    });

    const onPointerMove = (e: PointerEvent) => {
      if (!onScreen || !engine?.pickables?.length || !camera) return;
      const r = canvas.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(engine.pickables, false);
      engine.onHover?.(hits[0] ?? null, e);
    };
    const onClick = (e: PointerEvent) => {
      if (!onScreen || !engine?.pickables?.length || !camera) return;
      const r = canvas.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(engine.pickables, false);
      engine.onClick?.(hits[0] ?? null);
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // belt-and-suspenders retry: covers the case where init() failed and
      // the user has stopped scrolling (no further onUpdate ticks to retry from)
      if (onScreen && !engine && now - lastRetry > 500) { lastRetry = now; init(); }
      // the single biggest win: a scene that isn't on screen does no work at all
      if (!onScreen || !engine || !renderer || !scene || !camera || document.hidden) return;
      const t = now / 1000, dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      engine.tick?.(t, dt);
      const m = engine.cam, d = base * m.zoom, cp = Math.cos(m.el);
      camera.position.set(m.tx + Math.sin(m.az) * cp * d, m.ty + Math.sin(m.el) * d, m.tz + Math.cos(m.az) * cp * d);
      camera.lookAt(m.tx, m.ty, m.tz);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect(); ro.disconnect();
      st.kill();
      window.removeEventListener('themechange', onThemeChange);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { outerRef, stageRef, canvasRef, engineRef, subscribeProgress, visible, supported, lengthVh };
}

export { readSceneTheme };
