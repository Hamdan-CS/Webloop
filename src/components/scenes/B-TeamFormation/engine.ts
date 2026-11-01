// @ts-nocheck
/* Scene B — Team Formation: seven profile cards start scattered, then turn
 * toward a shared project core, connect, and settle into a coordinated
 * formation as the user scrolls. Hovering (or focusing) a card shows its
 * skills; apply(p) is a pure function of scroll progress so it scrubs
 * cleanly in both directions. */
import * as THREE from 'three';
import { makePanel, plane, glowSprite, avatar, txt, chip, fillRR } from '../shared/canvasPanel';
import type { EngineFactoryArgs, SceneCam, SceneEngine } from '../shared/useScrollEngine';
import type { ShowcaseMember } from '../shared/demoData';

const DARK = '#111827';
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

const S0: [number, number, number][] = [[-4.3, 1.4, -1.1], [4.5, -0.5, -0.5], [-3.2, -2.6, 1.2], [3.3, 2.5, -1.4], [1.3, -3.2, 1.6], [-1.5, 3.0, -0.7], [-4.6, -0.6, 0.9]];
const S1: [number, number, number][] = [[-3.3, -0.35, 0.6], [3.3, -0.35, 0.6], [-2.7, 1.95, 0.6], [2.7, 1.95, 0.6], [1.8, -2.6, 0.6], [0, 3.05, 0.6], [-1.8, -2.6, 0.6]];
const R0 = [[0.1, 0.55, 0], [-0.05, -0.6, 0.05], [0.1, 0.35, -0.05], [-0.1, -0.5, 0.05], [0.05, 0.4, 0.04], [0.1, -0.35, -0.05], [-0.05, 0.5, 0.05]];
const SKILLS_FALLBACK = [['React', 'CSS', 'TS'], ['Node', 'SQL', 'API'], ['Figma', 'UX', 'Research'], ['Python', 'ML', 'Data'], ['Docker', 'CI/CD', 'AWS'], ['UX', 'Strategy', 'Product'], ['Testing', 'QA']];

export interface TeamEngine extends SceneEngine {
  setMembers(list: ShowcaseMember[]): void;
  onHoverChange?: (i: number, x: number, y: number) => void;
}

export function createTeamEngine({ root, reduce }: EngineFactoryArgs): TeamEngine {
  let members: ShowcaseMember[] = [];
  const cards: THREE.Group[] = [];
  const cardsGroup = new THREE.Group(); root.add(cardsGroup);

  function buildCards(list: ShowcaseMember[]) {
    cards.forEach((c) => { cardsGroup.remove(c); c.traverse((o: any) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); });
    cards.length = 0;
    list.forEach((m, i) => {
      const skills = SKILLS_FALLBACK[i % SKILLS_FALLBACK.length];
      const p = makePanel(1.6, 2.15, (g, w, h) => {
        g.fillStyle = '#f7f9fb'; g.fillRect(0, 0, w, h); avatar(g, 500, 290, 150, m.initials, m.cols);
        txt(g, m.name, 500, 580, 92, DARK, 700, 'center'); txt(g, m.role, 500, 658, 46, '#6e6e73', 500, 'center');
        g.fillStyle = '#e5e9ee'; g.fillRect(130, 718, 740, 3);
        skills.forEach((sk, k) => { g.font = '600 42px sans-serif'; const w2 = g.measureText(sk).width + 46; fillRR(g, 500 - w2 / 2, 772 + k * 96, w2, 72, 36, '#e0f2fe'); txt(g, sk, 500, 820 + k * 96, 44, '#075985', 600, 'center'); });
      }, { r: 0.08, edge: 0.4, scale: 320 });
      (p as any).userData.idx = i;
      (p as any).userData.skills = skills;
      p.position.set(...S0[i % S0.length]); p.rotation.set(R0[i % R0.length][2], R0[i % R0.length][0] * 1.6, 0);
      cardsGroup.add(p); cards.push(p);
      (p as any).userData.chips = skills.map((sk, k) => { const ch = chip(sk); ch.position.set(0, -0.95 - k * 0.2, 0.05); ch.scale.setScalar(0.0001); p.add(ch); return ch; });
    });
  }

  const core = new THREE.Group(); root.add(core);
  const coreMat = new THREE.MeshPhysicalMaterial({ color: 0x0e7490, metalness: 0.55, roughness: 0.22, clearcoat: 1, emissive: 0x22d3ee, emissiveIntensity: 0.12, flatShading: true });
  const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), coreMat); core.add(ico);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.12, 1)), new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.35 })); core.add(wire);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 })); core.add(ring);
  const halo = glowSprite('#22d3ee', 4.6, 0); core.add(halo);
  const tag = plane(1.9, 0.3, (g, w, h) => { txt(g, 'PROJECT · OPEN TEAM', w / 2, h / 2 + 16, 46, '#cffafe', 700, 'center'); }); tag.position.set(0, -1.55, 0); core.add(tag);

  const sym: THREE.Group[] = [];
  ['</>', '{ }', 'SQL', 'Py', 'TS', 'Fig', '>_', 'AI'].forEach((s, i) => {
    const m = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 32).rotateX(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.3, clearcoat: 1 })); m.add(d);
    const f = plane(0.4, 0.4, (g, w, h) => { txt(g, s, w / 2, h / 2 + 30, s.length > 2 ? 190 : 270, '#67e8f9', 700, 'center'); }); f.position.z = 0.03; m.add(f);
    (m as any).userData = { a: (i / 8) * 6.283, r: 3.6 + (i % 3) * 0.6, y: (((i * 37) % 7) - 3) * 0.7, z: (((i * 17) % 5) - 2) * 0.5 };
    root.add(m); sym.push(m);
  });

  const lines: THREE.Line[] = []; const lineDraw: number[] = []; const lineKind: { kind: string; a: number; b: number }[] = [];
  function mkLine(kind: string, a: number, b: number) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false; root.add(l); lines.push(l); lineKind.push({ kind, a, b }); lineDraw.push(0);
  }
  function buildLines(n: number) {
    lines.forEach((l) => { root.remove(l); l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
    lines.length = 0; lineKind.length = 0; lineDraw.length = 0;
    for (let i = 0; i < n; i++) mkLine('core', i, -1);
    if (n >= 7) [[0, 2], [1, 3], [4, 6]].forEach(([a, b]) => mkLine('pair', a, b));
  }

  let hover = -1, form = 0, lit = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const cam: SceneCam = { tx: -2.6, ty: 0, tz: 0, zoom: 0.82, az: 0, el: 0.1 };
  let onHoverChange: ((i: number, x: number, y: number) => void) | undefined;

  function apply(p: number) {
    const turn = seg(p, 0.3, 0.45), formK = seg(p, 0.58, 0.85), litK = seg(p, 0.82, 0.95);
    form = formK; lit = litK;
    cam.tx = mix(-2.6, 2.6, seg(p, 0, 0.28)) * (1 - seg(p, 0.3, 0.46));
    cam.ty = 0; cam.tz = 0;
    cam.az = Math.sin(p * 5) * 0.05; cam.el = 0.1 - 0.05 * formK;
    // zoom IN as the team forms (lower = closer = bigger), not back out — the
    // formed team occupies far less space than the scattered opening beat
    cam.zoom = clamp(0.84 - 0.32 * seg(p, 0.28, 0.88), 0.46, 1.3);
    cards.forEach((card, i) => {
      const n = cards.length, s0 = S0[i % S0.length], s1 = S1[i % S1.length];
      const f = seg(p, 0.58 + i * (0.012 * 7) / n, 0.85 - (n - i) * (0.008 * 7) / n);
      card.position.set(mix(s0[0], s1[0], f), mix(s0[1], s1[1], f), mix(s0[2], s1[2], f));
      const r0y = ((card as any).userData.r0y ??= card.rotation.y), r0x = ((card as any).userData.r0x ??= card.rotation.x);
      const toward = Math.atan2(-s0[0], 9) * 0.55 * turn;
      card.rotation.y = r0y * (1 - turn) + toward * (1 - f);
      card.rotation.x = r0x * (1 - turn);
      card.rotation.z = Math.sin(i * 2.1) * 0.06 * (1 - turn);
      const em = seg(p, 0.08 + i * 0.018, 0.22 + i * 0.018);
      (card as any).userData.chips.forEach((ch: any) => { const ss = em * (hover === i ? 1.15 : 1); ch.scale.setScalar(Math.max(0.0001, ss)); ch.material.opacity = em; });
    });
    lines.forEach((l, i) => {
      lineDraw[i] = i < 7 ? seg(p, 0.42 + i * 0.022, 0.6 + i * 0.01) : seg(p, 0.5 + (i - 7) * 0.04, 0.72);
      (l.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.4 * litK + (hover >= 0 ? 0.1 : 0);
    });
    coreMat.emissiveIntensity = 0.12 + 1.5 * litK;
    (halo.material as THREE.SpriteMaterial).opacity = 0.8 * litK;
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * litK * (0.7 + 0.3 * Math.sin(p * 40));
    core.scale.setScalar(0.82 + 0.18 * litK + 0.1 * Math.sin(litK * Math.PI));
    ico.rotation.y = p * 3;
  }

  function tick(t: number) {
    const spin = reduce ? 0 : t;
    core.rotation.y = spin * 0.25; wire.rotation.x = spin * 0.12; ring.rotation.x = Math.PI / 2 + Math.sin(spin * 0.4) * 0.2; ring.rotation.z = spin * 0.3;
    sym.forEach((m, i) => {
      const u = (m as any).userData, k = 1 - 0.35 * form, a = u.a + spin * 0.08;
      m.position.set(Math.cos(a) * u.r * k, u.y + (reduce ? 0 : Math.sin(spin * 0.7 + i) * 0.22), Math.sin(a) * u.r * 0.5 - 1.2);
    });
    cards.forEach((card, i) => {
      const hv = hover === i, ts = hv ? 1.09 : 1;
      card.scale.x += (ts - card.scale.x) * 0.15; card.scale.y = card.scale.x; card.scale.z = card.scale.x;
      const em = (card as any).userData.edgeMat; em.opacity += ((hv ? 1 : 0.35 + 0.3 * lit) - em.opacity) * 0.15;
    });
    lines.forEach((l, k) => {
      const u = lineKind[k], pos = l.geometry.attributes.position as THREE.BufferAttribute;
      const A = cards[u.a]?.position, Bp = u.kind === 'core' ? core.position : cards[u.b]?.position;
      if (!A || !Bp) return;
      v1.set(A.x, A.y, A.z); v2.set(Bp.x, Bp.y, Bp.z); v3.copy(v1).add(v2).multiplyScalar(0.5); v3.y += u.kind === 'core' ? 0.9 : -0.7; v3.z += 1;
      for (let i = 0; i < 40; i++) { const s = i / 39, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s; pos.setXYZ(i, a * v1.x + b * v3.x + d * v2.x, a * v1.y + b * v3.y + d * v2.y, a * v1.z + b * v3.z + d * v2.z); }
      pos.needsUpdate = true; l.geometry.setDrawRange(0, Math.max(0, Math.round(40 * lineDraw[k])));
    });
  }

  const engine: TeamEngine = {
    need: { w: 13.5, h: 9 },
    cam,
    apply,
    tick,
    setDark() {},
    get pickables() { return cards.map((c) => (c as any).userData.pick); },
    onHover(hit, ev) {
      const i = hit ? (hit.object.parent as any).userData.idx : -1;
      hover = i;
      onHoverChange?.(i, ev.clientX, ev.clientY);
    },
    setMembers(list) {
      members = list;
      buildCards(list);
      buildLines(list.length);
    },
    set onHoverChange(fn) { onHoverChange = fn; },
    get onHoverChange() { return onHoverChange; },
    dispose() {
      [...cards, ...lines, ...sym, core, tag, halo, ring, wire, ico].forEach((o: any) => {
        o.traverse?.((n: any) => { n.geometry?.dispose?.(); if (n.material) { const mats = Array.isArray(n.material) ? n.material : [n.material]; mats.forEach((m: any) => { m.map?.dispose?.(); m.dispose?.(); }); } });
        o.geometry?.dispose?.(); o.material?.dispose?.();
      });
    },
  };
  void members;
  return engine;
}
