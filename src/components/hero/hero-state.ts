/**
 * Tiny shared state between the hero's plain client scripts (intro timeline, scroll) and the
 * 3D monogram (a React island). Both import this one module instance.
 */

export type HeroStatus = 'pending' | 'ready' | 'skip';

export const heroState: {
  /** 0..1 intro progress. Scales and turns the monogram in; 1 when no intro runs. */
  intro: number;
  /** 0..1 scroll progress through the pinned hero track. */
  progress: number;
  /** ready: the 3D scene is up. skip: no 3D scene on this device. */
  status: HeroStatus;
} = { intro: 1, progress: 0, status: 'pending' };

export function setHeroStatus(status: HeroStatus): void {
  heroState.status = status;
  window.dispatchEvent(new Event('hero:status'));
}
