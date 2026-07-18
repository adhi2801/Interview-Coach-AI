import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useScroll, useMotionValueEvent } from "framer-motion";
import * as THREE from "three";

/**
 * KnowledgeGraphScene — Landing page 3D layer (blueprint section 6, page 1).
 *
 * "An abstract rendering of the actual Knowledge Gap Graph (93 CS topics /
 *  96 prerequisite edges) — sparse and distant at load. Scroll mechanic
 *  pushes the camera into it as a literal metaphor: 'we already understand
 *  the terrain of CS knowledge.'"
 *
 * Camera starts z=40 (distant, sparse), dollies to z=8 as scrollYProgress
 * goes 0→1 across the hero. Node opacity and connecting-edge opacity fade
 * in over the same progress value — one driver, not independent triggers,
 * per section 4's explicit instruction.
 *
 * scrollTargetRef must be passed from the parent hero section — this scene
 * doesn't create its own scroll container, it reads the page's real scroll.
 */
export default function KnowledgeGraphScene({ scrollTargetRef }) {
  return (
    <Canvas camera={{ position: [0, 0, 40], fov: 50 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.4} />
      <GraphContent scrollTargetRef={scrollTargetRef} />
    </Canvas>
  );
}

function GraphContent({ scrollTargetRef }) {
  const { scrollYProgress } = useScroll({
    target: scrollTargetRef,
    offset: ["start start", "end start"],
  });

  // R3F's useFrame runs on every animation frame outside React's render
  // cycle — reading a Framer Motion value directly in there would be
  // stale, so we subscribe once and keep the latest value in a ref.
  const progressRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });

  const groupRef = useRef();
  const cameraZRef = useRef();

  // 93 topics / 96 prerequisite edges — real counts from the Knowledge
  // Graph engine. We don't render all 93 as individual labeled nodes
  // here (that's the Study Plan page's job, with real pan-to-node
  // interactivity) — this is the atmospheric, abstract version: enough
  // nodes to read as "a knowledge terrain," generated once and stable.
  const nodes = useMemo(() => {
    const count = 60; // representative density, not literal 1:1 with 93
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({
        position: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15,
        ],
      });
    }
    return pts;
  }, []);

  // Sparse prerequisite-style connections — nearest-neighbor pairs,
  // capped so it reads as a graph, not a solid mesh
  const edges = useMemo(() => {
    const lines = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i].position;
      let nearest = null;
      let nearestDist = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j].position;
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = b;
        }
      }
      if (nearest) lines.push([a, nearest]);
      if (lines.length >= 96) break; // matches the real 96 prerequisite-edge count as a cap
    }
    return lines;
  }, [nodes]);

  useFrame((state) => {
    const t = progressRef.current;

    // Camera dolly: z=40 (distant/sparse) -> z=8 (dense/close), per spec
    const targetZ = 40 - t * 32;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.08;

    // Density/connection fade-in tied to the SAME progress value
    if (groupRef.current) {
      groupRef.current.children.forEach((child) => {
        if (child.material) {
          child.material.opacity = Math.min(1, t * 1.4) * (child.userData.baseOpacity || 1);
        }
      });
      groupRef.current.rotation.y += 0.0006; // slow idle drift, not decorative spin
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <mesh key={i} position={n.position} userData={{ baseOpacity: 0.7 }}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0} />
        </mesh>
      ))}
      {edges.map(([a, b], i) => (
        <line key={i} userData={{ baseOpacity: 0.15 }}>
          <bufferGeometry
            attach="geometry"
            onUpdate={(geo) => geo.setFromPoints([
              new THREE.Vector3(...a),
              new THREE.Vector3(...b),
            ])}
          />
          <lineBasicMaterial attach="material" color="#2563eb" transparent opacity={0} />
        </line>
      ))}
    </group>
  );
}