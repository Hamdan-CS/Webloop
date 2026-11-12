import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from '@/design-system/animations/gsap.config';
import { useScrollScene } from '@/design-system/motion/useScrollScene';
import { endBack, endFront } from './genieMarkup';

/**
 * Canvas engine from the demo's createEndLoop(): particles drift up out of
 * the cloud bank and gather into a 3D lemniscate (the WebLoop loop), with a
 * light travelling round it; pointer tilts it slightly. Draws only while the
 * section is on screen; cleans up on unmount.
 */
function useEndLoop(secRef: React.RefObject<HTMLElement>, reduced: boolean) {
  const progress = useRef(reduced ? 1 : 0);
  useEffect(() => {
    const sec = secRef.current!;
    const cv = sec.querySelector<HTMLCanvasElement>('.gh-end-canvas')!, g = cv.getContext('2d')!;
    const mark = sec.querySelector<HTMLElement>('#gh-endMark')!, cap = sec.querySelector<HTMLElement>('#gh-endCap')!;
    const MOB = innerWidth < 768, N = MOB ? 1900 : 3400;
    const mul = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const rnd = mul(20261113), gauss = () => (rnd() + rnd() + rnd() - 1.5) * 0.8;
    const T = new Float32Array(N), SP = new Float32Array(N), JX = new Float32Array(N), JY = new Float32Array(N), JZ = new Float32Array(N);
    const SX = new Float32Array(N), SY = new Float32Array(N), DL = new Float32Array(N), SD = new Float32Array(N);
    const PX = new Float32Array(N), PY = new Float32Array(N), BK = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      T[i] = rnd() * Math.PI * 2; SP[i] = 0.16 + rnd() * 0.14; SD[i] = rnd(); DL[i] = rnd();
      JX[i] = gauss() * 0.05; JY[i] = gauss() * 0.05; JZ[i] = gauss() * 0.05;
      SX[i] = 0.12 + rnd() * 0.76; SY[i] = 0.82 + rnd() * 0.3;
    }
    let W = 0, H = 0, DPR = 1, L = 200, active = false, first = true, last = performance.now();
    const t0 = last;
    let mx = 0, my = 0, smx = 0, smy = 0;
    const layout = () => { DPR = Math.min(2, devicePixelRatio || 1); W = sec.clientWidth; H = sec.clientHeight; cv.width = W * DPR; cv.height = H * DPR; L = Math.min(W * (W < 768 ? 0.29 : 0.21), 290); };
    layout(); addEventListener('resize', layout);
    const io = new IntersectionObserver((es) => { active = es[0].isIntersecting; }, { rootMargin: '200px' }); io.observe(sec);
    const onMove = (e: PointerEvent) => { const r = sec.getBoundingClientRect(); mx = ((e.clientX - r.left) / W) * 2 - 1; my = ((e.clientY - r.top) / H) * 2 - 1; };
    sec.addEventListener('pointermove', onMove);
    const ss = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    const COL = ['rgba(150,196,255,.55)', 'rgba(77,150,245,.8)', 'rgba(16,98,214,.95)', 'rgba(10,64,160,1)', 'rgba(205,229,255,1)', 'rgba(130,165,214,.55)'];
    const SZ = [1.2, 1.6, 2, 2.3, 2.2, 1.4];
    const frame = (now: number) => {
      if (!active && !first) return;
      const t = reduced ? 2 : (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      const p = progress.current, rise = ss((p - 0.25) / 0.6);
      smx += (mx - smx) * 0.05; smy += (my - smy) * 0.05;
      const CX = W / 2, CY = H * (0.64 - 0.07 * rise);
      mark.style.top = `${CY}px`;
      const ry = (reduced ? 0.25 : Math.sin(t * 0.35) * 0.3) + smx * 0.25, rx = 0.38 + smy * 0.12;
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), D = 4.2;
      const k = first ? 1 : 1 - Math.pow(0.86, dt * 60);
      for (let i = 0; i < N; i++) {
        if (!reduced) T[i] += dt * SP[i] * (0.25 + 0.75 * rise);
        const s0 = Math.sin(T[i]), c0 = Math.cos(T[i]), d = 1 + s0 * s0;
        const x = (c0 / d) * 1.25 + JX[i], y = ((s0 * c0) / d) * 1.25 + JY[i], z = s0 * 0.3 + JZ[i];
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
        const pr = D / (D - z2), gx = CX + x1 * pr * L, gy = CY - y1 * pr * L;
        const m = ss((p - 0.28 - DL[i] * 0.32) / 0.4);
        const ox = SX[i] * W + Math.sin(t * 0.6 + SD[i] * 9) * 10, oy = SY[i] * H;
        const lift = Math.sin(m * Math.PI) * -40;
        PX[i] += ((ox + (gx - ox) * m) - PX[i]) * k;
        PY[i] += ((oy + (gy - oy) * m + lift) - PY[i]) * k;
        if (m < 0.5) BK[i] = 5;
        else if (Math.cos(T[i] - t * 1.3) > 0.985) BK[i] = 4;
        else BK[i] = z2 > 0.22 ? 3 : z2 > 0 ? 2 : z2 > -0.22 ? 1 : 0;
      }
      first = false;
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      for (let b = 0; b < 6; b++) { g.fillStyle = COL[b]; const z = SZ[b] * (MOB ? 0.9 : 1); for (let i = 0; i < N; i++) if (BK[i] === b) g.fillRect(PX[i] - z / 2, PY[i] - z / 2, z, z); }
      cap.style.opacity = String(ss((p - 0.86) / 0.12));
    };
    const tick = () => frame(performance.now());
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); removeEventListener('resize', layout); sec.removeEventListener('pointermove', onMove); };
  }, [secRef, reduced]);
  return progress;
}

/**
 * 11 · Ending: clouds close in from the sides (the intro, reversed) and a
 * 3D particle loop rises between them — loop only, no wordmark — then the
 * white footer. Pinned 170%, scrub .8 on desktop (demo values).
 */
export function EndLoop({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const progress = useEndLoop(ref, reduced);

  useScrollScene(ref, (mm) => {
    const sec = ref.current!;
    const q = (s: string) => sec.querySelector<HTMLElement>(s)!;
    const box = { get p() { return progress.current; }, set p(v: number) { progress.current = v; } };
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=170%', pin: true, scrub: 0.8 } });
      tl.to(box, { p: 1, ease: 'none', duration: 1 }, 0)
        .fromTo(q('#gh-endL'), { xPercent: -75 }, { xPercent: 0, ease: 'power2.out', duration: 0.6 }, 0)
        .fromTo(q('#gh-endR'), { xPercent: 75 }, { xPercent: 0, ease: 'power2.out', duration: 0.6 }, 0)
        .fromTo(q('#gh-frontL'), { xPercent: -30, yPercent: 30 }, { xPercent: 0, yPercent: 0, ease: 'power2.out', duration: 0.7 }, 0)
        .fromTo(q('#gh-frontR'), { xPercent: 30, yPercent: 30 }, { xPercent: 0, yPercent: 0, ease: 'power2.out', duration: 0.7 }, 0);
      gsap.fromTo(q('.gh-end-copy'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 75%', end: 'top 10%', scrub: 0.6 } });
    });
    mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(box, { p: 0 }, { p: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'bottom bottom', scrub: 0.6 } });
    });
  });

  return (
    <section ref={ref} className="gh-end" id="end">
      <div className="gh-end-copy">
        <span className="gh-mono" style={{ color: '#2a5a97' }}>Open beta</span>
        <h2 style={{ marginTop: 14 }}>Close the <span className="gh-acc">loop.</span></h2>
        <p className="gh-lead">Bring the idea. We'll bring the team, the brief and the proof.</p>
        <div className="gh-ctas"><Link className="gh-pill gh-dark" to="/join">Join WebLoop <span className="gh-arr">→</span></Link><Link className="gh-pill gh-light" to="/explore">Browse projects</Link></div>
      </div>
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: endBack }} />
      <canvas className="gh-end-canvas" aria-hidden="true" />
      <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: endFront }} />
      <div className="gh-end-fade" />
      <span className="gh-end-mark" id="gh-endMark" data-orb="hide" />
      <div className="gh-end-cap" id="gh-endCap"><span>Idea</span><i /><span>Team</span><i /><span>Verified work</span></div>
    </section>
  );
}
