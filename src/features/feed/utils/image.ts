/** Center-crops an image file to a square and re-encodes it as WebP, capped at
 * `maxSize` px per side. Runs entirely in the browser via canvas — no upload
 * happens here, this just produces the Blob the caller uploads to Storage. */
export async function cropToSquareWebp(file: File, maxSize = 1080, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const outSize = Math.min(side, maxSize);

  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('WebP encoding failed'))),
      'image/webp',
      quality,
    );
  });
}

/** Resizes (never crops) an image file to fit within `maxSize` px on its
 * longer side and re-encodes as WebP — used for screenshot steps, where the
 * full frame matters and a 1:1 crop would cut off UI. */
export async function resizeToWebp(file: File, maxSize = 1080, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('WebP encoding failed'))), 'image/webp', quality);
  });
}

/** Reads a click/tap position on an element as a 0-100 percentage pair, for
 * the composer's tap-to-place screenshot hotspot. */
export function pointToPercent(e: { clientX: number; clientY: number }, rect: DOMRect): { x: number; y: number } {
  return {
    x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
    y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
  };
}
