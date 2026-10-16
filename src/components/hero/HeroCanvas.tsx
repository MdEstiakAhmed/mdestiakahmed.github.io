import { lazy, Suspense, useEffect, useState } from 'react';

import { setHeroStatus } from '@/components/hero/hero-state';
import { useTheme } from '@/lib/use-theme';

const CodeMonogram = lazy(() => import('@/components/hero/CodeMonogram'));

/** Gate the 3D scene: reduced motion, no WebGL or a weak device keep the static fallback. */
function detectCapability(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2) return false;

  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    return false;
  }
  return true;
}

interface Props {
  /** id of the tall scroll track the hero is pinned inside. */
  trackId: string;
}

export default function HeroCanvas({ trackId }: Props) {
  const theme = useTheme();
  const [enabled] = useState(detectCapability);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  // The inline probe in Hero.astro sets `hero-3d` before paint (keep the two checks in step);
  // this settles it for real and tells the intro whether there is a scene to wait for.
  useEffect(() => {
    const html = document.documentElement;
    if (!enabled) {
      html.classList.remove('hero-3d');
      setHeroStatus('skip');
      return;
    }
    html.classList.add('hero-3d');
    return () => html.classList.remove('hero-3d');
  }, [enabled]);

  // Stop rendering once the hero is off screen.
  useEffect(() => {
    if (!enabled) return;
    const track = document.getElementById(trackId);
    if (!track) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    io.observe(track);
    return () => io.disconnect();
  }, [enabled, trackId]);

  if (!enabled || !theme) return null;

  return (
    <div
      className="absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <Suspense fallback={null}>
        <CodeMonogram
          theme={theme}
          active={visible}
          onReady={() => {
            setReady(true);
            setHeroStatus('ready');
          }}
        />
      </Suspense>
    </div>
  );
}
