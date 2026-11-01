// @ts-nocheck
/* Shared canvas-texture "UI panel" helpers for the scroll scenes (A/B/C/E).
 * A panel is a thin extruded slab with a 2D-canvas-drawn face texture plus a
 * glowing edge line — the same technique the home page's ParticleStage and
 * the HowItWorks engine already use for crisp, cheap-to-render in-scene UI.
 * Kept framework-agnostic (plain three.js) so every scene engine can share it. */
import * as THREE from 'three';

export const FONT = '"Space Grotesk",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif';

export function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function fillRR(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  rr(g, x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
export function txt(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#1d1d1f', weight: number | string = 500, align: CanvasTextAlign = 'left') {
  g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
}
export function pill(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, bg: string, fg: string, padX = 18, h = 0) {
  g.font = `600 ${size}px ${FONT}`;
  const w = g.measureText(s).width + padX * 2; h = h || size * 1.9;
  fillRR(g, x, y, w, h, h / 2, bg);
  txt(g, s, x + padX, y + h / 2 + size * 0.34, size, fg, 600);
  return w;
}
export function lg(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: string[]) {
  const k = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => k.addColorStop(i / (stops.length - 1), c));
  return k;
}
export function avatar(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, initials: string, c: string[]) {
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = lg(g, cx - r, cy - r, cx + r, cy + r, c); g.fill();
  txt(g, initials, cx, cy + r * 0.3, r * 0.8, '#fff', 700, 'center');
}

function roundedShape(THREE_: typeof THREE, w: number, h: number, r: number) {
  const s = new THREE_.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export interface PanelOptions {
  t?: number; r?: number; scale?: number; color?: number; edge?: number; edgeColor?: number;
  state?: Record<string, unknown>;
}

/** A thin glass-like slab with a canvas-drawn UI on its face and a glowing edge line. */
export function makePanel(
  w: number, h: number,
  drawFn: (g: CanvasRenderingContext2D, w: number, h: number, state: Record<string, unknown>) => void,
  o: PanelOptions = {},
) {
  const t = o.t ?? 0.06, r = o.r ?? 0.09, scale = o.scale ?? 300;
  const g = new THREE.Group();
  const sh = roundedShape(THREE, w, h, r);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 8 });
  geo.translate(0, 0, -t / 2);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0xeef3f7, roughness: 0.3, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
  const body = new THREE.Mesh(geo, bodyMat); g.add(body);

  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const cx = cv.getContext('2d')!;
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const state: Record<string, unknown> = { ...(o.state ?? {}) };
  const redraw = (s?: Record<string, unknown>) => {
    if (s) Object.assign(state, s);
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    const k = cv.width / 1000; cx.setTransform(k, 0, 0, k, 0, 0);
    const H = (1000 * h) / w;
    cx.save(); rr(cx, 0, 0, 1000, H, (r / w) * 1000); cx.clip();
    drawFn(cx, 1000, H, state); cx.restore();
    texture.needsUpdate = true;
  };
  redraw();
  const faceMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, alphaTest: 0.02 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = t / 2 + 0.0125; g.add(face);

  const pts = sh.getPoints(18).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const edgeMat = new THREE.LineBasicMaterial({ color: o.edgeColor ?? 0x22d3ee, transparent: true, opacity: o.edge ?? 0.45 });
  const edgeF = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), edgeMat); edgeF.position.z = t / 2 + 0.0135; g.add(edgeF);
  const edgeB = new THREE.LineLoop(edgeF.geometry, edgeMat); edgeB.position.z = -t / 2 - 0.0135; g.add(edgeB);

  (g as any).userData = { w, h, t, redraw, texture, faceMat, bodyMat, edgeMat, face, pick: face };
  return g;
}

/** Free-floating textured plane (labels, badges, chips). */
export function plane(
  w: number, h: number,
  drawFn: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  o: { scale?: number; opacity?: number } = {},
) {
  const scale = o.scale ?? 300;
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const cx = cv.getContext('2d')!;
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const redraw = () => {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    const k = cv.width / 1000; cx.setTransform(k, 0, 0, k, 0, 0);
    drawFn(cx, 1000, (1000 * h) / w);
    texture.needsUpdate = true;
  };
  redraw();
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: o.opacity ?? 1 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  (m as any).userData = { redraw, texture, mat };
  return m;
}

export function glowSprite(color: string, size: number, opacity = 0.8) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d')!;
  const k = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  k.addColorStop(0, color); k.addColorStop(0.35, color + '66'); k.addColorStop(1, color + '00');
  g.fillStyle = k; g.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(size, size, 1);
  return s;
}

export function contactShadow(size: number) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  const k = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  k.addColorStop(0, 'rgba(0,0,0,.55)'); k.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = k; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.35 }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function chip(label: string, o: { bg?: string; fg?: string; stroke?: string; w?: number } = {}) {
  const w = o.w ?? Math.max(0.42, label.length * 0.062 + 0.22), h = 0.17;
  return plane(w, h, (g, W, H) => {
    fillRR(g, 0, 0, W, H, H / 2, o.bg || 'rgba(17,24,39,.88)', o.stroke || 'rgba(34,211,238,.7)', 3);
    txt(g, label, W / 2, H / 2 + 14, 40, o.fg || '#e6fbff', 600, 'center');
  }, { scale: 260 });
}

/** Theme colors read once per apply from the page's own CSS variables, so every
 *  scene matches the live `--hr-*` tokens and flips with light/dark instantly. */
export function readSceneTheme(el: Element) {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => (cs.getPropertyValue(name) || '').trim() || fallback;
  const isDark = document.documentElement.classList.contains('dark');
  return {
    isDark,
    bg: v('--hr-bg', isDark ? '#050a0c' : '#f1f5f4'),
    ink: v('--hr-ink', isDark ? '#eef5f4' : '#0d1a19'),
    muted: v('--hr-muted', isDark ? '#8fa4a1' : '#5a726e'),
    line: v('--hr-line', isDark ? '#1b2a2c' : '#d3dfdc'),
    accent: v('--hr-accent', isDark ? '#3ddbc4' : '#0f7d70'),
    accentInk: v('--hr-accent-ink', isDark ? '#04201c' : '#fff'),
    card: v('--hr-card', isDark ? '#0a1214' : '#f8fbfa'),
    chip: v('--hr-chip', isDark ? '#0a1214cc' : '#ffffffcc'),
  };
}
