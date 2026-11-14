/**
 * Webi engine — framework-agnostic port of the reference "WEBI ENGINE" script.
 * Beads + physics, moods, form(), drawFace(), bubble placement and the nav
 * logo state. No React in here: Webi.tsx creates one engine per mount and
 * destroys it on unmount (listeners, rAF loop, logo classes, injected style).
 */
import { WEBI, type WebiMood, type WebiSpot } from './webi.config';

export interface WebiEngineOptions {
  goo: HTMLCanvasElement;
  face: HTMLCanvasElement;
  bubble: HTMLElement;
  /** the small red × beside Webi: sends him back into the nav logo */
  close?: HTMLElement | null;
  /** dev-only mood bar; its buttons get `.on` for the active mood */
  debug?: HTMLElement | null;
  reducedMotion: boolean;
  /** the page's smooth-scroll instance (Lenis), read when the tour scrolls; null → native scroll */
  getSmoothScroll?: () => SmoothScrollLike | null;
}

/** the subset of Lenis the tour uses */
export interface SmoothScrollLike {
  scrollTo(target: number, opts?: { duration?: number; easing?: (t: number) => number; immediate?: boolean; force?: boolean; lock?: boolean; onComplete?: () => void }): void;
}

export interface WebiEngine {
  /** begin the intro (call once the page is ready to be seen) */
  start(): void;
  setMood(mood: WebiMood, ms?: number, say?: string): void;
  replayIntro(): void;
  destroy(): void;
}

export interface WebiMoodEventDetail {
  mood: WebiMood;
  ms?: number;
  say?: string;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FONT = "'Geist Variable', Geist, sans-serif";
const HOVER_SEL = '[data-webi-say],[data-webi-mood]';

interface Bead { x: number; y: number; vx: number; vy: number; r: number; col?: string }

export function createWebiEngine(o: WebiEngineOptions): WebiEngine {
  const REDUCE = o.reducedMotion;
  const { goo, face, bubble, debug, close } = o;
  const gx = goo.getContext('2d');
  const fx = face.getContext('2d');
  if (!gx || !fx) return { start() {}, setMood() {}, replayIntro() {}, destroy() {} };

  const ac = new AbortController();
  const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) =>
    window.addEventListener(type, fn, { passive: true, signal: ac.signal });

  let VW = innerWidth, VH = innerHeight, DPR = Math.min(2, devicePixelRatio || 1);
  const PTR = { x: -1e4, y: -1e4, last: -1e9, down: 0 };
  on('pointermove', (e) => { PTR.x = e.clientX; PTR.y = e.clientY; PTR.last = performance.now(); });
  on('pointerdown', (e) => { PTR.x = e.clientX; PTR.y = e.clientY; PTR.last = performance.now(); PTR.down = performance.now(); });

  function sizeAll() {
    VW = innerWidth; VH = innerHeight; DPR = Math.min(2, devicePixelRatio || 1);
    for (const c of [goo, face]) { c.width = VW * DPR; c.height = VH * DPR; }
  }
  on('resize', sizeAll);
  sizeAll();

  /* body: 84 beads on a figure-8 + 3 thought-bubble beads, merged by the goo filter */
  const NC = WEBI.beads.count, NX = WEBI.beads.thought, NB = NC + NX, BR = WEBI.beads.radius;
  const SHADE = [...Array(NC)].map((_, i) => (1 + Math.sin((i / NC) * Math.PI * 2 + 1.1)) / 2);
  const MOODS = WEBI.moods;
  const pal = { a: hex(MOODS.idle.c[0]), b: hex(MOODS.idle.c[1]) };
  const W = {
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, S: 0.25, m: 1, tilt: 0, beads: [] as Bead[], blinkAt: 0, introAt: 0,
    say: '', sayUntil: 0, lastDown: 0, mood: 'idle' as WebiMood, moodAt: 0, force: null as WebiMood | null, forceUntil: 0,
    dizzyUntil: 0, lastInput: performance.now(), glitch: {} as Record<number, number>, glitchAt: 0,
  };
  let started = false;
  let introSaid = false;

  function sayFor(txt: string, ms: number) { W.say = txt; W.sayUntil = performance.now() + ms; }
  /* public API: setMood('error', 2800, "That email doesn't look right.") */
  function setMood(m: WebiMood, ms: number = WEBI.triggers.forcedDefaultMs, say?: string) {
    if (!MOODS[m]) return;
    W.force = m; W.forceUntil = performance.now() + ms;
    if (say !== undefined) sayFor(say, ms);
    else if (MOODS[m].say) sayFor(MOODS[m].say!, ms);
  }
  on('webi:mood' as keyof WindowEventMap, ((e: CustomEvent<WebiMoodEventDetail>) =>
    setMood(e.detail.mood, e.detail.ms || WEBI.triggers.forcedDefaultMs, e.detail.say)) as never);
  (['pointermove', 'keydown', 'wheel', 'touchstart'] as const).forEach((t) => on(t, () => { W.lastInput = performance.now(); }));

  /* ---- nav logo (WebiLogoLoop): solid ∞ until Webi leaves, then watermark + running light ---- */
  let logoEl: SVGSVGElement | null = null;
  let runStyle: HTMLStyleElement | null = null;
  function getLogo(): SVGSVGElement | null {
    if (logoEl && logoEl.isConnected) return logoEl;
    logoEl = document.querySelector<SVGSVGElement>('[data-webi-logo]');
    if (logoEl) {
      const runP = logoEl.querySelector<SVGPathElement>('.run');
      if (runP) {
        const runL = runP.getTotalLength();
        const f = WEBI.logo.runFraction;
        runP.style.strokeDasharray = `${runL * f} ${runL * (1 - f)}`;
        runStyle?.remove();
        runStyle = document.createElement('style');
        runStyle.textContent = `@keyframes webiLogoRun{from{stroke-dashoffset:0}to{stroke-dashoffset:${-runL}}}`;
        document.head.appendChild(runStyle);
      }
    }
    return logoEl;
  }
  function logoCenter() {
    const L = getLogo();
    if (!L) return { x: 60, y: 40, w: 26 };
    const r = L.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
  }

  /* m = 0 → standing 8 (vertical), m = 1 → lying ∞ (the logo). Returns [x, y, radius] in unit space. */
  function form(i: number, m: number, t: number, mood: WebiMood): [number, number, number] {
    if (i < NC) {
      const tt = (i / NC) * Math.PI * 2, ratio = lerp(0.58, 0.42, m), ang = lerp(-Math.PI / 2, 0, m);
      const bx = 60 * Math.sin(tt), by = 60 * ratio * Math.sin(2 * tt), c = Math.cos(ang), s = Math.sin(ang);
      return [bx * c - by * s, bx * s + by * c, BR];
    }
    const k = i - NC;
    if (mood !== 'think' || m > 0.4) return [14, -60, 0];
    const ph = (t * 0.55 + k / 3) % 1;
    return [20 + k * 9 + ph * 10, -76 - ph * 44, (4.5 + k * 2.2) * (1 - ph * 0.5)];
  }

  function resetBeads() {
    const L = logoCenter();
    W.pos = { x: L.x, y: L.y }; W.S = L.w / 120; W.m = 1; W.vel = { x: 0, y: 0 };
    W.beads = [...Array(NB)].map((_, i) => { const f = form(i, 1, 0, 'idle'); return { x: L.x + f[0] * W.S, y: L.y + f[1] * W.S, vx: 0, vy: 0, r: f[2] * W.S }; });
    W.introAt = performance.now(); introSaid = false;
  }

  /* hovered element's data-webi-mood / data-webi-say (delegated, so React re-renders don't matter) */
  let hoverSay = '', hoverMood = '';
  let hoverEl: HTMLElement | null = null;
  const setHover = (el: HTMLElement | null) => {
    if (el === hoverEl) return;
    hoverEl = el; hoverSay = el?.dataset.webiSay || ''; hoverMood = el?.dataset.webiMood || '';
  };
  document.addEventListener('pointerover', (e) => setHover((e.target as Element | null)?.closest?.<HTMLElement>(HOVER_SEL) ?? null), { passive: true, signal: ac.signal });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) setHover(null); }, { passive: true, signal: ac.signal });

  const scaleTarget = () => (VW < WEBI.scale.mobileBelow ? WEBI.scale.mobile : WEBI.scale.desktop);

  /* scroll-driven placement: the side the centred [data-webi-spot] section asks for */
  function spotTarget(t: number) {
    const SP = WEBI.spots;
    let spot: WebiSpot = 'r', best = 1e9;
    for (const el of document.querySelectorAll<HTMLElement>('[data-webi-spot]')) {
      const r = el.getBoundingClientRect(), c = Math.abs((r.top + r.bottom) / 2 - VH / 2);
      if (r.top < VH * SP.band[1] && r.bottom > VH * SP.band[0] && c < best) { best = c; spot = (el.dataset.webiSpot as WebiSpot) || 'r'; }
    }
    const sxp = VW < WEBI.scale.mobileBelow ? SP.mobileX : SP.desktopX;
    const swX = REDUCE ? 0 : Math.sin(t * SP.sway.xSpeed) * SP.sway.x;
    const swY = REDUCE ? 0 : Math.sin(t * SP.sway.ySpeed) * SP.sway.y;
    let tx = VW * (sxp[spot] ?? sxp.r) + swX, ty = VH * (spot === 'm' ? SP.yHigh : SP.y) + swY;
    // during the tour each beat can place Webi itself, so he walks around while explaining
    const tp = tour?.pos;
    if (tp) { tx = VW * tp[0] + swX; ty = VH * tp[1] + swY; }
    tx = clamp(tx, SP.margin.x, VW - SP.margin.x); ty = clamp(ty, SP.margin.top, VH - SP.margin.bottom);
    return { tx, ty };
  }

  /* reduced motion: no drip — Webi simply appears at his spot as the 8 */
  function placeAtSpot(t: number) {
    const { tx, ty } = spotTarget(t);
    W.pos = { x: tx, y: ty }; W.vel = { x: 0, y: 0 }; W.S = scaleTarget(); W.m = 0; W.tilt = 0;
    W.beads = [...Array(NB)].map((_, i) => { const f = form(i, 0, t, 'idle'); return { x: tx + f[0] * W.S, y: ty + f[1] * W.S, vx: 0, vy: 0, r: f[2] * W.S }; });
    W.introAt = performance.now(); introSaid = false;
  }

  /* ---- guided tour (desktop only): hover → offer, click → Webi drives the scroll, any click / Esc → cancel ---- */
  const TOUR = WEBI.tour;
  const desktopMQ = matchMedia(TOUR.desktopQuery);
  interface TourBeat { el: HTMLElement; at: number; pos?: [number, number]; line: string }
  let tour: { beats: TourBeat[]; i: number; phase: 'talking' | 'moving'; nextAt: number; token: number; pos?: [number, number] } | null = null;
  let tourToken = 0;
  let pollTimer = 0;
  let cursorSet = false;
  const setCursor = (on: boolean) => {
    if (on === cursorSet) return;
    cursorSet = on;
    document.documentElement.style.cursor = on ? 'pointer' : '';
  };
  const readMs = (line: string) => clamp(TOUR.read.baseMs + line.length * TOUR.read.msPerChar, TOUR.read.minMs, TOUR.read.maxMs);
  /*
   * document Y of a beat. A pinned section is measured by its pin-spacer (stable while pinned)
   * and `at` walks its pinned distance, so stops line up with its scroll animation.
   * A normal section: `at` 0 = its top at the viewport top, 1 = its bottom at the viewport bottom.
   */
  const beatY = (b: TourBeat) => {
    // the pinned element is the target itself or one inside it (e.g. the stack inside .gh-stack-slot)
    const sp = b.el.parentElement?.classList.contains('pin-spacer') ? b.el.parentElement : b.el.querySelector<HTMLElement>('.pin-spacer');
    const pinned = sp?.firstElementChild as HTMLElement | null | undefined;
    const box = (sp ?? b.el).getBoundingClientRect(), top = box.top + scrollY;
    const travel = sp && pinned ? Math.max(0, sp.offsetHeight - pinned.offsetHeight) : Math.max(0, box.height - VH);
    const max = document.documentElement.scrollHeight - VH;
    return clamp(Math.round(top + travel * clamp(b.at, 0, 1)), 0, Math.max(0, max));
  };
  const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
  function scrollToY(y: number, done: () => void) {
    const dist = Math.abs(y - scrollY);
    if (dist < 3) { done(); return; }
    const S = TOUR.scroll, secs = clamp(dist / S.pxPerSecond, S.minSeconds, S.maxSeconds);
    const ss = o.getSmoothScroll?.();
    if (ss && !REDUCE) { ss.scrollTo(y, { duration: secs, easing: easeInOutSine, force: true, onComplete: done }); return; }
    window.scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' });
    const t0 = performance.now();
    const poll = () => { if (Math.abs(scrollY - y) < 2 || performance.now() - t0 > secs * 1000 + 1500) done(); else pollTimer = window.setTimeout(poll, 60); };
    pollTimer = window.setTimeout(poll, 60);
  }
  function stopScroll() {
    window.clearTimeout(pollTimer);
    const ss = o.getSmoothScroll?.();
    if (ss) ss.scrollTo(scrollY, { immediate: true, force: true });
    else window.scrollTo({ top: scrollY, behavior: 'auto' });
  }
  function startTour() {
    const beats: TourBeat[] = [];
    for (const s of TOUR.steps) {
      const el = document.querySelector<HTMLElement>(s.target);
      if (el) for (const b of s.beats) beats.push({ el, at: b.at ?? 0, pos: b.pos, line: b.line });
    }
    if (!beats.length) return;
    // start where the visitor already is: the last beat at or above the upper third of the screen
    const here = scrollY + VH * 0.35;
    let first = 0;
    beats.forEach((b, i) => { if (beatY(b) <= here) first = i; });
    // several beats can share one stop (e.g. the hero): begin with the first of them
    while (first > 0 && beats[first - 1].el === beats[first].el && beatY(beats[first - 1]) >= beatY(beats[first]) - 4) first--;
    tour = { beats, i: first - 1, phase: 'talking', nextAt: performance.now() + TOUR.startMs, token: ++tourToken };
    W.force = null; W.forceUntil = 0;
    sayFor(TOUR.startLine, TOUR.startMs);
  }
  function endTour(cancelled: boolean) {
    if (!tour) return;
    tour = null; tourToken++;
    stopScroll();
    W.force = null; W.forceUntil = 0;
    if (cancelled) sayFor(TOUR.cancelLine, TOUR.cancelMs);
  }
  function tickTour(now: number) {
    if (!tour) return;
    W.lastInput = now; // no falling asleep mid-tour
    if (tour.phase !== 'talking' || now < tour.nextAt) return;
    tour.i++;
    if (tour.i >= tour.beats.length) { tour = null; tourToken++; return; }
    const b = tour.beats[tour.i], token = tour.token;
    tour.phase = 'moving'; tour.pos = b.pos; W.say = ''; W.sayUntil = 0;
    const pinnedBeat = !!(b.el.parentElement?.classList.contains('pin-spacer') || b.el.querySelector('.pin-spacer'));
    scrollToY(beatY(b), () => window.setTimeout(() => {
      if (!tour || tour.token !== token) return;
      const last = tour.i === tour.beats.length - 1;
      const ms = readMs(b.line) + (last ? TOUR.endMs - TOUR.pauseMs : 0);
      tour.phase = 'talking'; tour.nextAt = performance.now() + ms + TOUR.pauseMs;
      sayFor(b.line, ms);
    }, pinnedBeat ? TOUR.settleMs : 0)); // scrubbed scenes lag the scroll a little: let them land first
  }
  /* clicks: decided on pointerdown (not in the frame) so a click on Webi can be kept from reaching what's under him */
  let hiddenNow = true;
  let crossUntil = 0; // the × shows only while Webi is hovered (plus a short grace to reach it)
  let swallowClick = false;
  const nearWebi = (x: number, y: number) => {
    const T = WEBI.triggers.tickle;
    return started && !hiddenNow && Math.hypot(x - W.pos.x, y - W.pos.y) < T.radius * W.S + T.pad;
  };
  const canTour = () => desktopMQ.matches && W.m < 0.5;
  window.addEventListener('pointerdown', (e) => {
    if (close && close.contains(e.target as Node)) { if (tour) endTour(false); return; } // the × handles itself
    if (parked || leaving) return;
    const near = nearWebi(e.clientX, e.clientY);
    if (tour) { endTour(true); swallowClick = near; return; } // any click — on Webi or anywhere — cancels
    if (!near) return;
    if (canTour()) { startTour(); swallowClick = true; }
    else { const T = WEBI.triggers.tickle; setMood('happy', T.ms, T.line); crossUntil = performance.now() + WEBI.dismiss.touchShowMs; } // no hover on touch: a tap reveals the ×
  }, { capture: true, signal: ac.signal });
  window.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false; e.preventDefault(); e.stopImmediatePropagation();
  }, { capture: true, signal: ac.signal });
  window.addEventListener('pointerup', () => { if (swallowClick) window.setTimeout(() => { swallowClick = false; }, 400); }, { capture: true, signal: ac.signal });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { PTR.x = PTR.y = -1e4; } }, { passive: true, signal: ac.signal });

  /* ---- dismiss: the × sends Webi back into the nav ∞; clicking the ∞ (the logo link) brings him out again ---- */
  const DIS = WEBI.dismiss;
  const store = (v: boolean) => { try { if (v) sessionStorage.setItem(DIS.storageKey, '1'); else sessionStorage.removeItem(DIS.storageKey); } catch { /* storage blocked */ } };
  let parked = false;  // inside the logo, not drawn
  let leaving = false; // flying back to the logo
  try { parked = sessionStorage.getItem(DIS.storageKey) === '1'; } catch { /* storage blocked */ }
  function dismiss() {
    if (!started || parked || leaving) return;
    if (tour) endTour(false);
    leaving = true; store(true);
    W.force = 'happy'; W.forceUntil = performance.now() + 2200;
    sayFor(DIS.line, DIS.lineMs);
  }
  function summon() {
    if (!parked && !leaving) return;
    parked = leaving = false; store(false);
    W.force = null; W.forceUntil = 0;
    if (REDUCE) placeAtSpot((performance.now() - T_START) / 1000); else resetBeads();
    introSaid = true; // no first-visit greeting, just a short hello
    sayFor(desktopMQ.matches ? DIS.backLineDesktop : DIS.backLine, DIS.backMs);
  }
  close?.addEventListener('click', (e) => { e.preventDefault(); dismiss(); }, { signal: ac.signal });
  window.addEventListener('click', (e) => {
    if (!parked && !leaving) return;
    const L = getLogo(), a = L?.closest('a') ?? L;
    if (!a || !a.contains(e.target as Node)) return;
    e.preventDefault(); // stays on the page (React Router skips navigation for a prevented click)
    summon();
  }, { capture: true, signal: ac.signal });

  /* while touring Webi owns the scroll: block wheel and scroll keys (capture, before Lenis); Esc cancels */
  window.addEventListener('wheel', (e) => { if (tour) { e.preventDefault(); e.stopImmediatePropagation(); } }, { passive: false, capture: true, signal: ac.signal });
  const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
  window.addEventListener('keydown', (e) => {
    if (!tour) return;
    if (e.key === 'Escape') { endTour(true); return; }
    if (SCROLL_KEYS.has(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, { capture: true, signal: ac.signal });

  const IN = WEBI.intro;
  let lastSY = scrollY;
  const T_START = performance.now();
  let raf = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - T_START) / 1000, sy = scrollY, dy = sy - lastSY;
    lastSY = sy;
    const logo = getLogo();

    if (!started) {
      // page not ready yet (e.g. the cloud intro is still playing): Webi waits inside the solid logo
      gx!.setTransform(DPR, 0, 0, DPR, 0, 0); gx!.clearRect(0, 0, VW, VH);
      fx!.setTransform(DPR, 0, 0, DPR, 0, 0); fx!.clearRect(0, 0, VW, VH);
      bubble.classList.remove('show');
      return;
    }

    /* --- mood resolution: forced > hover > dizzy (fast scroll) > sleep (12 s idle) > idle --- */
    tickTour(now);
    if (!tour && Math.abs(dy) > WEBI.triggers.dizzyScrollPx) W.dizzyUntil = now + WEBI.triggers.dizzyMs;
    let mood: WebiMood = 'idle';
    if (tour) mood = 'teach'; // the teacher look is how visitors know he's explaining
    else if (W.force && now < W.forceUntil) mood = W.force;
    else if (hoverMood && hoverMood in MOODS) mood = hoverMood as WebiMood;
    else if (now < W.dizzyUntil) mood = 'dizzy';
    else if (now - W.lastInput > WEBI.triggers.sleepAfterMs) mood = 'sleep';
    if (mood !== W.mood) { W.mood = mood; W.moodAt = now; }
    if (debug) for (const c of debug.children) (c as HTMLElement).classList.toggle('on', (c as HTMLElement).dataset.m === mood);
    const mt = (now - W.moodAt) / 1000;
    const tgA = hex(MOODS[mood].c[0]), tgB = hex(MOODS[mood].c[1]);
    for (let i = 0; i < 3; i++) { pal.a[i] += (tgA[i] - pal.a[i]) * 0.07; pal.b[i] += (tgB[i] - pal.b[i]) * 0.07; }

    /* --- target position --- */
    const sinceIntro = (now - W.introAt) / 1000;
    let tx: number, ty: number, k: number = WEBI.spring.k, damp: number = WEBI.spring.damping, St: number = scaleTarget(), mT = 0;
    if (leaving || parked) { // going home: shrink back into the ∞ inside the nav logo
      const L = logoCenter();
      tx = L.x; ty = L.y + 8; St = WEBI.scale.logoStart; mT = 1; k = 0.09; damp = 0.72;
      if (leaving && (REDUCE || (Math.hypot(tx - W.pos.x, ty - W.pos.y) < 5 && W.m > 0.9))) { leaving = false; parked = true; }
    } else if (sinceIntro < IN.endsAt && sy < IN.nearTop && !REDUCE) { // intro: drip out of the logo as a small ∞
      const L = logoCenter(), q = clamp((sinceIntro - IN.popAt) / IN.dripFor, 0, 1);
      tx = L.x; ty = L.y + 8 + ease(q) * IN.dripDistance; St = lerp(WEBI.scale.logoStart, St, q); mT = 1; k = 0.25; damp = 0.55;
    } else { // scroll-driven: glide to the side the centred section asks for
      ({ tx, ty } = spotTarget(t));
      if (!REDUCE && sinceIntro < IN.standUpWindow && Math.hypot(tx - W.pos.x, ty - W.pos.y) > WEBI.spots.standUpWithin) mT = 1;
    }
    if (mood === 'sleep' && !REDUCE && !leaving) ty += 14;
    if (REDUCE) { W.pos.x = tx; W.pos.y = ty; W.vel.x = W.vel.y = 0; }
    else {
      W.vel.x = (W.vel.x + (tx - W.pos.x) * k) * damp; W.vel.y = (W.vel.y + (ty - W.pos.y) * k) * damp;
      if ((mood === 'happy' || mood === 'success') && !leaving) { if (Math.sin(mt * 11) > 0.96 && W.vel.y > -1) W.vel.y -= 3.2; }
      { const v = Math.hypot(W.vel.x, W.vel.y), mx = leaving ? WEBI.spring.maxSpeed * 1.6 : WEBI.spring.maxSpeed; if (v > mx) { W.vel.x *= mx / v; W.vel.y *= mx / v; } }
      W.pos.x += W.vel.x; W.pos.y += W.vel.y;
    }
    const sp = Math.hypot(W.vel.x, W.vel.y);
    W.S += (St - W.S) * (sinceIntro < IN.endsAt ? 0.25 : 0.07); W.m += (mT - W.m) * (leaving ? 0.1 : 0.07);
    let tiltT = clamp(W.vel.x * 0.03, -0.3, 0.3);
    if (mood === 'think') tiltT += 0.16; if (mood === 'dizzy') tiltT += Math.sin(t * 7) * 0.28; if (mood === 'sleep') tiltT -= 0.12;
    if (REDUCE) tiltT = 0;
    W.tilt += (tiltT * (1 - W.m) - W.tilt) * 0.1;

    /* logo: solid until Webi leaves, then watermark + running light */
    const hidden = parked || (sinceIntro < IN.popAt && sy < IN.nearTop && !REDUCE && !leaving);
    if (hidden) {
      const L = logoCenter(), s0 = WEBI.scale.logoStart;
      W.pos.x = L.x; W.pos.y = L.y + 8; W.vel.x = W.vel.y = 0; W.S = s0;
      W.beads.forEach((b, i) => { const f = form(i, 1, t, 'idle'); b.x = L.x + f[0] * s0; b.y = L.y + 8 + f[1] * s0; b.vx = b.vy = 0; });
    }
    const out = !hidden;
    if (logo && out !== logo.classList.contains('out')) {
      logo.classList.toggle('out', out); logo.classList.remove('ripple'); void logo.getBoundingClientRect(); logo.classList.add('ripple');
    }
    hiddenNow = hidden;
    const webiHover = canTour() && !tour && !leaving && nearWebi(PTR.x, PTR.y);
    setCursor(webiHover);

    /* --- shape per mood --- */
    let sxk = 1, syk = 1, shakeX = 0, wob = REDUCE ? 0 : 0.7;
    if (!REDUCE) {
      if (mood === 'happy' || mood === 'success') { const q = Math.sin(mt * 11); sxk = 1 + q * 0.06; syk = 1 - q * 0.06; }
      if (mood === 'sleep') { sxk = 1.07; syk = 0.88 + Math.sin(t * 1.4) * 0.025; }
      if (mood === 'think') { syk = 1 + Math.sin(t * 2) * 0.03; }
      if (mood === 'error') { shakeX = mt < 0.7 ? Math.sin(t * 70) * 5 * (1 - mt / 0.7) : 0; }
      if (mood === 'dizzy') wob = 2.6;
      if (mood === 'bug' && now > W.glitchAt) {
        W.glitchAt = now + 70 + Math.random() * 160; W.glitch = {};
        const n = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < n; j++) W.glitch[Math.floor(Math.random() * 10)] = (Math.random() - 0.5) * 22;
      }
    }
    const S = W.S, ct = Math.cos(W.tilt), st = Math.sin(W.tilt);
    const bob = REDUCE ? 0 : Math.sin(t * (mood === 'sleep' ? 1.2 : 2.1)) * 3 * S * (1 - W.m * 0.6);
    const drag = REDUCE ? 0 : clamp(dy, -40, 40);
    for (let i = 0; i < NB; i++) {
      const b = W.beads[i], f = form(i, W.m, t, mood);
      let fx0 = f[0], fy0 = f[1];
      if (i < NC) {
        if (mood === 'error' && fy0 < -4 && W.m < 0.5) { fy0 -= 4; fx0 += 3; } // the 8 cracks at the waist
        if (mood === 'bug' && W.m < 0.5 && !REDUCE) { const band = Math.floor((fy0 + 70) / 14); if (W.glitch[band]) fx0 += W.glitch[band]; } // glitch slices
        fx0 *= sxk; fy0 = fy0 * syk + (1 - syk) * 60;
      }
      const w1 = Math.sin(t * 2.4 + i * 0.3) * wob, w2 = Math.cos(t * 2 + i * 0.26) * wob;
      const lx = (fx0 + w1) * S, ly = (fy0 + w2) * S, X = W.pos.x + shakeX + lx * ct - ly * st, Y = W.pos.y + bob + lx * st + ly * ct;
      if (REDUCE) { b.x = X; b.y = Y; b.vx = b.vy = 0; b.r = f[2] * S; }
      else {
        const kk = mood === 'bug' ? 0.45 : 0.2 + 0.05 * Math.sin(i * 0.5);
        b.vx = (b.vx + (X - b.x) * kk) * 0.74; b.vy = (b.vy + (Y - b.y) * kk - drag * 0.035 * (0.7 + 0.3 * Math.sin(i * 0.5))) * 0.74; b.x += b.vx; b.y += b.vy;
        b.r += (f[2] * S - b.r) * 0.15;
      }
      const sh = i < NC ? SHADE[i] : 0.2;
      b.col = `rgb(${Math.round(pal.a[0] + (pal.b[0] - pal.a[0]) * sh)},${Math.round(pal.a[1] + (pal.b[1] - pal.a[1]) * sh)},${Math.round(pal.a[2] + (pal.b[2] - pal.a[2]) * sh)})`;
    }
    gx!.setTransform(DPR, 0, 0, DPR, 0, 0); gx!.clearRect(0, 0, VW, VH);
    if (!hidden) for (const b of W.beads) if (b.r > 0.4) { gx!.fillStyle = b.col!; gx!.beginPath(); gx!.arc(b.x, b.y, b.r, 0, 7); gx!.fill(); }
    fx!.setTransform(DPR, 0, 0, DPR, 0, 0); fx!.clearRect(0, 0, VW, VH);
    if (S > 0.1 && !hidden && (REDUCE || sinceIntro > IN.faceAt)) drawFace(now, REDUCE ? 0 : t, S, bob, mood, mt, sp, shakeX, 1);

    /* --- speech bubble --- */
    if (!introSaid && sinceIntro > IN.sayAt && sy < IN.nearTop) { introSaid = true; sayFor(IN.line, IN.lineMs); }
    let txt = (now < W.sayUntil ? W.say : '') || (webiHover ? TOUR.hoverLine : '') || (tour ? '' : hoverSay) || (mood === 'dizzy' || mood === 'sleep' ? MOODS[mood].say! : '');
    if (S < 0.3 || W.m > 0.5) txt = '';
    if (leaving || parked) txt = now < W.sayUntil ? W.say : ''; // the goodbye stays readable while he flies home
    if (txt) {
      if (bubble.textContent !== txt) bubble.textContent = txt;
      const B = WEBI.bubble;
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight, flip = W.pos.x + B.gapFlip * S + bw > VW - B.edge;
      const bx = flip ? W.pos.x - B.gapFlip * S - bw : W.pos.x + B.gapRight * S, by = W.pos.y - B.above * S - bh * 0.6;
      const bTop = clamp(by, B.minTop, VH - bh - B.bottomPad);
      bubble.style.transform = `translate(${bx}px,${bTop}px)`;
      bubble.classList.toggle('flip', flip);
      if (now - textCheckAt > 160) { textCheckAt = now; bubble.classList.toggle('over-text', coversText(bx, bTop, bw, bh)); }
    }
    bubble.classList.toggle('show', !!txt);
    bubble.classList.toggle('teach', mood === 'teach');

    /* --- the × sits on Webi's shoulder, on the side away from the bubble --- */
    if (close) {
      if (nearWebi(PTR.x, PTR.y) || close.matches(':hover, :focus-visible')) crossUntil = Math.max(crossUntil, now + DIS.hoverGraceMs);
      const showX = now < crossUntil && !hidden && !leaving && !parked && W.m < 0.5 && S > 0.3 && sinceIntro > IN.faceAt;
      if (showX) {
        const C = DIS.cross, left = !(txt && bubble.classList.contains('flip'));
        const cx = W.pos.x + (left ? -C.x : C.x) * S, cy = W.pos.y + bob + C.y * S;
        close.style.transform = `translate(${Math.round(cx - C.size / 2)}px,${Math.round(cy - C.size / 2)}px)`;
      }
      close.classList.toggle('show', showX);
    }
  }

  /*
   * Does the bubble sit on top of the page's own text? Sample a grid of points under it
   * (every Webi layer is pointer-events: none, so hit-testing sees the page) and look for
   * a text node whose glyphs are actually under that point.
   */
  let textCheckAt = 0;
  function coversText(x: number, y: number, w: number, h: number) {
    const D = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    const rr = document.createRange();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const px = x + (w * (i + 0.5)) / 4, py = y + (h * (j + 0.5)) / 3;
      if (px < 0 || py < 0 || px > VW || py > VH) continue;
      const el = document.elementFromPoint(px, py);
      if (!el || el === document.documentElement || el === document.body) continue;
      let n: Node | null = null, off = 0;
      if (D.caretRangeFromPoint) { const r = D.caretRangeFromPoint(px, py); if (r) { n = r.startContainer; off = r.startOffset; } }
      else if (D.caretPositionFromPoint) { const p = D.caretPositionFromPoint(px, py); if (p) { n = p.offsetNode; off = p.offset; } }
      if (!n || n.nodeType !== 3 || !el.contains(n)) continue;
      const len = (n.textContent || '').length;
      // the caret sits between two characters: test the glyph on each side of it
      for (const s of [off - 1, off]) {
        if (s < 0 || s >= len || !(n.textContent || '')[s].trim()) continue;
        rr.setStart(n, s); rr.setEnd(n, s + 1);
        for (const q of rr.getClientRects()) if (px >= q.left - 3 && px <= q.right + 3 && py >= q.top && py <= q.bottom) return true;
      }
    }
    return false;
  }

  function drawFace(now: number, t: number, S: number, bob: number, mood: WebiMood, mt: number, sp: number, shakeX: number, alpha: number) {
    const f = fx!, m = W.m;
    f.save(); f.globalAlpha = alpha; f.translate(W.pos.x + shakeX, W.pos.y + bob); f.rotate(W.tilt); f.scale(S, S);
    if (now > W.blinkAt + 170) W.blinkAt = now + 2500 + Math.random() * 2800;
    const bp = (now - W.blinkAt) / 170, bk = bp > 0 && bp < 1 ? Math.max(0.1, Math.abs(1 - 2 * bp)) : 1;
    let lx = 0, ly = 0;
    if (now - PTR.last < 3500) { const dx = PTR.x - W.pos.x, dy = PTR.y - W.pos.y, d = Math.hypot(dx, dy) || 1, mm = Math.min(1, d / 200) * 2.6; lx = (dx / d) * mm; ly = (dy / d) * mm; }
    if (mood === 'think') { lx = 2.4; ly = -2.6; }
    if (mood === 'teach') { const dx = VW / 2 - W.pos.x, dy = VH * 0.45 - W.pos.y, d = Math.hypot(dx, dy) || 1; lx = (dx / d) * 2.2; ly = (dy / d) * 2.2; } // looks at what he's explaining
    const talking = mood === 'teach' && now < W.sayUntil;
    const INKC = '#181d27';
    f.fillStyle = f.strokeStyle = INKC; f.lineCap = 'round'; f.lineJoin = 'round';
    const oval = (x: number, y: number) => { f.fillStyle = INKC; f.beginPath(); f.ellipse(x + lx, y + ly, 4.2, 5.8 * bk, 0, 0, 7); f.fill(); if (bk > 0.5) { f.fillStyle = '#fff'; f.beginPath(); f.arc(x + lx + 1.5, y + ly - 2.3, 1.5, 0, 7); f.fill(); } };
    const arcEye = (x: number, y: number, up: boolean) => { f.lineWidth = 3; f.beginPath(); f.moveTo(x - 5, y + (up ? 2 : -1)); f.quadraticCurveTo(x, y + (up ? -6 : 5), x + 5, y + (up ? 2 : -1)); f.stroke(); };
    const gloss = (x: number, y: number, rx: number, ry: number, r: number) => { f.save(); f.globalAlpha *= 0.85; f.fillStyle = '#fff'; f.beginPath(); f.ellipse(x, y, rx, ry, r, 0, 7); f.fill(); f.restore(); };
    const aS = clamp(1 - m * 2, 0, 1), aL = clamp(m * 2 - 1, 0, 1);
    if (aS > 0) {
      f.save(); f.globalAlpha *= aS;
      const E = [-10, 10], EY = -37, MY = -24;
      // eyes
      if (mood === 'happy' || mood === 'success') E.forEach((x) => arcEye(x, EY, true));
      else if (mood === 'sleep') E.forEach((x) => arcEye(x, EY + 1, false));
      else if (mood === 'error') { f.lineWidth = 2.8; E.forEach((x) => { f.beginPath(); f.moveTo(x - 4, EY - 4); f.lineTo(x + 4, EY + 4); f.moveTo(x + 4, EY - 4); f.lineTo(x - 4, EY + 4); f.stroke(); }); }
      else if (mood === 'bug') { E.forEach((x) => { f.fillRect(x - 3.5 + (!REDUCE && Math.random() < 0.15 ? 2 : 0), EY - 3.5, 7, 7); }); }
      else if (mood === 'dizzy') { f.lineWidth = 1.8; E.forEach((x, j) => { f.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 0.42, an = a + (j ? -1 : 1) * t * 8; f.lineTo(x + Math.cos(an) * r, EY + Math.sin(an) * r); } f.stroke(); }); }
      else E.forEach((x) => oval(x, EY));
      // mouth
      f.fillStyle = f.strokeStyle = INKC;
      if (mood === 'happy' || mood === 'success') { f.beginPath(); f.moveTo(-5, MY); f.quadraticCurveTo(0, MY + 10, 5, MY); f.closePath(); f.fill(); }
      else if (mood === 'think') { f.beginPath(); f.ellipse(3, MY + 1, 2.2, 2.8, 0, 0, 7); f.fill(); }
      else if (mood === 'error') { f.lineWidth = 2.6; f.beginPath(); f.moveTo(-5, MY + 3); f.quadraticCurveTo(0, MY - 3, 5, MY + 3); f.stroke(); }
      else if (mood === 'bug') { f.lineWidth = 2.4; f.beginPath(); f.moveTo(-5, MY + 1); f.lineTo(-2, MY - 1); f.lineTo(1, MY + 1); f.lineTo(4, MY - 1); f.stroke(); }
      else if (mood === 'sleep') { f.beginPath(); f.ellipse(0, MY + 1, 2, 1.6, 0, 0, 7); f.fill(); }
      else if (mood === 'dizzy') { f.lineWidth = 2.2; f.beginPath(); for (let x = -6; x <= 6; x += 1) { const y = MY + Math.sin(x * 0.9 + t * 10) * 1.6; if (x === -6) f.moveTo(x, y); else f.lineTo(x, y); } f.stroke(); }
      else if (talking) { const op = REDUCE ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(t * 9)); f.beginPath(); f.ellipse(0, MY + 1.5, 3.6, 1 + 3 * op, 0, 0, 7); f.fill(); }
      else if (mood === 'teach') { f.lineWidth = 2.6; f.beginPath(); f.moveTo(-4, MY + 0.5); f.quadraticCurveTo(1, MY + 4, 5, MY - 1); f.stroke(); } // a confident half-smile
      else if (sp > 8) { f.beginPath(); f.ellipse(0, MY + 2, 2.3, 3.2, 0, 0, 7); f.fill(); }
      else { f.lineWidth = 2.6; f.beginPath(); f.moveTo(-4.6, MY); f.quadraticCurveTo(0, MY + 4.2, 4.6, MY); f.stroke(); }
      // mood props
      if (mood === 'error') { const a = REDUCE ? 1 : Math.min(1, mt * 4); f.save(); f.globalAlpha *= a; f.fillStyle = '#d9213a'; f.font = `700 26px ${FONT}`; f.textAlign = 'center'; f.fillText('!', 0, -80 - (REDUCE ? 6 : Math.min(mt, 1) * 6)); f.restore(); }
      if (mood === 'bug') { f.lineWidth = 2.4; f.strokeStyle = '#3c6e0a'; f.fillStyle = '#3c6e0a'; [[-7, -66, -15, -84], [7, -66, 15, -84]].forEach(([a, b, c, d], j) => { const w = REDUCE ? 0 : Math.sin(t * 14 + j) * 2; f.beginPath(); f.moveTo(a, b); f.quadraticCurveTo(a + (c - a) * 0.3, d + 4, c + w, d); f.stroke(); f.beginPath(); f.arc(c + w, d, 2.6, 0, 7); f.fill(); }); }
      if (mood === 'sleep') { f.fillStyle = '#6c7d97'; f.textAlign = 'center'; for (let j = 0; j < 3; j++) { const ph = (t * 0.35 + j / 3) % 1; f.save(); f.globalAlpha *= Math.sin(ph * Math.PI); f.font = `600 ${10 + ph * 10}px ${FONT}`; f.fillText('z', 16 + ph * 22, -62 - ph * 36); f.restore(); } }
      if (mood === 'success' || mood === 'happy') {
        const col = mood === 'success' ? '#0aa774' : '#127ff0'; f.fillStyle = col;
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 + t * 0.8, r = 78 + Math.sin(t * 3 + j) * 6, x = Math.cos(a) * r * 0.75, y = Math.sin(a) * r - 6, s = 2.4 + Math.sin(t * 6 + j * 2) * 1.4;
          f.save(); f.translate(x, y); f.beginPath(); f.moveTo(0, -s * 2); f.quadraticCurveTo(0, 0, s * 2, 0); f.quadraticCurveTo(0, 0, 0, s * 2); f.quadraticCurveTo(0, 0, -s * 2, 0); f.quadraticCurveTo(0, 0, 0, -s * 2); f.fill(); f.restore();
        }
      }
      if (mood === 'teach') {
        const a = REDUCE ? 1 : Math.min(1, mt * 3);
        f.save(); f.globalAlpha *= a;
        // round glasses
        f.strokeStyle = INKC; f.lineWidth = 2.2;
        E.forEach((x) => { f.fillStyle = 'rgba(255,255,255,.22)'; f.beginPath(); f.arc(x, EY, 7.8, 0, 7); f.fill(); f.stroke(); });
        f.beginPath(); f.moveTo(-2.4, EY - 1); f.quadraticCurveTo(0, EY - 3.4, 2.4, EY - 1); f.stroke();
        f.beginPath(); f.moveTo(-17.6, EY - 1.5); f.lineTo(-25, EY - 4); f.moveTo(17.6, EY - 1.5); f.lineTo(25, EY - 4); f.stroke();
        // graduation cap: band, board, button and a swinging tassel
        const drop = REDUCE ? 0 : (1 - a) * -14;
        f.translate(0, drop);
        f.fillStyle = INKC;
        f.beginPath(); f.moveTo(-15, -64); f.lineTo(-14, -75); f.lineTo(14, -75); f.lineTo(15, -64); f.quadraticCurveTo(0, -60, -15, -64); f.fill();
        f.beginPath(); f.moveTo(-30, -77); f.lineTo(0, -87); f.lineTo(30, -77); f.lineTo(0, -68); f.closePath(); f.fill();
        f.fillStyle = '#2b3445'; f.beginPath(); f.moveTo(-30, -77); f.lineTo(0, -68); f.lineTo(30, -77); f.lineTo(0, -71); f.closePath(); f.fill();
        const sw = REDUCE ? 0 : Math.sin(t * 2.6) * 3;
        f.strokeStyle = '#f5b301'; f.lineWidth = 1.8;
        f.beginPath(); f.moveTo(0, -78); f.lineTo(22, -75); f.quadraticCurveTo(24 + sw * 0.4, -68, 23 + sw, -60); f.stroke();
        f.fillStyle = '#f5b301'; f.beginPath(); f.ellipse(23 + sw, -58, 2.4, 3.6, 0, 0, 7); f.fill();
        f.fillStyle = '#f5b301'; f.beginPath(); f.arc(0, -78, 2, 0, 7); f.fill();
        f.restore();
      }
      gloss(-17, -52, 5, 2, -0.9); gloss(-21, 30, 6, 2.3, -1.1);
      f.restore();
    }
    if (aL > 0 && S > 0.25) { f.save(); f.globalAlpha *= aL; oval(-36, 0); oval(36, 0); gloss(-40, -20, 6, 2.2, -0.3); f.restore(); }
    f.restore();
  }

  raf = requestAnimationFrame(frame);

  return {
    start() {
      if (started) return;
      started = true;
      if (REDUCE) placeAtSpot((performance.now() - T_START) / 1000); else resetBeads();
      if (parked) introSaid = true; // dismissed earlier this session: he stays in the logo until it's clicked
    },
    setMood,
    replayIntro() {
      scrollTo(0, 0);
      window.setTimeout(() => { if (!started) return; if (REDUCE) placeAtSpot((performance.now() - T_START) / 1000); else resetBeads(); }, 60);
    },
    destroy() {
      cancelAnimationFrame(raf);
      if (tour) { tour = null; stopScroll(); }
      window.clearTimeout(pollTimer);
      setCursor(false);
      ac.abort();
      runStyle?.remove();
      const L = logoEl;
      if (L) {
        L.classList.remove('out', 'ripple');
        const runP = L.querySelector<SVGPathElement>('.run');
        if (runP) runP.style.strokeDasharray = '';
      }
      bubble.classList.remove('show');
      close?.classList.remove('show');
    },
  };
}
