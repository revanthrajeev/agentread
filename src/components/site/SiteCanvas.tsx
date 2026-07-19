"use client";

import { Component, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 1400;
const COLS = 40;

interface ParticleData {
  basePositions: Float32Array;
  chaosOffsets: Float32Array;
  livePositions: Float32Array;
}

function generateParticleData(): ParticleData {
  const basePositions = new Float32Array(COUNT * 3);
  const chaosOffsets = new Float32Array(COUNT * 3);
  const rows = Math.ceil(COUNT / COLS);
  for (let i = 0; i < COUNT; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const gx = (col / COLS - 0.5) * 24;
    const gy = (row / rows - 0.5) * 15;
    const gz = -5 - Math.random() * 3;
    basePositions.set([gx, gy, gz], i * 3);
    chaosOffsets.set(
      [(Math.random() - 0.5) * 28, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 16],
      i * 3
    );
  }
  return { basePositions, chaosOffsets, livePositions: new Float32Array(basePositions) };
}

/**
 * The particle field starts scattered (the "messy HTML" state) and resolves into a grid
 * (the "clean structured Markdown" state) as the visitor scrolls — a literal rendering of
 * the product's own pitch. Reacts to scroll position and the active accent color; disabled
 * entirely for prefers-reduced-motion or when WebGL isn't available.
 *
 * The position data lives in a ref (React's sanctioned "lazy, computed-once, opt out of
 * tracking" escape hatch — see the useRef guard pattern in the React docs) and is mutated
 * every frame inside useFrame, outside React's render cycle. This is react-three-fiber's
 * standard idiom (mutate refs/typed-arrays per frame, never setState in useFrame) — it is
 * intentionally imperative and not compiler-tracked, since a WebGL frame loop isn't a React
 * render.
 */
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const scrollRef = useRef(0);
  const dataRef = useRef<ParticleData | null>(null);
  if (dataRef.current === null) {
    dataRef.current = generateParticleData();
  }
  const { basePositions, chaosOffsets, livePositions } = dataRef.current;

  useEffect(() => {
    function syncAccent() {
      const css = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      if (css && materialRef.current) materialRef.current.color = new THREE.Color(css);
    }
    syncAccent();
    const mo = new MutationObserver(syncAccent);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent", "data-theme"] });
    return () => mo.disconnect();
  }, []);

  useFrame((state) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = max > 0 ? window.scrollY / max : 0;
    scrollRef.current += (targetScroll - scrollRef.current) * 0.06;

    const order = 1 - Math.min(scrollRef.current * 2.2, 1);
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      livePositions[ix] = basePositions[ix] + chaosOffsets[ix] * order;
      livePositions[ix + 1] = basePositions[ix + 1] + chaosOffsets[ix + 1] * order;
      livePositions[ix + 2] = basePositions[ix + 2] + chaosOffsets[ix + 2] * order * 0.6;
    }
    const geo = pointsRef.current?.geometry;
    if (geo) {
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.018 + scrollRef.current * 1.1;
      pointsRef.current.rotation.x = scrollRef.current * 0.25;
      pointsRef.current.position.x = state.pointer.x * 0.4;
      pointsRef.current.position.y = state.pointer.y * 0.25;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* react-three-fiber's fundamental idiom: a mutable typed array driven by useFrame,
            not React state — regenerating it every frame would defeat the point of a WebGL
            particle system. Not reachable from Strict Mode's double-render (guarded ref init). */}
        {/* eslint-disable-next-line react-hooks/refs */}
        <bufferAttribute attach="attributes-position" args={[livePositions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.05}
        color="#7c5cff"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

// WebGL support never changes after mount, so this is read via useSyncExternalStore (the
// primitive for a stable, external, one-shot capability check) instead of useState+useEffect.
function subscribeNever() {
  return () => {};
}
function getWebGLSnapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
function getServerSnapshot() {
  return false;
}

export default function SiteCanvas() {
  const enabled = useSyncExternalStore(subscribeNever, getWebGLSnapshot, getServerSnapshot);

  if (!enabled) return null;

  return (
    <div className="site-canvas" aria-hidden="true">
      <CanvasErrorBoundary>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 9], fov: 45 }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ParticleField />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
