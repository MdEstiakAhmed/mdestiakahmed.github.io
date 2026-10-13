/**
 * Hero rest state: layered mouse parallax plus a soft cyan spotlight that follows the cursor.
 * Fine pointers only, off for reduced motion. Nothing here touches the page-wide starfield.
 */

// Tuning: max travel in px per layer (sign flips direction), and how fast things catch up.
const DEPTH = { poster: 8, canvas: 18, text: -6 };
const FOLLOW = 0.1;
const SPOT_FADE = 0.08;

const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const section = document.getElementById('home');

if (fine && !reduced && section) {
  const poster = section.querySelector<HTMLElement>('.hero-poster');
  const canvas = section.querySelector<HTMLElement>('[data-hero-layer="canvas"]');
  const text = section.querySelector<HTMLElement>('.hero-content');
  const spot = section.querySelector<HTMLElement>('.hero-spot');

  // Targets and current values; pointer in -1..1 from the section centre, spot in px.
  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  let spotX = 0;
  let spotY = 0;
  let spotOn = 0;
  let spotTarget = 0;
  let frame = 0;
  let visible = true;

  const place = (el: HTMLElement | null, depth: number): void => {
    // `translate` keeps clear of the `transform` GSAP animates on the same layers' descendants.
    if (el) el.style.translate = `${(x * depth).toFixed(2)}px ${(y * depth).toFixed(2)}px`;
  };

  const tick = (): void => {
    frame = 0;
    x += (tx - x) * FOLLOW;
    y += (ty - y) * FOLLOW;
    spotOn += (spotTarget - spotOn) * SPOT_FADE;
    place(poster, DEPTH.poster);
    place(canvas, DEPTH.canvas);
    place(text, DEPTH.text);
    if (spot) {
      spot.style.setProperty('--sx', `${spotX.toFixed(1)}px`);
      spot.style.setProperty('--sy', `${spotY.toFixed(1)}px`);
      spot.style.setProperty('--spot-on', spotOn.toFixed(3));
    }
    const settled =
      Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001 && Math.abs(spotTarget - spotOn) < 0.002;
    if (!settled && visible) frame = requestAnimationFrame(tick);
  };
  const wake = (): void => {
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };

  section.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = section.getBoundingClientRect();
    spotX = e.clientX - r.left;
    spotY = e.clientY - r.top;
    tx = (spotX / r.width) * 2 - 1 || 0;
    ty = (spotY / r.height) * 2 - 1 || 0;
    spotTarget = 1;
    wake();
  });
  section.addEventListener('pointerleave', () => {
    tx = 0;
    ty = 0;
    spotTarget = 0;
    wake();
  });

  // Idle while the hero is off screen.
  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    if (visible) wake();
  }).observe(section);
}
