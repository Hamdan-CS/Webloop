// Tiny PNG writer (no dependencies) for the demo's illustrated avatars and
// gradient banners. The storage buckets only accept png/jpeg/webp, so no SVG.
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encode an RGBA pixel function as a PNG buffer. px(x, y) => [r, g, b, a]. */
export function encodePng(width, height, px) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = px(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const smooth = (d, edge) => Math.max(0, Math.min(1, (edge - d) + 0.5)); // 1px anti-aliased edge

/**
 * Illustrated avatar: a simple friendly character (no photo) on a soft
 * background in the person's colour. variant changes the hair a little.
 */
export function avatarPng(color, variant = 0, size = 256) {
  const base = hex(color);
  const bgTop = mix(base, [255, 255, 255], 0.75);
  const bgBot = mix(base, [255, 255, 255], 0.45);
  const skin = [[241, 200, 160], [224, 172, 128], [198, 142, 101]][variant % 3];
  const hair = mix(base, [20, 20, 30], 0.55);
  const shirt = base;
  const ink = [40, 34, 46];
  const c = size / 2;
  return encodePng(size, size, (x, y) => {
    let col = mix(bgTop, bgBot, y / size);
    // shirt (shoulders)
    const sd = Math.hypot((x - c) / 1.15, y - size * 1.08) - size * 0.42;
    if (sd < 0.5) col = mix(col, shirt, smooth(sd, 0));
    // neck
    if (Math.abs(x - c) < size * 0.07 && y > size * 0.55 && y < size * 0.7) col = mix(skin, [0, 0, 0], 0.08);
    // head
    const hd = Math.hypot(x - c, (y - size * 0.44) / 1.08) - size * 0.2;
    if (hd < 0.5) col = mix(col, skin, smooth(hd, 0));
    // hair (top cap; variant 1 adds a side part, variant 2 is shorter)
    const capY = size * (variant === 2 ? 0.33 : 0.36);
    const hairD = Math.hypot(x - c, (y - size * 0.4) / 1.0) - size * 0.215;
    if (hairD < 0.5 && y < capY + (variant === 1 ? (x - c) * 0.18 : 0)) col = mix(col, hair, smooth(hairD, 0));
    // eyes
    for (const ex of [c - size * 0.075, c + size * 0.075]) {
      const ed = Math.hypot(x - ex, y - size * 0.45) - size * 0.018;
      if (ed < 0.5) col = mix(col, ink, smooth(ed, 0));
    }
    // smile
    const md = Math.abs(Math.hypot(x - c, y - size * 0.47) - size * 0.075);
    if (md < size * 0.012 && y > size * 0.5) col = mix(col, ink, 0.85);
    // cheeks
    for (const ex of [c - size * 0.12, c + size * 0.12]) {
      const cd = Math.hypot(x - ex, y - size * 0.51) - size * 0.025;
      if (cd < 0) col = mix(col, [240, 140, 150], 0.35);
    }
    return col;
  });
}

/** Soft diagonal gradient banner in the person's colour. */
export function bannerPng(color, width = 1200, height = 300) {
  const base = hex(color);
  const a = mix(base, [255, 255, 255], 0.82);
  const b = mix(base, [255, 255, 255], 0.5);
  return encodePng(width, height, (x, y) => {
    const t = (x / width) * 0.7 + (y / height) * 0.3;
    // two soft circles for depth
    const g1 = Math.max(0, 1 - Math.hypot(x - width * 0.8, y - height * 0.2) / (height * 1.2)) * 0.25;
    const g2 = Math.max(0, 1 - Math.hypot(x - width * 0.15, y - height * 1.1) / (height * 1.4)) * 0.2;
    return mix(mix(a, b, t), [255, 255, 255], g1 + g2);
  });
}
