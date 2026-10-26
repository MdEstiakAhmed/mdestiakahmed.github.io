/**
 * Page loader: "LOADING..." decodes in upper case on a solid screen, then the screen dissolves like smoke.
 * GSAP drives the timeline. The smoke is a low-res noise mask drawn to a canvas and scaled up, which stays
 * smooth where a full-screen SVG turbulence filter would not. `loader:done` fires while the smoke is still
 * clearing, so the hero rises through it. Loader.astro carries an inline failsafe in case this bundle never runs.
 */

// Tuning.
const TEXT = 'LOADING...';
const SCRAMBLE_S = 0.5;
const HOLD_S = 0.15;
const SMOKE_S = 1.1;
const RELEASE_AT = 0.55; // share of the smoke after which the page is handed over
const FONT_WAIT_MS = 600; // cap on waiting for Anton before the scramble starts
const FAILSAFE_MS = 4000;
const SMOKE_DIVISOR = 6; // canvas px per CSS px
const SOFT = 0.28; // width of the wispy edge, in noise units

const root = document.documentElement;
const loader = document.getElementById('loader');
const label = loader?.querySelector<HTMLElement>('[data-loader-text]');
const canvas = loader?.querySelector<HTMLCanvasElement>('canvas');

/** Hands the page over: hero starts, scroll unlocks, clicks pass through. */
function release(): void {
  if (root.classList.contains('loader-done')) return;
  root.classList.add('loader-done');
  window.dispatchEvent(new Event('loader:done'));
}

function finish(): void {
  release();
  loader?.remove();
}

const at = (a: Float32Array, i: number): number => a[i] ?? 0;

/** Value-noise fBm, 0..1, contrast-stretched. Taller than the view so it can drift upward. */
function buildNoise(w: number, h: number, rows: number): Float32Array {
  const out = new Float32Array(w * rows);
  const octaves = 4;
  const baseCell = h / 3;
  const fade = (t: number): number => t * t * (3 - 2 * t);
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cell = baseCell / 2 ** o;
    const amp = 0.5 ** o;
    total += amp;
    const cols = Math.ceil(w / cell) + 2;
    const lattice = Float32Array.from({ length: cols * (Math.ceil(rows / cell) + 2) }, Math.random);
    for (let y = 0; y < rows; y++) {
      const gy = y / cell;
      const y0 = Math.floor(gy);
      const fy = fade(gy - y0);
      for (let x = 0; x < w; x++) {
        const gx = x / cell;
        const x0 = Math.floor(gx);
        const fx = fade(gx - x0);
        const i = y0 * cols + x0;
        const top = at(lattice, i) + (at(lattice, i + 1) - at(lattice, i)) * fx;
        const bottom = at(lattice, i + cols) + (at(lattice, i + cols + 1) - at(lattice, i + cols)) * fx;
        out[y * w + x] = at(out, y * w + x) + (top + (bottom - top) * fy) * amp;
      }
    }
  }
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.min(1, Math.max(0, (at(out, i) / total - 0.5) * 1.7 + 0.5));
  }
  return out;
}

interface Smoke {
  draw: (p: number) => void;
}

/** Null when canvas, or a colour format it can paint with, is unavailable. */
function createSmoke(el: HTMLCanvasElement, host: HTMLElement): Smoke | null {
  const w = Math.max(1, Math.ceil(window.innerWidth / SMOKE_DIVISOR));
  const h = Math.max(1, Math.ceil(window.innerHeight / SMOKE_DIVISOR));
  el.width = w;
  el.height = h;
  const ctx = el.getContext('2d');
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  if (!ctx || !maskCtx) return null;

  // The page background is an oklch() token; make sure the canvas can actually paint it.
  const color = getComputedStyle(host).backgroundColor;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = color;
  if (ctx.fillStyle === '#000000') return null;

  const driftRows = Math.ceil(h * 0.5);
  const noise = buildNoise(w, h, h + driftRows);
  const mask = maskCtx.createImageData(w, h);

  const draw = (p: number): void => {
    const q = -SOFT + p * (1 + 2 * SOFT);
    const shift = Math.round(p * driftRows);
    for (let y = 0; y < h; y++) {
      const bias = (1 - y / h) * 0.4; // lower rows clear first, so the smoke climbs
      const row = (y + shift) * w;
      for (let x = 0; x < w; x++) {
        const t = at(noise, row + x) * 0.6 + bias;
        const a = Math.min(1, Math.max(0, (t - q) / SOFT));
        mask.data[(y * w + x) * 4 + 3] = a * a * (3 - 2 * a) * 255;
      }
    }
    maskCtx.putImageData(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
  };
  return { draw };
}

/** Plain fade for when GSAP or the canvas is unavailable. */
function fadeOut(): void {
  release();
  if (!loader) return finish();
  loader.animate({ opacity: [1, 0] }, { duration: 500, easing: 'ease-out' }).finished.then(finish, finish);
}

async function run(el: HTMLElement, text: HTMLElement, surface: HTMLCanvasElement): Promise<void> {
  window.setTimeout(finish, FAILSAFE_MS);
  // A bfcache restore would otherwise show a loader frozen mid-sequence.
  window.addEventListener('pageshow', (e) => e.persisted && finish());

  const gsapMods = Promise.all([import('gsap'), import('gsap/ScrambleTextPlugin')]).catch(() => null);
  await Promise.race([
    document.fonts?.ready,
    new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
  ]);
  text.style.minWidth = `${text.offsetWidth}px`; // Anton is proportional: stop the word shifting as glyphs change

  const mods = await gsapMods;
  const smoke = mods ? createSmoke(surface, el) : null;
  if (!mods || !smoke) {
    text.style.visibility = 'visible';
    window.setTimeout(fadeOut, (SCRAMBLE_S + HOLD_S) * 1000);
    return;
  }

  const [{ gsap }, { ScrambleTextPlugin }] = mods;
  gsap.registerPlugin(ScrambleTextPlugin);

  const state = { p: 0 };
  const exitAt = SCRAMBLE_S + HOLD_S;
  gsap
    .timeline({ onComplete: finish })
    .to(
      text,
      {
        duration: SCRAMBLE_S,
        ease: 'none',
        scrambleText: { text: TEXT, chars: 'upperCase', speed: 0.6, revealDelay: 0 },
        onStart: () => {
          text.style.visibility = 'visible';
        },
      },
      0,
    )
    .call(
      () => {
        smoke.draw(0); // opaque, same colour as the page-level background: no seam on the swap
        el.classList.add('smoke');
      },
      [],
      exitAt,
    )
    .to(text, { duration: 0.5, ease: 'power2.in', opacity: 0, y: -24, filter: 'blur(8px)' }, exitAt)
    .to(
      state,
      { duration: SMOKE_S, ease: 'power1.inOut', p: 1, onUpdate: () => smoke.draw(state.p) },
      exitAt,
    )
    .call(release, [], exitAt + SMOKE_S * RELEASE_AT);
}

if (loader && label && canvas && !root.classList.contains('loader-done')) void run(loader, label, canvas);
