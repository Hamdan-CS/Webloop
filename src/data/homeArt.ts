/* ──────────────────────────────────────────────────────────────────────
 * Demonstration artwork — home page only.
 *
 * Ported 1:1 from webloop-home-demo_3.html's procedural SVG generator
 * (the `ART` table + `art()` + `av()` functions). Produces deterministic,
 * seeded data-URI SVG illustrations — no image assets, no network.
 * ────────────────────────────────────────────────────────────────────── */

type RNG = () => number;

function mul(s: number): RNG {
  let seed = s | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const uri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
const svgWrap = (inner: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${inner}</svg>`;
const lg = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const poly = (pts: [number, number][], f: string, extra = '') =>
  `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${f}" ${extra}/>`;

function ridge(r: RNG, base: number, amp: number, n: number, fill: string) {
  const pts: [number, number][] = [[0, 400]];
  for (let i = 0; i <= n; i++) pts.push([(i * 600) / n, base - (i % 2 ? r() * amp * 0.35 : amp * (0.45 + r() * 0.55))]);
  pts.push([600, 400]);
  return poly(pts, fill);
}
function trees(r: RNG, y: number, n: number, cols: [string, string]) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 620 - 10, h = 22 + r() * 34, w = h * 0.32, yy = y + r() * 14;
    o += poly([[x, yy - h], [x - w, yy - h * 0.35], [x + w, yy - h * 0.35]], cols[0]);
    o += poly([[x, yy - h * 0.7], [x - w * 1.35, yy], [x + w * 1.35, yy]], cols[1]);
  }
  return o;
}

export type ArtKind =
  | 'mountain' | 'sunset' | 'campus' | 'city' | 'neural' | 'dash' | 'cubes'
  | 'phones' | 'notes' | 'rays' | 'code' | 'orb' | 'office' | 'pixel';

const ART: Record<ArtKind, (seed: number) => string> = {
  mountain(s) {
    const r = mul(s * 17 + 3);
    let o = `<rect width="600" height="400" fill="url(#sk)"/><circle cx="${380 + r() * 80}" cy="95" r="34" fill="#fff8dc" opacity=".85"/>`;
    const far = ridge(r, 200, 110, 9, '#a9c2dd'), mid = ridge(r, 238, 110, 8, '#5f8aa6');
    o += far + mid;
    o += `<rect y="262" width="600" height="138" fill="url(#lk)"/><g transform="translate(0 524) scale(1 -1)" opacity=".32" clip-path="url(#cl)">${far}${mid}</g>`;
    o += ridge(r, 282, 48, 7, '#1d5a46') + trees(r, 284, 26, ['#14412f', '#1b5a42']);
    o += `<rect y="300" width="600" height="100" fill="url(#lk)" opacity=".55"/>` + trees(r, 396, 9, ['#0d3022', '#134230']);
    return svgWrap(o, lg('sk', [[0, '#6bb6f2'], [0.62, '#e3f4ff']]) + lg('lk', [[0, '#8fd0e0'], [1, '#2b7089']]) + '<clipPath id="cl"><rect y="262" width="600" height="138"/></clipPath>');
  },
  sunset(s) {
    const r = mul(s * 11 + 5);
    let o = `<rect width="600" height="400" fill="url(#sk)"/><circle cx="330" cy="236" r="64" fill="#ffe9a8" opacity=".35"/><circle cx="330" cy="236" r="34" fill="#fff4cf"/>`;
    o += `<rect y="250" width="600" height="150" fill="url(#wt)"/>`;
    for (let i = 0; i < 10; i++) o += `<rect x="${300 + r() * 60 - (40 * i) / 10}" y="${256 + i * 12}" width="${60 - i * 3 + r() * 20}" height="3" rx="1.5" fill="#ffd8a0" opacity="${0.7 - i * 0.05}"/>`;
    o += poly([[0, 400], [0, 238], [60, 248], [110, 230], [170, 252], [230, 255], [230, 400]], '#171a38') + poly([[600, 400], [600, 236], [520, 252], [460, 244], [410, 256], [410, 400]], '#171a38');
    o += `<rect y="262" width="600" height="3" fill="#10132b"/>` + [60, 180, 300, 420, 540].map((x) => `<rect x="${x}" y="258" width="5" height="22" fill="#10132b"/>`).join('');
    o += trees(r, 252, 12, ['#12142e', '#171a38']);
    return svgWrap(o, lg('sk', [[0, '#26235e'], [0.35, '#a23f7e'], [0.55, '#ff8a3d'], [0.64, '#ffd27a']]) + lg('wt', [[0, '#ff9a55'], [0.25, '#9a3f6e'], [1, '#1f1d4d']]));
  },
  campus(_s) {
    let o = `<rect width="600" height="400" fill="url(#sk)"/><rect y="300" width="600" height="100" fill="#5fae5a"/>`;
    o += `<rect x="130" y="170" width="340" height="140" fill="#b5523b"/>${poly([[120, 170], [300, 120], [480, 170]], '#5b3a3a')}<rect x="262" y="90" width="76" height="120" fill="#c1604a"/>${poly([[252, 92], [300, 48], [348, 92]], '#5b3a3a')}<circle cx="300" cy="135" r="13" fill="#f6e7b0" stroke="#7a3a2a" stroke-width="3"/>`;
    for (let i = 0; i < 9; i++) { const x = 148 + i * 36; if (x > 250 && x < 340) continue; o += `<rect x="${x}" y="196" width="16" height="30" rx="8" fill="#f9dfa0"/><rect x="${x}" y="254" width="16" height="30" rx="8" fill="#f9dfa0"/>`; }
    o += `<rect x="282" y="250" width="36" height="60" rx="18" fill="#3a2a2a"/><path d="M300 310L240 400h120z" fill="#d8cfb8"/>`;
    ([[60, 290, 64], [540, 290, 70], [96, 310, 48], [506, 314, 52]] as [number, number, number][]).forEach(([x, y, rr]) => { o += `<rect x="${x - 4}" y="${y}" width="8" height="40" fill="#5a3a22"/><circle cx="${x}" cy="${y - 8}" r="${rr}" fill="#2f7d4f"/><circle cx="${x - 14}" cy="${y - 20}" r="${rr * 0.6}" fill="#3f9a62" opacity=".8"/>`; });
    return svgWrap(o, lg('sk', [[0, '#7cc4f5'], [1, '#eaf7ff']]));
  },
  city(s) {
    const r = mul(s * 7 + 2);
    let o = `<rect width="600" height="400" fill="url(#sk)"/>`;
    const cols = ['#ffd166', '#ff5fa2', '#5ee7ff', '#b388ff'];
    for (let x = -10; x < 610;) {
      const w = 34 + r() * 40, h = 90 + r() * 210;
      o += `<rect x="${x}" y="${330 - h}" width="${w}" height="${h + 70}" fill="#0b0a24" stroke="#2a2060" stroke-width="1"/>`;
      for (let wy = 330 - h + 10; wy < 320; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 10) if (r() > 0.55) o += `<rect x="${wx}" y="${wy}" width="4" height="6" fill="${cols[(r() * 4) | 0]}" opacity="${0.5 + r() * 0.5}"/>`;
      x += w + 2 + r() * 6;
    }
    o += `<rect y="330" width="600" height="70" fill="url(#rd)"/>`;
    for (let i = 0; i < 6; i++) o += `<rect x="${r() * 560}" y="${340 + r() * 50}" width="${30 + r() * 60}" height="2" fill="${cols[(r() * 4) | 0]}" opacity=".6"/>`;
    return svgWrap(o, lg('sk', [[0, '#12082e'], [0.7, '#5a1f7a'], [1, '#c24a8a']]) + lg('rd', [[0, '#2b1659'], [1, '#07051a']]));
  },
  neural(s) {
    const r = mul(s * 5 + 1);
    const n: [number, number][] = [];
    for (let i = 0; i < 46; i++) { const a = r() * 6.283, d = Math.sqrt(r()); n.push([300 + Math.cos(a) * d * 250, 200 + Math.sin(a) * d * 150]); }
    let o = `<rect width="600" height="400" fill="url(#bg)"/><ellipse cx="300" cy="200" rx="200" ry="130" fill="#2f6bff" opacity=".18"/>`;
    n.forEach((a, i) => n.forEach((b, j) => { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 100) o += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#58c8ff" stroke-opacity=".45"/>`; }));
    n.forEach((a) => (o += `<circle cx="${a[0]}" cy="${a[1]}" r="${2 + r() * 3.5}" fill="#9be7ff"/><circle cx="${a[0]}" cy="${a[1]}" r="9" fill="#38bdf8" opacity=".18"/>`));
    return svgWrap(o, `<radialGradient id="bg"><stop offset="0" stop-color="#14307a"/><stop offset="1" stop-color="#050a22"/></radialGradient>`);
  },
  dash(s) {
    const r = mul(s * 3 + 4);
    const PL = [['#243b8a', '#0b1230', '#2563eb', '#06b6d4', '#8b5cf6'], ['#14532d', '#052e16', '#16a34a', '#0ea5e9', '#eab308'], ['#581c87', '#2e1065', '#a855f7', '#ec4899', '#38bdf8'], ['#7c2d12', '#431407', '#f97316', '#ef4444', '#fbbf24']][s % 4];
    let o = `<rect width="600" height="400" fill="url(#bg)"/><rect x="50" y="56" width="500" height="290" rx="16" fill="#f7f9fe"/><rect x="50" y="56" width="110" height="290" rx="16" fill="${PL[1]}"/><rect x="146" y="56" width="14" height="290" fill="${PL[1]}"/>`;
    for (let i = 0; i < 5; i++) o += `<rect x="68" y="${86 + i * 34}" width="${50 + r() * 28}" height="9" rx="4" fill="#fff" opacity=".4"/>`;
    [0, 1, 2].forEach((i) => (o += `<rect x="${176 + i * 118}" y="80" width="104" height="52" rx="10" fill="#fff" stroke="#e1e8f4"/><rect x="${188 + i * 118}" y="94" width="40" height="8" rx="4" fill="#9fb0cc"/><rect x="${188 + i * 118}" y="110" width="60" height="12" rx="4" fill="${[PL[2], PL[3], PL[4]][i]}"/>`));
    o += `<rect x="176" y="148" width="340" height="176" rx="10" fill="#fff" stroke="#e1e8f4"/>`;
    let d = 'M190 300';
    for (let i = 0; i <= 8; i++) d += ` L${190 + i * 40.5} ${300 - r() * 80 - i * 8}`;
    o += `<path d="${d} L514 312 L190 312Z" fill="${PL[2]}" opacity=".15"/><path d="${d}" fill="none" stroke="${PL[2]}" stroke-width="3"/>`;
    return svgWrap(o, lg('bg', [[0, PL[0]], [1, PL[1]]], 1, 1));
  },
  cubes(s) {
    const r = mul(s + 12);
    let o = `<rect width="600" height="400" fill="url(#bg)"/>`;
    const cube = (x: number, y: number, z: number, c: string[]) => `${poly([[x, y], [x + z, y - z * 0.5], [x + 2 * z, y], [x + z, y + z * 0.5]], c[0])}${poly([[x, y], [x + z, y + z * 0.5], [x + z, y + z * 1.5], [x, y + z]], c[1])}${poly([[x + 2 * z, y], [x + z, y + z * 0.5], [x + z, y + z * 1.5], [x + 2 * z, y + z]], c[2])}`;
    const pal = [['#4fd0ff', '#1e6bd6', '#123d94'], ['#7ee7ff', '#2b7fe0', '#173e96'], ['#a78bfa', '#4f46e5', '#2c2a8a']];
    const items: [number, number, number, string[]][] = [];
    for (let i = 0; i < 9; i++) items.push([40 + r() * 480, 120 + r() * 190, 40 + r() * 34, pal[(r() * 3) | 0]]);
    items.sort((a, b) => a[1] - b[1]).forEach((a) => (o += cube(...a)));
    return svgWrap(o, lg('bg', [[0, '#0a1a44'], [1, '#050b22']]));
  },
  phones(_s) {
    let o = `<rect width="600" height="400" fill="url(#bg)"/>`;
    ([[150, 40, -6], [320, 22, 5]] as [number, number, number][]).forEach(([x, y, rot], i) => {
      o += `<g transform="rotate(${rot} ${x + 70} ${y + 170})"><rect x="${x}" y="${y}" width="140" height="300" rx="26" fill="#0a0a14" stroke="#4b4b70" stroke-width="3"/><rect x="${x + 8}" y="${y + 8}" width="124" height="284" rx="20" fill="url(#sc${i})"/><circle cx="${x + 70}" cy="${y + 80}" r="26" fill="#fff" opacity=".9"/><rect x="${x + 24}" y="${y + 130}" width="92" height="10" rx="5" fill="#fff" opacity=".8"/><rect x="${x + 24}" y="${y + 152}" width="62" height="8" rx="4" fill="#fff" opacity=".5"/><path d="M${x + 22} ${y + 250} l22 -34 l20 18 l24 -44 l22 36" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
    });
    return svgWrap(o, lg('bg', [[0, '#3a2f6a'], [1, '#10122a']]) + lg('sc0', [[0, '#3b82f6'], [1, '#7c3aed']]) + lg('sc1', [[0, '#ec4899'], [1, '#6366f1']]));
  },
  notes(s) {
    const r = mul(s + 31);
    let o = `<rect width="600" height="400" fill="#d9c7a9"/><rect x="40" y="30" width="330" height="340" rx="8" fill="#fbfaf6" transform="rotate(-4 200 200)"/>`;
    for (let i = 0; i < 10; i++) o += `<rect x="70" y="${70 + i * 28}" width="${150 + r() * 130}" height="6" rx="3" fill="#c9cfe0" transform="rotate(-4 200 200)"/>`;
    o += `<rect x="300" y="60" width="260" height="260" rx="10" fill="#fff" transform="rotate(5 430 190)"/>`;
    for (let i = 0; i < 6; i++) { const h = 40 + r() * 120; o += `<rect x="${326 + i * 36}" y="${270 - h}" width="22" height="${h}" rx="3" fill="${['#7c8cf8', '#a78bfa', '#38bdf8'][i % 3]}" transform="rotate(5 430 190)"/>`; }
    o += `<rect x="440" y="330" width="130" height="24" rx="6" fill="#ffd36b" transform="rotate(-8 500 340)"/>`;
    return svgWrap(o);
  },
  rays(_s) {
    let o = `<rect width="600" height="400" fill="#06080e"/>`;
    for (let i = -6; i <= 6; i++) o += `<line x1="300" y1="200" x2="${300 + i * 110}" y2="${i % 2 ? 0 : 400}" stroke="#2a6bff" stroke-opacity=".5"/>`;
    for (let k = 1; k < 7; k++) { const w = (30 * k * k) / 2 + 20, h = w * 0.6; o += `<rect x="${300 - w}" y="${200 - h}" width="${w * 2}" height="${h * 2}" fill="none" stroke="#38bdf8" stroke-opacity="${0.5 - k * 0.05}"/>`; }
    o += poly([[280, 170], [320, 170], [330, 200], [270, 200]], '#e8eefc') + `<rect x="270" y="200" width="60" height="30" fill="#6b7ca8"/>` + `<circle cx="300" cy="200" r="120" fill="#2563eb" opacity=".12"/>`;
    return svgWrap(o);
  },
  code(s) {
    const r = mul(s + 8);
    let o = `<rect width="600" height="400" fill="#0a1020"/><rect width="600" height="30" fill="#131c35"/>`;
    const cs = ['#c4a8ff', '#6bc8ff', '#7ee0b5', '#ffb86b', '#6c7a99'];
    for (let i = 0; i < 14; i++) {
      let x = 40 + ((r() * 3) | 0) * 24;
      o += `<rect x="14" y="${48 + i * 25}" width="10" height="7" rx="2" fill="#2a3556"/>`;
      for (let j = 0; j < 4; j++) { const w = 30 + r() * 100; o += `<rect x="${x}" y="${50 + i * 25}" width="${w}" height="8" rx="4" fill="${cs[(r() * 5) | 0]}" opacity=".85"/>`; x += w + 10; if (x > 500) break; }
    }
    return svgWrap(o);
  },
  orb(s) {
    const r = mul(s + 20);
    let o = `<rect width="600" height="400" fill="#050a1c"/>`;
    for (let i = 0; i < 5; i++) o += `<ellipse cx="300" cy="210" rx="${70 + i * 34}" ry="${26 + i * 13}" fill="none" stroke="#38bdf8" stroke-opacity="${0.55 - i * 0.1}"/>`;
    o += `<circle cx="300" cy="190" r="70" fill="url(#g)"/>`;
    for (let i = 0; i < 40; i++) o += `<circle cx="${r() * 600}" cy="${r() * 400}" r="${r() * 1.8 + 0.4}" fill="#9be7ff" opacity="${r()}"/>`;
    return svgWrap(o, `<radialGradient id="g"><stop offset="0" stop-color="#bff4ff"/><stop offset=".4" stop-color="#3b82f6"/><stop offset="1" stop-color="#050a1c" stop-opacity="0"/></radialGradient>`);
  },
  office(s) {
    const hue = 160;
    const r = mul(s + 2);
    let o = `<rect width="600" height="400" fill="url(#bg)"/>`;
    for (let i = 0; i < 5; i++) o += `<rect x="${20 + i * 118}" y="20" width="96" height="140" rx="6" fill="#fff" opacity=".13"/>`;
    o += `<rect x="150" y="190" width="300" height="12" fill="#0b1020" opacity=".55"/>`;
    ([[190, 120], [300, 100], [400, 128]] as [number, number][]).forEach(([x, y]) => (o += `<rect x="${x - 50}" y="${y + 80}" width="100" height="62" rx="5" fill="#0b1020"/><rect x="${x - 44}" y="${y + 86}" width="88" height="50" rx="3" fill="hsl(${hue + 40} 90% 62%)" opacity=".85"/>`));
    for (let i = 0; i < 6; i++) { const x = r() * 600, h = 40 + r() * 60; o += `<ellipse cx="${x}" cy="${400 - h / 2}" rx="${16 + r() * 14}" ry="${h / 2}" fill="hsl(${120 + r() * 30} 50% ${22 + r() * 14}%)"/>`; }
    return svgWrap(o, lg('bg', [[0, `hsl(${hue} 55% 22%)`], [1, `hsl(${hue + 36} 65% 44%)`]]));
  },
  pixel(s) {
    const r = mul(s + 44);
    const c = 10;
    let o = '';
    const sky = ['#7f6bd8', '#a98be4', '#e8a6d0', '#ffc9a0', '#ffe3a8'];
    for (let y = 0; y < 24; y++) o += `<rect y="${y * c}" width="600" height="${c}" fill="${sky[Math.min(4, (y / 5) | 0)]}"/>`;
    let h = 15;
    for (let x = 0; x < 60; x++) { h += (r() - 0.5) * 3.6; h = clamp(h, 9, 20); for (let y = Math.round(h); y < 26; y++) o += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="${y - h < 2 ? '#6f6fb8' : '#5b5aa0'}"/>`; }
    for (let x = 0; x < 60; x++) { const top = x < 30 ? 25 - ((30 - x) >> 2) : 26; for (let y = top; y < 40; y++) o += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="${y === top ? '#4ecb5a' : y < top + 3 ? '#7a4e2d' : '#5a3a22'}"/>`; }
    for (let i = 0; i < 14; i++) { const x = (r() * 58) | 0, y = 24 + ((r() * 3) | 0), hh = 5 + ((r() * 4) | 0); o += `<rect x="${x * c + 3}" y="${(y - hh) * c}" width="4" height="${hh * c}" fill="#2a5a2e"/><rect x="${x * c - 8}" y="${(y - hh) * c}" width="26" height="${hh * c * 0.7}" fill="#2f8a3e"/>`; }
    o += `<rect x="310" y="210" width="10" height="10" fill="#ffd3a0"/><rect x="310" y="220" width="10" height="20" fill="#3b82f6"/><rect x="306" y="226" width="4" height="12" fill="#ff7a3d"/>`;
    return svgWrap(`<g shape-rendering="crispEdges">${o}</g>`);
  },
};

const artCache: Record<string, string> = {};
export function art(kind: ArtKind, seed = 1): string {
  const k = kind + seed;
  return artCache[k] ?? (artCache[k] = uri(ART[kind](seed)));
}

/* ---------- illustrated person avatars ---------- */
const SKIN = ['#f2c9a5', '#e3ad82', '#c98e63', '#9a6440', '#f7dcc0'];
const HAIR = ['#1a1a1f', '#3a2a20', '#5b3a22', '#8a5a32', '#16161a'];
const BG: [string, string][] = [['#6ee7f9', '#3b82f6'], ['#a78bfa', '#6366f1'], ['#fcd34d', '#fb923c'], ['#86efac', '#14b8a6'], ['#f9a8d4', '#a78bfa'], ['#93c5fd', '#60a5fa']];
const SHIRT = ['#1e3a5f', '#334155', '#7c3aed', '#0f766e', '#be123c', '#1d4ed8'];
function hashS(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

const avCache: Record<string, string> = {};
export function avatarArt(key: string, fem: boolean | null = null): string {
  const cacheKey = key + (fem === null ? '' : fem ? 'f' : 'm');
  if (avCache[cacheKey]) return avCache[cacheKey];
  const h = hashS(key);
  const sk = SKIN[h % 5], hr = HAIR[(h >>> 3) % 5], [b1, b2] = BG[(h >>> 5) % 6], sh = SHIRT[(h >>> 7) % 6];
  const f = fem === null ? (h >>> 9) % 2 === 0 : fem;
  const beard = !f && (h >>> 11) % 3 === 0;
  const glasses = (h >>> 13) % 4 === 0;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#b)"/>`;
  if (f) s += `<path d="M26 52c-2-26 12-34 24-34s26 8 24 34c-1 14 2 24 4 30H22c2-6 5-16 4-30z" fill="${hr}"/>`;
  s += `<path d="M14 100c2-20 16-26 36-26s34 6 36 26z" fill="${sh}"/><rect x="43" y="62" width="14" height="16" rx="5" fill="${sk}"/><ellipse cx="50" cy="48" rx="17" ry="20" fill="${sk}"/>`;
  s += f ? `<path d="M32 46c0-16 8-22 18-22s18 6 18 22c-6-8-12-12-18-12s-12 4-18 12z" fill="${hr}"/>` : `<path d="M32 44c-1-16 8-23 18-23s19 7 18 23c-3-6-8-9-18-9s-15 3-18 9z" fill="${hr}"/>`;
  if (beard) s += `<path d="M34 52c2 14 8 20 16 20s14-6 16-20c-4 7-9 9-16 9s-12-2-16-9z" fill="${hr}" opacity=".9"/>`;
  s += `<circle cx="43" cy="50" r="1.8" fill="#1b1b22"/><circle cx="57" cy="50" r="1.8" fill="#1b1b22"/><path d="M44 58q6 4 12 0" stroke="${beard ? '#f4d9c4' : '#b2574a'}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  if (glasses) s += `<circle cx="43" cy="50" r="5.5" fill="none" stroke="#1b1b22" stroke-width="1.4"/><circle cx="57" cy="50" r="5.5" fill="none" stroke="#1b1b22" stroke-width="1.4"/><path d="M48.5 50h3" stroke="#1b1b22" stroke-width="1.4"/>`;
  return (avCache[cacheKey] = uri(s + '</svg>'));
}

/* ---------- company logo marks ---------- */
export type LogoKind = 'leaf' | 'f' | 'p' | 'cloud' | 'hex' | 'a';
const LOGOS: Record<LogoKind, string> = {
  leaf: '<path d="M8 28C8 14 18 6 32 6c0 14-8 24-22 24" fill="#16a34a"/><path d="M10 28c6-8 12-12 18-16" stroke="#dcfce7" stroke-width="2" fill="none" stroke-linecap="round"/>',
  f: '<rect x="9" y="6" width="22" height="9" rx="3" fill="#7c3aed"/><rect x="9" y="17" width="14" height="9" rx="3" fill="#a78bfa"/><rect x="9" y="28" width="8" height="7" rx="3" fill="#c4b5fd"/>',
  p: '<rect x="4" y="4" width="32" height="32" rx="8" fill="#0b0b12"/><path d="M13 29V11h8a6 6 0 010 12h-4" stroke="#ff4d8d" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  cloud: '<path d="M12 28a6 6 0 010-12 8 8 0 0115-2 6.5 6.5 0 011 14z" fill="url(#cg)"/><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e879f9"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>',
  hex: '<path d="M20 4l14 8v16l-14 8-14-8V12z" fill="#10b981"/><path d="M20 12l7 4v8l-7 4-7-4v-8z" fill="#d1fae5"/>',
  a: '<path d="M20 5L35 33h-8l-7-14-7 14H5z" fill="#2563eb"/><path d="M20 20l4 8h-8z" fill="#93c5fd"/>',
};
export function logoArt(kind: LogoKind): string {
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${LOGOS[kind]}</svg>`);
}
