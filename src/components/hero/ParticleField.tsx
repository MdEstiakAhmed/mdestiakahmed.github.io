import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  NormalBlending,
  type Points,
  type ShaderMaterial,
} from 'three';

import { heroState, setHeroStatus } from '@/components/hero/hero-state';
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

// Gravity well around the cursor (units of the particles' local plane).
const WELL_RADIUS_SQ = 1.6;
const WELL_PULL = 0.22; // fraction of the distance a particle is drawn toward the cursor at the core
const WELL_SWIRL = 0.3; // tangential push, same scale
// Scroll exit: the warp runs over this last slice of the hero track.
const WARP_START = 0.85;
// Pointer-driven tilt catches up at this rate (per second).
const TILT_FOLLOW = 6;

const vertexShader = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uWarp;
  attribute float aSeed;
  varying float vSeed;
  varying vec2 vDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Warp: rush toward the camera, faster for some particles than others.
    mv.z = min(mv.z + uWarp * uWarp * (3.0 + aSeed * 4.0), -1.5);
    vec4 clip = projectionMatrix * mv;
    gl_Position = clip;
    float size = min(uSize * uPixelRatio * (0.35 + aSeed * 0.65) / -mv.z, 70.0 * uPixelRatio);
    gl_PointSize = size * (1.0 + uWarp * 1.5);
    vSeed = aSeed;
    // Radial screen direction (y flipped to match gl_PointCoord) to streak along.
    vec2 dir = clip.xy / clip.w;
    vDir = length(dir) > 0.0001 ? normalize(vec2(dir.x, -dir.y)) : vec2(1.0, 0.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uWarp;
  uniform float uIntro;
  varying float vSeed;
  varying vec2 vDir;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float along = dot(c, vDir);
    float across = length(c - vDir * along);
    float d = length(vec2(along / (1.0 + uWarp * 2.0), across));
    // Radial mask keeps alpha at zero before the sprite edge and corners, never box-aligned.
    float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * (1.0 - smoothstep(0.2, 0.5, length(c)));
    // Dim early in the warp so additive overlap cannot pile up into a flat wall.
    alpha *= (1.0 - smoothstep(0.1, 0.6, uWarp)) * (1.0 - uWarp * 0.5) * uIntro;
    gl_FragColor = vec4(mix(uColorA, uColorB, vSeed), alpha * uOpacity);
  }
`;

const smooth = (t: number): number => t * t * (3 - 2 * t);

function setUniform(m: ShaderMaterial | null, name: string, value: number): void {
  const u = m?.uniforms[name];
  if (u) u.value = value;
}

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
  // Cursor effects are for fine pointers only.
  const canHover = useMemo(
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    [],
  );

  // Mouse only: a touch tap must not leave the well or the tilt stuck. NDC, -1..1 over the canvas.
  const mouse = useRef({ x: 0, y: 0, over: false });
  const tilt = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const section = document.getElementById('home');
    if (!canHover || !section) return;
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return;
      const r = gl.domElement.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      mouse.current.over = true;
    };
    const onLeave = (): void => {
      mouse.current.over = false;
    };
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, [canHover, gl]);

  const [targets, setTargets] = useState<Float32Array[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Shapes rasterise text, so wait for Poppins before sampling.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      setTargets(shapes.map((s) => s.build(count)));
      setHeroStatus('ready');
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
      uWarp: { value: 0 },
      uIntro: { value: heroState.intro },
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
  }, [theme]);

  useFrame(({ clock }, delta) => {
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
    const scale = Math.min(1, viewport.width / 5.6);
    obj.scale.setScalar(scale);

    const pointer = mouse.current;
    const follow = 1 - Math.exp(-TILT_FOLLOW * dt);
    tilt.current.x += ((pointer.over ? pointer.x : 0) - tilt.current.x) * follow;
    tilt.current.y += ((pointer.over ? pointer.y : 0) - tilt.current.y) * follow;

    // Sphere spins; logos settle facing the camera.
    const logoWeight = Math.min(scaled, 1);
    spin.current += dt * 0.18 * (1 - logoWeight);
    obj.rotation.y = spin.current * (1 - logoWeight) + tilt.current.x * 0.25;
    obj.rotation.x = -tilt.current.y * 0.15;

    // Ignition and exit: `intro` slows convergence at the start, `warp` drives the shader.
    const intro = heroState.intro;
    const p = Math.min(Math.max(progress.current ?? 0, 0), 1);
    const warp = smooth(Math.min(Math.max((p - WARP_START) / (1 - WARP_START), 0), 1));
    setUniform(material.current, 'uWarp', warp);
    setUniform(material.current, 'uIntro', smooth(intro));
    obj.visible = warp < 0.999;

    // Pointer in the particles' local plane, for the gravity well.
    const wellOn = canHover && pointer.over;
    const px = (pointer.x * viewport.width) / 2 / scale;
    const py = (pointer.y * viewport.height) / 2 / scale;
    const ease = (1 - Math.exp(-5 * dt)) * intro;
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

      if (wellOn) {
        // Drawn toward the cursor with a little swirl; smooth falloff to nothing at the rim.
        const dx = px - tx;
        const dy = py - ty;
        const d2 = dx * dx + dy * dy;
        if (d2 < WELL_RADIUS_SQ) {
          const k = 1 - d2 / WELL_RADIUS_SQ;
          const f = k * k;
          tx += (dx * WELL_PULL - dy * WELL_SWIRL) * f;
          ty += (dy * WELL_PULL + dx * WELL_SWIRL) * f;
        }
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          usage={DynamicDrawUsage}
        />
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
