/**
 * Hero intro: the 3D monogram turns in while the name rises letter by letter, then the
 * copy, buttons and role list resolve. One GSAP timeline, under 2s. It only runs when the inline
 * script in Hero.astro added `html.hero-intro` (motion allowed); otherwise content is just there.
 */
import { heroState } from '@/components/hero/hero-state';

// Tuning.
const WAIT_FOR_SCENE_MS = 3500; // give up and simply reveal if the scene never reports in
const GSAP_TIMEOUT_MS = 1500; // once the scene is ready, how long to wait for the gsap chunk
const MOBILE_SPEED = 1.3; // timeline speed-up on narrow screens
// Everything the timeline sets inline. `translate` is deliberately absent: the hero CSS owns it.
const ANIMATED_PROPS = 'opacity,transform,filter,visibility';

const root = document.documentElement;

/** Keeps the still-invisible controls out of the tab order and the accessibility tree. */
function setContentInert(inert: boolean): void {
  document.querySelector('.hero-content')?.toggleAttribute('inert', inert);
}

// Replaced once the timeline exists; kills it and drops its inline styles.
let stopTimeline = (): void => {};

function finish(): void {
  stopTimeline();
  heroState.intro = 1;
  root.classList.add('hero-intro-done');
  setContentInert(false);
}

/** Resolves 'ready' or 'skip' from the canvas, or 'timeout'. */
function waitForScene(): Promise<string> {
  return new Promise((resolve) => {
    const check = (): boolean => {
      if (heroState.status === 'pending') return false;
      window.removeEventListener('hero:status', check);
      window.clearTimeout(timer);
      resolve(heroState.status);
      return true;
    };
    const timer = window.setTimeout(() => {
      window.removeEventListener('hero:status', check);
      resolve('timeout');
    }, WAIT_FOR_SCENE_MS);
    if (!check()) window.addEventListener('hero:status', check);
  });
}

async function run(): Promise<void> {
  if (!root.classList.contains('hero-intro')) return;
  heroState.intro = 0;
  setContentInert(true);

  // The page loader covers the hero until it hands over; the scene keeps loading behind it.
  if (!root.classList.contains('loader-done')) {
    await new Promise((resolve) => window.addEventListener('loader:done', resolve, { once: true }));
  }

  // A bfcache restore or tab close mid-intro must not strand hidden content.
  window.addEventListener('pagehide', finish, { once: true });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && !root.classList.contains('hero-intro-done')) finish();
  });

  const gsapModule = import('gsap').catch(() => null);
  const status = await waitForScene();
  const timeout = new Promise<null>((resolve) => window.setTimeout(resolve, GSAP_TIMEOUT_MS, null));
  const mod = await Promise.race([gsapModule, timeout]);
  // Already done: the safety net fired, so a late GSAP must not re-hide visible content.
  if (root.classList.contains('hero-intro-done')) return;
  if (status !== 'ready' || !mod) return finish();
  const { gsap } = mod;

  const pin = document.getElementById('home');
  if (!pin) return finish();
  const letters = gsap.utils.toArray<HTMLElement>('.hero-letter', pin);
  const fades = gsap.utils.toArray<HTMLElement>('.hero-fade', pin);
  const mid = (letters.length - 1) / 2;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
  stopTimeline = () => {
    tl.kill();
    gsap.set([...letters, ...fades], { clearProps: ANIMATED_PROPS });
  };

  tl
    // 1. The monogram turns in and settles (the scene reads `intro`).
    .to(heroState, { intro: 1, duration: 1.5, ease: 'power3.out' }, 0)
    // 2. The name rises letter by letter out of its mask, fanning in from the centre.
    .fromTo(
      letters,
      { opacity: 0, yPercent: 105, filter: 'blur(10px)', x: (i: number) => (i - mid) * 6 },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', x: 0, duration: 0.9, stagger: 0.04 },
      0.15,
    )
    // 3. Everything else, top to bottom.
    .fromTo(fades, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0.9);

  if (window.matchMedia('(max-width: 767px)').matches) tl.timeScale(MOBILE_SPEED);
}

void run();
