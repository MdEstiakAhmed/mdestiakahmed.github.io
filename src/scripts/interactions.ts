/**
 * Progressive-enhancement interactions shared across sections. Everything here is
 * opt-in via data attributes, and content stays fully visible without JS.
 *
 *  data-spotlight  card glow that follows the cursor (sets --mx / --my)
 *  data-tilt       3D tilt toward the cursor (fine pointers only)
 *  data-count-to   counts a number up when it scrolls into view
 *  data-clock      live time in the given IANA zone (data-clock="Asia/Dhaka")
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function initSpotlight(): void {
  if (!finePointer) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-spotlight]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }
}

function initTilt(): void {
  if (!finePointer || reducedMotion) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
    const max = Number(el.dataset.tilt) || 8;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateX(${-y * max}deg) rotateY(${x * max}deg)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }
}

function initCountUp(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-count-to]');
  if (reducedMotion) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        const target = Number(el.dataset.countTo);
        const duration = 1400;
        const start = performance.now();
        const tick = (now: number): void => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.6 },
  );
  for (const el of els) io.observe(el);
}

function initClocks(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-clock]')) {
    const format = new Intl.DateTimeFormat('en', {
      timeZone: el.dataset.clock,
      hour: 'numeric',
      minute: '2-digit',
    });
    const render = (): void => {
      el.textContent = format.format(new Date());
    };
    render();
    window.setInterval(render, 15_000);
  }
}

initSpotlight();
initTilt();
initCountUp();
initClocks();
