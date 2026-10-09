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

const drawBulb: Draw = (ctx, s) => {
  const c = s / 2;
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  // Glass
  ctx.beginPath();
  ctx.arc(c, s * 0.4, s * 0.24, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(c + s * 0.1, s * 0.66);
  ctx.lineTo(c - s * 0.1, s * 0.66);
  ctx.closePath();
  ctx.stroke();
  // Filament
  ctx.beginPath();
  ctx.moveTo(c - s * 0.07, s * 0.62);
  ctx.lineTo(c - s * 0.05, s * 0.44);
  ctx.lineTo(c, s * 0.5);
  ctx.lineTo(c + s * 0.05, s * 0.44);
  ctx.lineTo(c + s * 0.07, s * 0.62);
  ctx.stroke();
  // Base
  for (const y of [0.72, 0.79]) {
    ctx.beginPath();
    ctx.moveTo(c - s * 0.09, s * y);
    ctx.lineTo(c + s * 0.09, s * y);
    ctx.stroke();
  }
  // Rays
  for (const a of [-150, -115, -65, -30]) {
    const r = (a * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(r) * s * 0.31, s * 0.4 + Math.sin(r) * s * 0.31);
    ctx.lineTo(c + Math.cos(r) * s * 0.41, s * 0.4 + Math.sin(r) * s * 0.41);
    ctx.stroke();
  }
};

/** A small flowchart: one node branching into two, which join into a third. */
const drawPlan: Draw = (ctx, s) => {
  ctx.lineWidth = s * 0.03;
  const node = (x: number, y: number, w: number, h: number): void => {
    ctx.beginPath();
    ctx.roundRect(x * s, y * s, w * s, h * s, s * 0.03);
    ctx.fill();
  };
  const line = (pts: [number, number][]): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.stroke();
  };
  node(0.36, 0.1, 0.28, 0.14);
  node(0.1, 0.43, 0.28, 0.14);
  node(0.62, 0.43, 0.28, 0.14);
  node(0.36, 0.76, 0.28, 0.14);
  line([
    [0.5, 0.24],
    [0.5, 0.33],
    [0.24, 0.33],
    [0.24, 0.43],
  ]);
  line([
    [0.5, 0.33],
    [0.76, 0.33],
    [0.76, 0.43],
  ]);
  line([
    [0.24, 0.57],
    [0.24, 0.66],
    [0.76, 0.66],
    [0.76, 0.57],
  ]);
  line([
    [0.5, 0.66],
    [0.5, 0.76],
  ]);
};

/** Code brackets with a passing-test tick. */
const drawDevTest: Draw = (ctx, s) => {
  ctx.font = `600 ${s * 0.42}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('</>', s * 0.5, s * 0.36);
  ctx.lineWidth = s * 0.045;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.74, s * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.44, s * 0.74);
  ctx.lineTo(s * 0.49, s * 0.79);
  ctx.lineTo(s * 0.57, s * 0.69);
  ctx.stroke();
};

const drawRocket: Draw = (ctx, s) => {
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-s / 2, -s / 2);
  const c = s / 2;
  // Body
  ctx.beginPath();
  ctx.moveTo(c, s * 0.08);
  ctx.bezierCurveTo(c + s * 0.17, s * 0.2, c + s * 0.13, s * 0.5, c + s * 0.1, s * 0.66);
  ctx.lineTo(c - s * 0.1, s * 0.66);
  ctx.bezierCurveTo(c - s * 0.13, s * 0.5, c - s * 0.17, s * 0.2, c, s * 0.08);
  ctx.fill();
  // Fins
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(c + dir * s * 0.1, s * 0.48);
    ctx.lineTo(c + dir * s * 0.22, s * 0.68);
    ctx.lineTo(c + dir * s * 0.09, s * 0.64);
    ctx.fill();
  }
  // Window
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(c, s * 0.33, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Exhaust
  ctx.beginPath();
  ctx.moveTo(c - s * 0.07, s * 0.7);
  ctx.quadraticCurveTo(c, s * 0.95, c + s * 0.07, s * 0.7);
  ctx.fill();
  ctx.restore();
};

export const shapes: readonly ShapeDef[] = [
  { id: 'ideas', label: 'Ideas', build: (n) => fromDrawing(drawBulb, n, 4.8) },
  { id: 'planning', label: 'Planning', build: (n) => fromDrawing(drawPlan, n, 4.6) },
  { id: 'dev', label: 'Development and testing', build: (n) => fromDrawing(drawDevTest, n, 5) },
  { id: 'shipped', label: 'Shipped', build: (n) => fromDrawing(drawRocket, n, 4.8) },
];
