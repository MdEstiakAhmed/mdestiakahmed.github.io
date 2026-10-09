import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface GlobeItem {
  label: string;
  group: string;
}

interface Props {
  items: readonly GlobeItem[];
  /** Group to highlight; null highlights everything. */
  active: string | null;
  className?: string;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const AUTO_SPEED = 0.0025; // rad per frame around Y when idle
const FRICTION = 0.94;
const DRAG_GAIN = 0.006;

/** Evenly spread n points on a unit sphere (Fibonacci lattice). */
function fibonacciSphere(n: number): Vec3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
  });
}

/**
 * A sphere of skill labels. Positions are written straight to the DOM every frame, so React only
 * renders the labels once. Drag to spin; it drifts on its own and stops when off screen.
 */
export default function SkillGlobe({ items, active, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const points = useMemo(() => fibonacciSphere(items.length), [items.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let radius = 0;
    // Accumulated rotation, applied as Y (yaw) then X (pitch).
    let yaw = 0.6;
    let pitch = -0.25;
    let vYaw = reducedMotion ? 0 : AUTO_SPEED;
    let vPitch = 0;
    let dragging = false;
    let last = { x: 0, y: 0 };
    let visible = false;
    let frame = 0;

    const render = (): void => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      points.forEach((p, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        const x1 = p.x * cy + p.z * sy;
        const z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cp - z1 * sp;
        const z2 = p.y * sp + z1 * cp;
        const depth = (z2 + 1) / 2; // 0 back, 1 front
        el.style.transform = `translate(-50%, -50%) translate3d(${(x1 * radius).toFixed(1)}px, ${(y2 * radius).toFixed(1)}px, 0) scale(${(0.6 + depth * 0.55).toFixed(3)})`;
        el.style.opacity = (0.18 + depth * 0.82).toFixed(3);
        el.style.zIndex = String(Math.round(depth * 100));
      });
    };

    const tick = (): void => {
      frame = 0;
      if (!dragging) {
        // Ease back to the idle drift after a flick.
        vYaw = vYaw * FRICTION + (reducedMotion ? 0 : AUTO_SPEED) * (1 - FRICTION);
        vPitch *= FRICTION;
      }
      yaw += vYaw;
      pitch = Math.max(-1.2, Math.min(1.2, pitch + vPitch));
      render();
      const moving = dragging || Math.abs(vYaw) > 1e-4 || Math.abs(vPitch) > 1e-4;
      if (visible && moving) frame = requestAnimationFrame(tick);
    };
    const start = (): void => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const size = Math.min(entry.contentRect.width, entry.contentRect.height);
      // Leave room for the widest labels on narrow screens.
      radius = size * (size < 480 ? 0.32 : 0.38);
      render();
    });
    resize.observe(root);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) start();
    });
    io.observe(root);

    const onDown = (e: PointerEvent): void => {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      root.setPointerCapture(e.pointerId);
      start();
    };
    const onMove = (e: PointerEvent): void => {
      if (!dragging) return;
      vYaw = (e.clientX - last.x) * DRAG_GAIN;
      vPitch = (e.clientY - last.y) * -DRAG_GAIN;
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent): void => {
      dragging = false;
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
    };
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
    };
  }, [points]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        'relative aspect-square w-full cursor-grab touch-pan-y select-none active:cursor-grabbing',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_70%)]" />
      {items.map((item, i) => {
        const state = active === null ? 'all' : item.group === active ? 'on' : 'off';
        return (
          <span
            key={item.label}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className={cn(
              'absolute top-1/2 left-1/2 rounded-full px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-[color,background-color,filter] duration-300 will-change-transform',
              state === 'all' && 'text-foreground',
              state === 'on' && 'bg-primary/10 text-primary',
              state === 'off' && 'text-muted-foreground blur-[1px]',
            )}
            // Parked at the centre until the first frame places it.
            style={{ transform: 'translate(-50%, -50%)', opacity: 0 }}
          >
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
