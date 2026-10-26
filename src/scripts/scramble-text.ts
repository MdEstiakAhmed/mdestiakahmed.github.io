/**
 * Scrambles the header name on hover and keyboard focus, then settles back on the real text.
 * GSAP loads on the first trigger, so the header costs nothing until someone touches the name.
 * Skipped for reduced motion; touch devices have no hover, so the name stays static there.
 */

// Tuning.
const DURATION_S = 0.8;
const CHARS = 'upperAndLowerCase';

const el = document.querySelector<HTMLElement>('[data-scramble]');
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (el && motionOk) {
  const original = el.textContent?.trim() ?? '';
  let busy = false;

  // Poppins is proportional, so lock the width to stop the nav shifting while glyphs change.
  const lockWidth = (): void => {
    el.style.minWidth = `${el.offsetWidth}px`;
  };
  lockWidth();
  document.fonts?.ready.then(() => {
    el.style.minWidth = '';
    lockWidth();
  });

  const scramble = async (): Promise<void> => {
    if (busy || !original) return;
    busy = true;
    try {
      const [{ gsap }, { ScrambleTextPlugin }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrambleTextPlugin'),
      ]);
      gsap.registerPlugin(ScrambleTextPlugin);
      gsap.to(el, {
        duration: DURATION_S,
        ease: 'none',
        scrambleText: { text: original, chars: CHARS, speed: 0.6, revealDelay: 0.2 },
        onComplete: () => {
          el.textContent = original;
          busy = false;
        },
      });
    } catch {
      busy = false; // chunk failed to load: the real text is still there
    }
  };

  if (window.matchMedia('(hover: hover)').matches) el.addEventListener('pointerenter', scramble);
  el.addEventListener('focus', scramble);
}
