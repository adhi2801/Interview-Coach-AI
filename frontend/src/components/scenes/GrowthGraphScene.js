import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GrowthGraphScene — Dashboard 3D layer (blueprint section 6, page 4).
 * "Calm, slow-rotating growth graph, low-key, background only."
 * Unlike the Landing page's KnowledgeGraphScene (which is a hero moment
 * with a scroll-driven dolly), this is deliberately quiet — no camera
 * movement, no scroll dependency, just a slow ambient rotation. This is
 * a background layer, not a focal point, per section 1's restraint rule.
 */
export default function GrowthGraphScene() {
  return (
    <Canvas camera={{ position: [0, 0, 14], fov: 40 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.3} />
      <SlowGraph />
    </Canvas>
  );
}

function SlowGraph() {
  const groupRef = useRef();

  const nodes = useMemo(() => {
    const count = 22;
    const pts = [];
    // Tighter cluster (was 18x12x8, way too sparse to read as one shape)
    // and offset toward the right side so it sits as a contained
    // background accent, not scattered across the whole viewport.
    for (let i = 0; i < count; i++) {
      pts.push([
        4 + (Math.random() - 0.5) * 7, // offset right, tighter spread
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
      ]);
    }
    return pts;
  }, []);

  const edges = useMemo(() => {
    // Real nearest-neighbor connections instead of random sequential
    // pairs — this is what makes it read as "a graph" rather than
    // "scattered dots that sometimes have a line between them."
    const lines = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      let nearest = null;
      let nearestDist = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = b;
        }
      }
      if (nearest) lines.push([a, nearest]);
    }
    return lines;
  }, [nodes]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0004; // very slow — this is ambient, not a feature
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.35} />
        </mesh>
      ))}
      {edges.map(([a, b], i) => (
        <line key={i}>
          <bufferGeometry
            attach="geometry"
            onUpdate={(geo) => geo.setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)])}
          />
          <lineBasicMaterial attach="material" color="#2563eb" transparent opacity={0.08} />
        </line>
      ))}
    </group>
  );
}