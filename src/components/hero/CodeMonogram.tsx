import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, MathUtils, PMREMGenerator, Shape, type Group, type Mesh } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { heroState } from '@/components/hero/hero-state';
import type { Theme } from '@/lib/theme';

const TAU = Math.PI * 2;

// Spacing of the three glyphs at rest, and how far the scroll story spreads them.
const GLYPH_X = 2.6;
const REST_WIDTH = 8.6; // world units the monogram needs; scales the group down on narrow views
// Follow rates (per second) for the scroll progress and the pointer tilt.
const SCROLL_FOLLOW = 5;
const TILT_FOLLOW = 4;

const PALETTE: Record<
  Theme,
  {
    color: string;
    emissive: string;
    metalness: number;
    roughness: number;
    rimA: string;
    rimB: string;
  }
> = {
  // Brand blue into cyan, as in the rest of the site.
  dark: {
    color: '#2a5aa8',
    emissive: '#08315a',
    metalness: 0.55,
    roughness: 0.2,
    rimA: '#5b8fd8',
    rimB: '#22d3ee',
  },
  light: {
    color: '#5b8fd8',
    emissive: '#0b3a66',
    metalness: 0.35,
    roughness: 0.24,
    rimA: '#2f5fa8',
    rimB: '#0891b2',
  },
};

const smoothstep = (a: number, b: number, v: number): number => {
  const t = MathUtils.clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A chevron: `dir` -1 points left (`<`), 1 points right (`>`). */
function chevron(dir: 1 | -1): Shape {
  const h = 1.5; // half height
  const w = 1.3; // horizontal run of one arm
  const t = 0.6; // stroke thickness along x
  const pts: [number, number][] = [
    [0, 0],
    [w, h],
    [w + t, h],
    [t, 0],
    [w + t, -h],
    [w, -h],
  ];
  // Left-pointing tip sits at x=0; mirror for `>`. Reversing keeps the winding counter-clockwise.
  const mapped = dir === -1 ? pts : pts.map(([x, y]): [number, number] => [-x, y]).reverse();
  const shape = new Shape();
  mapped.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function slash(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.55, -1.8);
  shape.lineTo(0.05, -1.8);
  shape.lineTo(0.55, 1.8);
  shape.lineTo(-0.05, 1.8);
  shape.closePath();
  return shape;
}

function extrude(shape: Shape): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 8,
    curveSegments: 1,
  });
  geometry.center();
  return geometry;
}

/** Image-based lighting from three's built-in room, so the glossy material has something to reflect. */
function Environment() {
  const gl = useThree((s) => s.gl);
  const target = useMemo(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const result = generator.fromScene(room, 0.04);
    room.dispose();
    generator.dispose();
    return result;
  }, [gl]);
  useEffect(() => () => target.dispose(), [target]);
  return <primitive object={target.texture} attach="environment" />;
}

function Monogram({ theme }: { theme: Theme }) {
  const palette = PALETTE[theme];
  const viewport = useThree((s) => s.viewport);
  const group = useRef<Group>(null);
  const left = useRef<Mesh>(null);
  const mid = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  const follow = useRef({ progress: 0, px: 0, py: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  const geometries = useMemo(
    () => ({ left: extrude(chevron(-1)), mid: extrude(slash()), right: extrude(chevron(1)) }),
    [],
  );
  useEffect(
    () => () => {
      geometries.left.dispose();
      geometries.mid.dispose();
      geometries.right.dispose();
    },
    [geometries],
  );

  // The canvas sits under the text, so track the pointer on the window instead.
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    const onMove = (e: PointerEvent): void => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g || !left.current || !mid.current || !right.current) return;
    const f = follow.current;
    const t = state.clock.elapsedTime;
    f.progress = MathUtils.damp(f.progress, heroState.progress, SCROLL_FOLLOW, delta);
    f.px = MathUtils.damp(f.px, pointer.current.x, TILT_FOLLOW, delta);
    f.py = MathUtils.damp(f.py, pointer.current.y, TILT_FOLLOW, delta);

    // Scroll story: split and spin, then close up and tuck into the corner.
    const split = smoothstep(0.1, 0.5, f.progress);
    const tuck = smoothstep(0.5, 0.85, f.progress);
    const spread = 1 + 0.75 * split - 1.25 * tuck;
    left.current.position.x = -GLYPH_X * spread;
    right.current.position.x = GLYPH_X * spread;
    left.current.rotation.y = split * TAU;
    right.current.rotation.y = -split * TAU;
    mid.current.rotation.x = split * TAU;

    const intro = MathUtils.clamp(heroState.intro, 0, 1);
    const fit = MathUtils.clamp(viewport.width / REST_WIDTH, 0.4, 1) * 0.85;
    g.scale.setScalar(fit * (0.6 + 0.4 * intro) * (1 - 0.45 * tuck));
    g.position.set(
      tuck * viewport.width * 0.22,
      viewport.height * 0.0 + tuck * viewport.height * 0.2 + Math.sin(t * 0.8) * 0.1,
      0,
    );
    g.rotation.set(f.py * 0.2, f.px * 0.35 + Math.sin(t * 0.5) * 0.08 - (1 - intro) * 1.2, 0);
  });

  return (
    <>
      <Environment />
      <directionalLight position={[-5, 3, 4]} intensity={2.2} color={palette.rimA} />
      <directionalLight position={[5, -2, 3]} intensity={2.6} color={palette.rimB} />
      <pointLight position={[0, 0, 3.5]} intensity={18} color={palette.rimB} />
      <group ref={group}>
        <mesh ref={left} geometry={geometries.left}>
          <meshPhysicalMaterial
            color={palette.color}
            emissive={palette.emissive}
            metalness={palette.metalness}
            roughness={palette.roughness}
            envMapIntensity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <mesh ref={mid} geometry={geometries.mid}>
          <meshPhysicalMaterial
            color={palette.color}
            emissive={palette.emissive}
            metalness={palette.metalness}
            roughness={palette.roughness}
            envMapIntensity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <mesh ref={right} geometry={geometries.right}>
          <meshPhysicalMaterial
            color={palette.color}
            emissive={palette.emissive}
            metalness={palette.metalness}
            roughness={palette.roughness}
            envMapIntensity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </group>
    </>
  );
}

interface Props {
  theme: Theme;
  /** Render loop runs only while the hero is on screen. */
  active: boolean;
  onReady: () => void;
}

export default function CodeMonogram({ theme, active, onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      onCreated={onReady}
      aria-hidden="true"
    >
      <Monogram theme={theme} />
    </Canvas>
  );
}
