// Data + view maths for the photoreal campus hero. Image space is the 1672x941
// source render, y-down. All hotspot polygons were verified against overlays.
export const IMG_W = 1672;
export const IMG_H = 941;
export const IMG_A = IMG_W / IMG_H;

export type RegionKey = 'univ' | 'comp' | 'stud' | 'team' | 'proj';

export interface Region {
  key: RegionKey;
  /** index into ENTITIES */
  e: number;
  poly: [number, number][];
  /** pin anchor, image px */
  anchor: [number, number];
  side: 'r' | 'l';
  /** estimated depth 0..1 (matches the aux map) for pin parallax */
  depth: number;
}

export const REGIONS: Region[] = [
  { key: 'univ', e: 1, anchor: [868, 215], side: 'r', depth: 0.3, poly: [[625,350],[775,338],[790,310],[825,262],[832,250],[868,198],[912,250],[920,295],[1000,320],[1100,330],[1226,352],[1226,420],[1130,448],[1040,462],[980,470],[860,462],[800,460],[700,440],[626,415]] },
  { key: 'comp', e: 2, anchor: [1434, 200], side: 'l', depth: 0.26, poly: [[1243,98],[1531,38],[1626,62],[1626,325],[1672,325],[1672,452],[1500,452],[1400,448],[1160,422],[1160,368],[1243,366]] },
  { key: 'stud', e: 0, anchor: [560, 500], side: 'r', depth: 0.52, poly: [[340,412],[470,398],[520,394],[700,425],[830,452],[790,462],[788,560],[785,624],[560,628],[420,615],[385,590],[375,500],[345,445]] },
  { key: 'team', e: 4, anchor: [1290, 560], side: 'l', depth: 0.56, poly: [[1075,455],[1250,447],[1500,452],[1560,470],[1520,520],[1490,668],[1300,655],[1160,640],[1085,600],[1090,520]] },
  { key: 'proj', e: 3, anchor: [960, 640], side: 'r', depth: 0.45, poly: [[730,650],[860,612],[1080,610],[1200,665],[1250,690],[1150,745],[1010,742],[880,705]] },
];

export interface EntityDef {
  k: 'students' | 'universities' | 'companies' | 'projects' | 'teams';
  t: string;
  go: 'gallery' | 'join' | 'companies' | 'explore' | 'team';
  role?: string;
  items: string[];
  blurb: string;
  cta: string;
}

export const ENTITIES: EntityDef[] = [
  { k: 'students', t: 'Students', go: 'gallery', items: ['Find real projects', 'Build with a team', 'Show verified work'], blurb: 'Students find real projects, build with cross-skill teams, and turn finished work into a verified profile that employers can trust.', cta: 'See student work' },
  { k: 'universities', t: 'Universities', go: 'join', role: 'university', items: ['Connect students to industry', 'Run project programs', 'Track real outcomes'], blurb: 'Universities connect their students to real industry work. Run project programs, guide teams and track verified outcomes, all in one place.', cta: 'Join as a university' },
  { k: 'companies', t: 'Companies', go: 'companies', items: ['Discover talented students', 'Post real challenges', 'Hire from proven work'], blurb: 'Companies post real challenges, discover talented students through proven work, and hire people who have already shipped.', cta: 'Explore companies' },
  { k: 'projects', t: 'Projects', go: 'explore', items: ['Turn ideas into products', 'Get industry feedback', 'Create real impact'], blurb: 'Projects start as ideas and grow into working products, with feedback from industry along the way and real impact at the end.', cta: 'Explore projects' },
  { k: 'teams', t: 'Teams', go: 'team', items: ['Form cross-skill teams', 'Collaborate and build', 'Ship real solutions'], blurb: 'Teams bring the right mix of skills together to collaborate, build and ship real solutions, with every contribution recorded.', cta: 'See how teams work' },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export interface View { z: number; cx: number; cy: number }

/** visible window of the image in uv (y-down): [ox, oy, sw, sh] */
export function viewRect(W: number, H: number, v: View): [number, number, number, number] {
  const a = W / Math.max(1, H);
  let sx = 1, sy = 1;
  if (a >= IMG_A) sy = IMG_A / a; else sx = a / IMG_A;
  const sw = sx / v.z, sh = sy / v.z;
  // zoomed out past the art (sw/sh > 1): the faded edges of the render blend into the page
  const ox = sw >= 1 ? (v.cx > 0.75 ? 1 - sw : (1 - sw) / 2) : clamp(v.cx - sw / 2, -0.3, 1 - sw);
  const oy = sh >= 1 ? (1 - sh) / 2 : clamp(v.cy - sh / 2, 0, 1 - sh);
  return [ox, oy, sw, sh];
}

/** resting view: desktop is right-aligned (copy sits over the faded left), stacked is centred on the campus */
export function restView(W: number, H: number, stacked: boolean): View {
  const a = W / Math.max(1, H);
  if (stacked) return { z: 1, cx: a < 0.9 ? 0.6 : a < 1.5 ? 0.57 : 0.5, cy: 0.5 };
  // full-bleed: art fills the stage, top-aligned so the clear sky stays behind the headline
  return { z: 1, cx: a < IMG_A ? 1 : 0.5, cy: a >= IMG_A ? IMG_A / a / 2 : 0.5 };
}

/** view that frames a whole region (its bounding box fits with margin), never zooming past 1.5 */
export function focusView(W: number, H: number, r: Region, stacked: boolean): View {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  r.poly.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const [, , sw1, sh1] = viewRect(W, H, { z: 1, cx: 0.5, cy: 0.5 });
  const bw = (x1 - x0) / IMG_W, bh = (y1 - y0) / IMG_H;
  const z = clamp(Math.min((0.62 * sw1) / bw, (0.66 * sh1) / bh), 1.08, 1.5);
  const [, , sw, sh] = viewRect(W, H, { z, cx: 0.5, cy: 0.5 });
  const cx = (x0 + x1) / 2 / IMG_W, cy = (y0 + y1) / 2 / IMG_H;
  // desktop: park the building right of centre so the left (silver) area is free for the role panel
  const off = stacked ? 0 : 0.12;
  return { z, cx: clamp(cx - off * sw, sw / 2 - 0.3, 1 - sw / 2), cy: clamp(cy, sh / 2, 1 - sh / 2) };
}

export function imgToStage(W: number, H: number, v: View, px: number, py: number): [number, number] {
  const [ox, oy, sw, sh] = viewRect(W, H, v);
  return [((px / IMG_W - ox) / sw) * W, ((py / IMG_H - oy) / sh) * H];
}

export function stageToImg(W: number, H: number, v: View, x: number, y: number): [number, number] {
  const [ox, oy, sw, sh] = viewRect(W, H, v);
  return [ox + (x / W) * sw, oy + (y / H) * sh];
}

export function inPoly(u: number, vv: number, poly: [number, number][]): boolean {
  const x = u * IMG_W, y = vv * IMG_H;
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function hitRegion(u: number, v: number): number {
  for (let i = 0; i < REGIONS.length; i++) if (inPoly(u, v, REGIONS[i].poly)) return i;
  return -1;
}
