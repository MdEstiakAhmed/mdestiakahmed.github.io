import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AdditiveBlending, Color, NormalBlending, type Points, type ShaderMaterial } from 'three';

import { shapes } from '@/components/hero/shapes';
import type { Theme } from '@/lib/theme';

interface FieldProps {
  count: number;
  theme: Theme;
  /** 0..1 scroll progress through the hero track. */
  progress: RefObject<number>;
}

const PALETTE: Record<Theme, { a: string; b: string; size: number; opacity: number }> = {
  // Brand blue (#507fc0) into cyan, glowing on dark.
  dark: { a: '#5b8fd8', b: '#22d3ee', size: 34, opacity: 0.85 },
  light: { a: '#2f5fa8', b: '#0891b2', size: 30, opacity: 0.75 },
};

const vertexShader = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.35 + aSeed * 0.65) / -mv.z;
    vSeed = aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(mix(uColorA, uColorB, vSeed), alpha * uOpacity);
  }
`;

const smooth = (t: number): number => t * t * (3 - 2 * t);

function createBuffers(count: number): { positions: Float32Array; seeds: Float32Array } {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Start scattered so the first frames read as particles converging.
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    seeds[i] = Math.random();
  }
  return { positions, seeds };
}

function Particles({ count, theme, progress }: FieldProps) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const spin = useRef(0);
  const { viewport, gl } = useThree();

  const [targets, setTargets] = useState<Float32Array[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Shapes rasterise text, so wait for Poppins before sampling.
    void document.fonts.ready.then(() => {
      if (!cancelled) setTargets(shapes.map((s) => s.build(count)));
    });
    return () => {
      cancelled = true;
    };
  }, [count]);

  const { positions, seeds } = useMemo(() => createBuffers(count), [count]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: PALETTE[theme].size },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.75) },
      uColorA: { value: new Color(PALETTE[theme].a) },
      uColorB: { value: new Color(PALETTE[theme].b) },
      uOpacity: { value: PALETTE[theme].opacity },
    }),
    // Theme changes are applied imperatively below; uniforms are created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const m = material.current;
    if (!m) return;
    const p = PALETTE[theme];
    m.uniforms.uColorA?.value.set(p.a);
    m.uniforms.uColorB?.value.set(p.b);
    if (m.uniforms.uSize) m.uniforms.uSize.value = p.size;
    if (m.uniforms.uOpacity) m.uniforms.uOpacity.value = p.opacity;
    m.blending = theme === 'dark' ? AdditiveBlending : NormalBlending;
    m.needsUpdate = true;
  }, [theme]);

  useFrame(({ pointer, clock }, delta) => {
    const obj = points.current;
    if (!obj || !targets) return;
    const dt = Math.min(delta, 1 / 30);
    const t = clock.elapsedTime;

    const segments = targets.length - 1;
    const scaled = Math.min(Math.max(progress.current ?? 0, 0), 1) * segments;
    const index = Math.min(Math.floor(scaled), segments - 1);
    const mix = smooth(scaled - index);
    const from = targets[index];
    const to = targets[index + 1];
    if (!from || !to) return;

    // Fit narrow viewports (mobile canvas is full-width behind the text).
    obj.scale.setScalar(Math.min(1, viewport.width / 5.6));

    // Sphere spins; logos settle facing the camera.
    const logoWeight = Math.min(scaled, 1);
    spin.current += dt * 0.18 * (1 - logoWeight);
    obj.rotation.y = spin.current * (1 - logoWeight) + pointer.x * 0.25;
    obj.rotation.x = -pointer.y * 0.15;

    // Pointer in the particles' local plane, for the repel effect.
    const px = (pointer.x * viewport.width) / 2;
    const py = (pointer.y * viewport.height) / 2;
    const ease = 1 - Math.exp(-5 * dt);
    const attr = obj.geometry.attributes.position;
    if (!attr) return;
    const arr = attr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds[i] ?? 0;
      const wobble = Math.sin(t * 0.8 + seed * 40) * 0.03;
      let tx = (from[i3] ?? 0) + ((to[i3] ?? 0) - (from[i3] ?? 0)) * mix + wobble;
      let ty = (from[i3 + 1] ?? 0) + ((to[i3 + 1] ?? 0) - (from[i3 + 1] ?? 0)) * mix + wobble;
      const tz = (from[i3 + 2] ?? 0) + ((to[i3 + 2] ?? 0) - (from[i3 + 2] ?? 0)) * mix;

      const dx = tx - px;
      const dy = ty - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < 0.8) {
        const f = (0.8 - d2) * 0.9;
        tx += dx * f;
        ty += dy * f;
      }

      arr[i3] = (arr[i3] ?? 0) + (tx - (arr[i3] ?? 0)) * ease;
      arr[i3 + 1] = (arr[i3 + 1] ?? 0) + (ty - (arr[i3 + 1] ?? 0)) * ease;
      arr[i3 + 2] = (arr[i3 + 2] ?? 0) + (tz - (arr[i3 + 2] ?? 0)) * ease;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={theme === 'dark' ? AdditiveBlending : NormalBlending}
      />
    </points>
  );
}

interface Props extends FieldProps {
  active: boolean;
  onReady: () => void;
}

export default function ParticleField({ active, onReady, ...field }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7], fov: 45 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={onReady}
      aria-hidden="true"
    >
      <Particles {...field} />
    </Canvas>
  );
}
