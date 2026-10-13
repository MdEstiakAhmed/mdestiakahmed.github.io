/**
 * Tiny shared state between the hero intro timeline (a plain client script) and the
 * particle field (a React island). Both import this one module instance.
 */

export type HeroStatus = 'pending' | 'ready' | 'skip';

export const heroState: {
  /** 0..1 ignition progress. Scales particle convergence and opacity; 1 when no intro runs. */
  intro: number;
  /** ready: particle targets are built. skip: no 3D scene on this device. */
  status: HeroStatus;
} = { intro: 1, status: 'pending' };

export function setHeroStatus(status: HeroStatus): void {
  heroState.status = status;
  window.dispatchEvent(new Event('hero:status'));
}
