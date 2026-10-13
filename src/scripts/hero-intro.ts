/**
 * Hero ignition: a point of light appears, the cloud converges, then the name, tagline,
 * buttons and socials resolve. One GSAP timeline, under 2.5s. It only runs when the inline
 * script in Hero.astro added `html.hero-intro` (motion allowed); otherwise content is just there.
 */
import { heroState } from '@/components/hero/hero-state';

// Tuning.
const WAIT_FOR_SCENE_MS = 3500; // give up and simply reveal if the scene never reports in
const GSAP_TIMEOUT_MS = 1500; // once the scene is ready, how long to wait for the gsap chunk
const MOBILE_SPEED = 1.3; // timeline speed-up on narrow screens
// Everything the timeline sets inline. `translate` is deliberately absent: hero-depth owns it.
const ANIMATED_PROPS = 'opacity,transform,filter,color,textShadow,visibility';

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
  const spark = pin.querySelector('.hero-spark');
  const bloom = pin.querySelector('.hero-bloom');
  const poster = pin.querySelector('.hero-poster');
  const letters = gsap.utils.toArray<HTMLElement>('.hero-letter', pin);
  const fades = gsap.utils.toArray<HTMLElement>('.hero-fade', pin);

  // Read when the sweep starts, so a theme switch during the intro is honoured.
  const cyan = (): string =>
    getComputedStyle(pin).getPropertyValue('--hero-cyan').trim() || '#22d3ee';
  const mid = (letters.length - 1) / 2;

  // The glow elements are centred here, not in CSS: GSAP folds a CSS `translate` into its transform.
  gsap.set([spark, bloom], { xPercent: -50, yPercent: -50 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
  stopTimeline = () => {
    tl.kill();
    gsap.set([...letters, ...fades, poster, spark, bloom], { clearProps: ANIMATED_PROPS });
  };

  // 1. A single point of light, then the glow blooms around it.
  tl.fromTo(spark, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1, duration: 0.35 }, 0)
    .fromTo(bloom, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1.1 }, 0.1)
    .fromTo(poster, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 0.1)
    // 2. Particles converge: `intro` scales their ease speed and opacity (ParticleField).
    .to(heroState, { intro: 1, duration: 1.4, ease: 'power2.inOut' }, 0.35)
    .to(spark, { opacity: 0, scale: 2.4, duration: 0.5 }, 0.9)
    .to(bloom, { opacity: 0, duration: 0.9, ease: 'power1.out' }, 1.3)
    // 3. The name resolves: blur and spread settle, then one cyan light sweep through it.
    .fromTo(
      letters,
      {
        opacity: 0,
        yPercent: 60,
        filter: 'blur(12px)',
        x: (i: number) => (i - mid) * 7,
      },
      { opacity: 1, yPercent: 0, filter: 'blur(0px)', x: 0, duration: 0.75, stagger: 0.03 },
      0.9,
    )
    .to(
      letters,
      {
        color: () => cyan(),
        textShadow: () => `0 0 18px ${cyan()}99`,
        duration: 0.16,
        stagger: { each: 0.035, yoyo: true, repeat: 1 },
        ease: 'power1.inOut',
      },
      1.5,
    )
    // 4. Everything else, top to bottom.
    .fromTo(fades, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, 1.35);

  if (window.matchMedia('(max-width: 767px)').matches) tl.timeScale(MOBILE_SPEED);
}

void run();
