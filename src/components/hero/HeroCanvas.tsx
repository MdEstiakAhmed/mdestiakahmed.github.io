import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { shapes } from '@/components/hero/shapes';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/use-theme';

const ParticleField = lazy(() => import('@/components/hero/ParticleField'));

interface Capability {
  enabled: boolean;
  count: number;
}

/** Gate the 3D scene: reduced motion, no WebGL or a weak device keep the static poster. */
function detectCapability(): Capability {
  const off = { enabled: false, count: 0 };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return off;

  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2) return off;

  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return off;
  } catch {
    return off;
  }

  const mobile = window.matchMedia('(max-width: 767px)').matches;
  return { enabled: true, count: mobile ? 2200 : 5200 };
}

interface Props {
  /** id of the tall scroll track the hero is pinned inside. */
  trackId: string;
}

export default function HeroCanvas({ trackId }: Props) {
  const theme = useTheme();
  const [capability] = useState(detectCapability);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const progress = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  // Opt the page into the pinned scroll track only when the scene actually runs.
  useEffect(() => {
    if (!capability.enabled) return;
    const html = document.documentElement;
    html.classList.add('hero-3d');
    return () => html.classList.remove('hero-3d');
  }, [capability.enabled]);

  useEffect(() => {
    if (!capability.enabled) return;
    const track = document.getElementById(trackId);
    if (!track) return;

    const update = (): void => {
      const rect = track.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const value = distance > 0 ? -rect.top / distance : 0;
      progress.current = Math.min(Math.max(value, 0), 1);
      track.style.setProperty('--hero-progress', progress.current.toFixed(3));
      setActive(Math.round(progress.current * (shapes.length - 1)));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // Stop rendering once the hero is off screen.
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    io.observe(track);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      io.disconnect();
    };
  }, [capability.enabled, trackId]);

  if (!capability.enabled || !theme) return null;

  return (
    <div
      ref={root}
      className="absolute inset-0 transition-opacity duration-1000"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <ol
        aria-hidden="true"
        className="absolute right-6 bottom-8 z-10 hidden flex-col items-end gap-2 font-mono text-xs md:flex"
      >
        {shapes.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              'flex items-center gap-2 transition-all duration-500',
              i === active ? 'text-primary' : 'text-muted-foreground/50',
            )}
          >
            {s.label}
            <span
              className={cn(
                'h-px bg-current transition-all duration-500',
                i === active ? 'w-8' : 'w-3',
              )}
            />
          </li>
        ))}
      </ol>
      <Suspense fallback={null}>
        <ParticleField
          count={capability.count}
          theme={theme}
          progress={progress}
          active={visible}
          onReady={() => setReady(true)}
        />
      </Suspense>
    </div>
  );
}
