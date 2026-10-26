/**
 * Skills scroll story: an image sequence (the code-writing frames) drawn on a canvas, scrubbed by
 * scroll progress through the pinned `#skills-track`. Progress also picks the active skill group.
 *
 * Cost: 4K frames are never all decoded or all downloaded. Compressed blobs are fetched only for a
 * window around the current frame, and only while the track is near the viewport. Only a smaller
 * window is decoded to downscaled bitmaps. Touch devices and phones use every third frame.
 * The pinned layout (`data-live`) turns on after the first frame decodes, so a browser that cannot
 * decode AVIF, a failed request, reduced motion or a short viewport keep the static grid.
 */

const urls = Object.entries(
  import.meta.glob<string>('/src/assets/code-frame/*.avif', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)
  // The source animation holds some frames: identical neighbours would stall the scrub.
  .filter((url, i, all) => url !== all[i - 1]);

const track = document.getElementById('skills-track');
const stage = track?.querySelector<HTMLElement>('.sk-stage');
const canvas = track?.querySelector<HTMLCanvasElement>('.sk-canvas');
const panels = [...(track?.querySelectorAll<HTMLElement>('.sk-panel') ?? [])];
const rail = [...(track?.querySelectorAll<HTMLElement>('.sk-rail-item') ?? [])];
const ctx = canvas?.getContext('2d');

const skip =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  window.matchMedia('(max-height: 559px)').matches || // the stage would not fit
  window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches || // 16:9 crops to a sliver
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

if (track && stage && canvas && ctx && urls.length && !skip) init(track, stage, canvas, ctx);

function init(
  track: HTMLElement,
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  const small = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const frames = urls.filter((_, i) => i % (small ? 3 : 1) === 0);
  const last = frames.length - 1;
  const bitmapWidth = small ? 800 : 1280;
  const radius = small ? 6 : 12; // frames decoded on each side of the current one
  const keep = radius + 2; // decoded frames beyond this are released
  const fetchRadius = radius * 4; // compressed frames fetched on each side
  const maxFetching = 6;
  const maxDecoding = 3;

  const blobs: (Blob | undefined)[] = new Array(frames.length);
  const bitmaps = new Map<number, ImageBitmap>();
  const fetching = new Set<number>();
  const decoding = new Set<number>();
  const failed = new Set<number>(); // never retried: a failing frame must not cost work per scroll
  let current = 0;
  let drawn: ImageBitmap | undefined;
  let activeGroup = -1;
  let near = false;
  let pin = 0;

  // Lazy: the panel-switch tween is a nice-to-have, never worth blocking init on.
  let gsap: typeof import('gsap').gsap | undefined;
  import('gsap')
    .then((m) => {
      gsap = m.gsap;
    })
    .catch(() => {});

  function resize(): void {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * scale);
    canvas.height = Math.round(canvas.clientHeight * scale);
    pin = parseFloat(getComputedStyle(stage).top) || 0;
    drawn = undefined;
    draw();
  }

  // Cover-fit the nearest decoded frame; stale frames beat a blank canvas while scrubbing fast.
  function draw(): void {
    let bitmap: ImageBitmap | undefined;
    for (let d = 0; d <= keep && !bitmap; d++) {
      bitmap = bitmaps.get(current - d) ?? bitmaps.get(current + d);
    }
    if (!bitmap || bitmap === drawn) return;
    drawn = bitmap;
    const s = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const w = bitmap.width * s;
    const h = bitmap.height * s;
    ctx.drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  // Indices around the current frame, nearest first.
  function* around(span: number): Generator<number> {
    for (let d = 0; d <= span; d++) {
      if (current + d <= last) yield current + d;
      if (d && current - d >= 0) yield current - d;
    }
  }

  async function decode(i: number): Promise<void> {
    const blob = blobs[i];
    if (!blob || bitmaps.has(i) || decoding.has(i) || failed.has(i) || decoding.size >= maxDecoding)
      return;
    decoding.add(i);
    try {
      const bitmap = await createImageBitmap(blob, { resizeWidth: bitmapWidth });
      if (Math.abs(i - current) > keep) bitmap.close();
      else bitmaps.set(i, bitmap);
      track.setAttribute('data-live', ''); // first decoded frame proves the story can play
    } catch {
      failed.add(i);
    }
    decoding.delete(i);
    draw();
    fill();
  }

  function fill(): void {
    for (const [i, bitmap] of bitmaps) {
      if (Math.abs(i - current) > keep) {
        bitmap.close();
        bitmaps.delete(i);
        if (bitmap === drawn) drawn = undefined;
      }
    }
    for (const i of around(radius)) void decode(i);
  }

  async function download(i: number): Promise<void> {
    const url = frames[i];
    if (!url) return;
    fetching.add(i);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      blobs[i] = await res.blob();
    } catch {
      failed.add(i);
    }
    fetching.delete(i);
    fill();
    prefetch();
  }

  // Fetch the window around the current frame, nearest first, only while the track is near.
  function prefetch(): void {
    if (!near) return;
    for (const i of around(fetchRadius)) {
      if (fetching.size >= maxFetching) return;
      if (!blobs[i] && !fetching.has(i) && !failed.has(i)) void download(i);
    }
  }

  function setGroup(index: number): void {
    if (index === activeGroup) return;
    activeGroup = index;
    panels.forEach((el, i) => {
      const active = i === index;
      el.toggleAttribute('data-active', active);
      el.toggleAttribute('data-past', i < index);
      // Incoming panel rises in; let gsap own the tween and hand transform/opacity back to
      // CSS once it settles, so the next (CSS-driven) data-past exit still transitions cleanly.
      if (active && gsap) {
        const tweenGsap = gsap;
        el.style.transition = 'none';
        tweenGsap.fromTo(
          el,
          { x: 48, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out',
            overwrite: 'auto',
            onComplete: () => {
              el.style.transition = '';
              tweenGsap.set(el, { clearProps: 'transform,opacity' });
            },
          },
        );
      }
    });
    rail.forEach((el, i) => el.toggleAttribute('data-active', i === index));
  }

  // Progress runs over the pinned travel: from the stage sticking to the stage leaving.
  function update(): void {
    const rect = track.getBoundingClientRect();
    const distance = rect.height - stage.offsetHeight;
    const raw = distance > 0 ? (pin - rect.top) / distance : 0;
    const progress = Math.min(Math.max(raw, 0), 1);
    track.style.setProperty('--sk-progress', progress.toFixed(3));
    setGroup(Math.min(panels.length - 1, Math.floor(progress * panels.length)));
    const index = Math.round(progress * last);
    if (index === current) return;
    current = index;
    draw();
    fill();
    prefetch();
  }

  let raf = 0;
  function schedule(): void {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  }

  new IntersectionObserver(
    ([entry]) => {
      near = entry?.isIntersecting ?? false;
      prefetch();
    },
    { rootMargin: '50% 0px' },
  ).observe(track);

  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  setGroup(0);
  resize();
  update();
}
