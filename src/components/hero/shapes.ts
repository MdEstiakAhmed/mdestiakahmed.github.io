/**
 * Point clouds the hero particles morph between. Each shape returns `count * 3`
 * floats in roughly a [-2.5, 2.5] cube so they can be lerped index-by-index.
 */

export interface ShapeDef {
  id: string;
  label: string;
  build: (count: number) => Float32Array;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Fibonacci sphere with a little radial jitter so it reads as a cloud, not a mesh. */
function sphere(count: number, radius = 2.1): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    const jitter = radius * (0.92 + Math.random() * 0.16);
    out[i * 3] = Math.cos(theta) * r * jitter;
    out[i * 3 + 1] = y * jitter;
    out[i * 3 + 2] = Math.sin(theta) * r * jitter;
  }
  return out;
}

type Draw = (ctx: CanvasRenderingContext2D, size: number) => void;

/**
 * Rasterise a 2D drawing, then sample `count` filled pixels into a thin 3D slab.
 * Sampling is random with replacement, so any shape works for any particle count.
 */
function fromDrawing(draw: Draw, count: number, scale = 4.6, depth = 0.35): Float32Array {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const out = new Float32Array(count * 3);
  if (!ctx) return sphere(count);

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  draw(ctx, size);

  const { data } = ctx.getImageData(0, 0, size, size);
  const filled: number[] = [];
  for (let i = 0; i < size * size; i++) {
    if ((data[i * 4 + 3] ?? 0) > 128) filled.push(i);
  }
  if (filled.length === 0) return sphere(count);

  for (let i = 0; i < count; i++) {
    const px = filled[Math.floor(Math.random() * filled.length)] ?? 0;
    const x = (px % size) + Math.random();
    const y = Math.floor(px / size) + Math.random();
    out[i * 3] = (x / size - 0.5) * scale;
    out[i * 3 + 1] = -(y / size - 0.5) * scale;
    out[i * 3 + 2] = (Math.random() - 0.5) * depth;
  }
  return out;
}

const drawReact: Draw = (ctx, s) => {
  const c = s / 2;
  ctx.lineWidth = s * 0.035;
  for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
    ctx.beginPath();
    ctx.ellipse(c, c, s * 0.44, s * 0.17, angle, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(c, c, s * 0.075, 0, Math.PI * 2);
  ctx.fill();
};

const drawTypeScript: Draw = (ctx, s) => {
  const pad = s * 0.12;
  const box = s - pad * 2;
  ctx.beginPath();
  ctx.roundRect(pad, pad, box, box, s * 0.06);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.font = `700 ${s * 0.42}px Poppins, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TS', s - pad * 1.5, s - pad * 1.45);
  ctx.globalCompositeOperation = 'source-over';
};

const drawCode: Draw = (ctx, s) => {
  ctx.font = `600 ${s * 0.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('</>', s / 2, s / 2);
};

export const shapes: readonly ShapeDef[] = [
  { id: 'sphere', label: 'Ideas', build: (n) => sphere(n) },
  { id: 'react', label: 'React', build: (n) => fromDrawing(drawReact, n) },
  { id: 'typescript', label: 'TypeScript', build: (n) => fromDrawing(drawTypeScript, n, 4) },
  { id: 'code', label: 'Shipped', build: (n) => fromDrawing(drawCode, n, 5.2) },
];
