/**
 * Hero scroll: smooth scrolling (Lenis) plus one progress value for the pinned hero track.
 * Progress feeds the 3D monogram through `heroState`, the CSS through `--hero-progress`, and
 * the role list through `data-active`. Lenis scrolls the real window, so the native `scroll`
 * event is the single trigger. Reduced motion keeps native scrolling.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { heroState } from '@/components/hero/hero-state';

const ROLE_CYCLE_MS = 2400; // when the hero is not pinned, roles just rotate
const STORY_END = 0.85; // roles finish advancing here; the last slice is the hand-off

const track = document.getElementById('hero-track');
const roles = [...document.querySelectorAll<HTMLElement>('.hero-role')];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let active = 0;
function setActive(index: number): void {
  if (index === active) return;
  active = index;
  roles.forEach((el, i) => el.toggleAttribute('data-active', i === index));
}

function update(): void {
  if (!track) return;
  const distance = track.getBoundingClientRect().height - window.innerHeight;
  const raw = distance > 0 ? -track.getBoundingClientRect().top / distance : 0;
  const progress = Math.min(Math.max(raw, 0), 1);
  heroState.progress = progress;
  track.style.setProperty('--hero-progress', progress.toFixed(3));
  if (distance > 0) {
    setActive(Math.min(roles.length - 1, Math.floor((progress / STORY_END) * roles.length)));
  }
}

let frame = 0;
function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    update();
  });
}

if (!reduced) new Lenis({ autoRaf: true, lerp: 0.09, anchors: true });

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
update();

// Unpinned (phones, no WebGL): there is no scroll story, so the role list rotates on a timer.
if (!reduced && roles.length > 1) {
  window.setInterval(() => {
    const pinned = (track?.getBoundingClientRect().height ?? 0) > window.innerHeight * 1.5;
    if (!pinned && !document.hidden) setActive((active + 1) % roles.length);
  }, ROLE_CYCLE_MS);
}
