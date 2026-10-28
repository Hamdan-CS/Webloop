import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildColumns } from './grid-layout';
import { ratingSteps, tileGrey, colorForRating, bgColor } from './palette';
import type { DayCell } from './types';

// Keep hex/rgb colours exactly as authored, matching the app's other three.js stage.
THREE.ColorManagement.enabled = false;

const GAP = 1.15;
const BASE_H = 0.1;
const MAX_HEIGHT = 2.4;
const MAX_POINTS = 6;
const CLICK_DRAG_THRESHOLD = 6;
const LIFT = 0.22;

export interface EngineCallbacks {
  onHover: (cell: DayCell | null, clientX: number, clientY: number) => void;
  onSelect: (cell: DayCell) => void;
  onDeselectGround: () => void;
  onFocusChange: (cell: DayCell | null) => void;
}

export interface EngineHandle {
  setCells(cells: DayCell[]): void;
  setSelected(date: string | null): void;
  moveFocus(dCol: number, dRow: number): void;
  activateFocus(): void;
  dispose(): void;
}

function heightFor(points: number): number {
  if (points <= 0) return BASE_H;
  return BASE_H + (Math.min(points, MAX_POINTS) / MAX_POINTS) * MAX_HEIGHT;
}

export function createContributionScene(container: HTMLElement, cb: EngineCallbacks): EngineHandle {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a8, 0.85));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(-10, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 20, bottom: -20, far: 70 });
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 60), new THREE.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -0.01;
  scene.add(ground);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduce;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // never dip under the ground
  controls.minDistance = 5;
  controls.maxDistance = 46;
  controls.target.set(0, 0.6, 0);

  const boxGeo = new THREE.BoxGeometry(0.9, 1, 0.9);
  boxGeo.translate(0, 0.5, 0);
  const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

  const hoverMarker = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, fog: false }));
  hoverMarker.visible = false;
  scene.add(hoverMarker);

  const selectMarker = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, fog: false }));
  selectMarker.visible = false;
  scene.add(selectMarker);

  const focusRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 32),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false }),
  );
  focusRing.rotation.x = -Math.PI / 2;
  focusRing.visible = false;
  scene.add(focusRing);

  let mesh: THREE.InstancedMesh | null = null;
  let columns: DayCell[][] = [];
  let slots: (DayCell | null)[] = [];
  let positions: { x: number; z: number; h: number }[] = [];
  let hoveredIdx = -1;
  let selectedIdx = -1;
  let liftedIdx = -1;
  let focusedIdx = -1;
  let colsCount = 0;

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  function applyPalette() {
    scene.background = null;
    scene.fog = new THREE.Fog(new THREE.Color(bgColor()), 18, 58);
    if (!mesh) return;
    const steps = ratingSteps();
    const grey = tileGrey();
    for (let i = 0; i < slots.length; i++) {
      const cell = slots[i];
      tmpColor.set(cell ? colorForRating(cell.avgRating, steps, grey) : grey);
      mesh.setColorAt(i, tmpColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  const onThemeChange = () => applyPalette();
  window.addEventListener('themechange', onThemeChange);

  function slotIndex(col: number, row: number): number {
    return col * 7 + row;
  }

  function setInstanceTransform(i: number, lift: boolean) {
    if (!mesh) return;
    const p = positions[i];
    dummy.position.set(p.x, lift ? LIFT : 0, p.z);
    const isPad = !slots[i];
    dummy.scale.set(isPad ? 0.001 : 0.92, isPad ? 0.001 : p.h, isPad ? 0.001 : 0.92);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  function setCells(cells: DayCell[]) {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh = null;
    }
    hoveredIdx = selectedIdx = liftedIdx = focusedIdx = -1;
    hoverMarker.visible = selectMarker.visible = focusRing.visible = false;

    columns = buildColumns(cells);
    colsCount = columns.length;
    const count = Math.max(1, colsCount * 7);
    slots = new Array(count).fill(null);
    positions = new Array(count);

    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
    const instanced = new THREE.InstancedMesh(boxGeo, mat, count);
    instanced.castShadow = true;
    instanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    mesh = instanced;

    const steps = ratingSteps();
    const grey = tileGrey();

    for (let c = 0; c < colsCount; c++) {
      for (let r = 0; r < 7; r++) {
        const i = slotIndex(c, r);
        const cell = columns[c][r];
        const isPad = cell.isPadding;
        slots[i] = isPad ? null : cell;
        const x = (c - (colsCount - 1) / 2) * GAP;
        const z = (r - 3) * GAP;
        const h = isPad ? BASE_H : heightFor(cell.points);
        positions[i] = { x, z, h };
        dummy.position.set(x, 0, z);
        dummy.scale.set(isPad ? 0.001 : 0.92, isPad ? 0.001 : h, isPad ? 0.001 : 0.92);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tmpColor.set(isPad ? grey : colorForRating(cell.avgRating, steps, grey));
        mesh.setColorAt(i, tmpColor);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);

    const width = Math.max(colsCount * GAP, 10);
    camera.position.set(width * 0.18, width * 0.34, width * 0.56);
    controls.target.set(0, 0.6, 0);
    controls.update();
  }

  function markerAt(marker: THREE.Object3D, i: number) {
    const p = positions[i];
    const lifted = i === liftedIdx;
    marker.position.set(p.x, (lifted ? LIFT : 0) + p.h / 2, p.z);
    (marker as THREE.LineSegments).scale.set(0.95, Math.max(p.h, 0.05), 0.95);
  }

  function setHover(i: number) {
    if (i === hoveredIdx) return;
    hoveredIdx = i;
    if (i < 0 || !slots[i] || i === selectedIdx) {
      hoverMarker.visible = false;
      return;
    }
    markerAt(hoverMarker, i);
    hoverMarker.visible = true;
  }

  function setSelectedByIndex(i: number) {
    if (liftedIdx >= 0 && liftedIdx !== i) setInstanceTransform(liftedIdx, false);
    selectedIdx = i;
    liftedIdx = i;
    if (i < 0 || !slots[i]) {
      selectMarker.visible = false;
      return;
    }
    setInstanceTransform(i, true);
    markerAt(selectMarker, i);
    selectMarker.visible = true;
    hoverMarker.visible = false;
  }

  function setSelected(date: string | null) {
    if (!date) {
      setSelectedByIndex(-1);
      return;
    }
    const i = slots.findIndex((c) => c?.date === date);
    setSelectedByIndex(i);
  }

  function updateFocusRing() {
    if (focusedIdx < 0 || !slots[focusedIdx]) {
      focusRing.visible = false;
      return;
    }
    const p = positions[focusedIdx];
    focusRing.position.set(p.x, 0.02, p.z);
    focusRing.visible = true;
  }

  function moveFocus(dCol: number, dRow: number) {
    if (slots.length === 0 || colsCount === 0) return;
    let col = focusedIdx < 0 ? colsCount - 1 : Math.floor(focusedIdx / 7);
    let row = focusedIdx < 0 ? new Date().getDay() : focusedIdx % 7;

    for (let tries = 0; tries < colsCount * 7; tries++) {
      const nextCol = col + dCol;
      const nextRow = row + dRow;
      if (nextCol < 0 || nextCol >= colsCount || nextRow < 0 || nextRow > 6) break;
      col = nextCol;
      row = nextRow;
      const idx = slotIndex(col, row);
      if (slots[idx]) {
        focusedIdx = idx;
        updateFocusRing();
        cb.onFocusChange(slots[idx]);
        return;
      }
    }
  }

  function activateFocus() {
    if (focusedIdx >= 0 && slots[focusedIdx]) cb.onSelect(slots[focusedIdx]!);
  }

  // ---- pointer interaction ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;

  function toNDC(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickInstance(): number {
    if (!mesh) return -1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(mesh);
    if (hits.length === 0 || hits[0].instanceId === undefined) return -1;
    const idx = hits[0].instanceId;
    return slots[idx] ? idx : -1;
  }

  function hitsGround(): boolean {
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(ground).length > 0;
  }

  function onPointerMove(e: PointerEvent) {
    toNDC(e);
    const idx = pickInstance();
    setHover(idx);
    cb.onHover(idx >= 0 ? slots[idx] : null, e.clientX, e.clientY);
  }
  function onPointerDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: PointerEvent) {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > CLICK_DRAG_THRESHOLD) return;
    toNDC(e);
    const idx = pickInstance();
    if (idx >= 0 && slots[idx]) {
      cb.onSelect(slots[idx]!);
    } else if (hitsGround()) {
      cb.onDeselectGround();
    }
  }
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', () => {
    setHover(-1);
    cb.onHover(null, 0, 0);
  });

  // ---- resize ----
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---- render loop ----
  let raf = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    controls.update();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    setCells,
    setSelected,
    moveFocus,
    activateFocus,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('themechange', onThemeChange);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      boxGeo.dispose();
      outlineGeo.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      hoverMarker.geometry.dispose();
      (hoverMarker.material as THREE.Material).dispose();
      selectMarker.geometry.dispose();
      (selectMarker.material as THREE.Material).dispose();
      focusRing.geometry.dispose();
      (focusRing.material as THREE.Material).dispose();
      if (mesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
