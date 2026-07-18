import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * RadarScene — Sign Up / Sign In 3D layer (blueprint section 6, pages 2-3).
 *
 * "A slow, idle-breathing 5-axis radar shape (Technical / Communication /
 *  Problem Solving / Cultural Fit / Confidence) — generative and ambient,
 *  not real user data yet. It's a preview of the scoring system waiting
 *  for them."
 *
 * This maps directly to the real 5-dimension scoring engine
 * (MultiDimensionalScorer) — same five axes, same order, so when a user
 * finishes their first real interview and sees the actual radar chart on
 * Results, it's a visual callback to this ambient shape, not a new idea.
 */
export default function RadarScene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.5} />
      <BreathingRadar />
    </Canvas>
  );
}

const AXES = 5; // Technical, Communication, Problem Solving, Cultural Fit, Confidence

function BreathingRadar() {
  const meshRef = useRef();
  const lineRef = useRef();

  // Base pentagon shape, mid-range values — ambient/generative, not tied
  // to any real score, per spec ("not real user data yet")
  const baseRadii = useMemo(() => [0.65, 0.7, 0.6, 0.75, 0.68], []);

  const getPoints = (radii) => {
    const pts = [];
    for (let i = 0; i <= AXES; i++) {
      const angle = (i / AXES) * Math.PI * 2 - Math.PI / 2;
      const r = radii[i % AXES];
      pts.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
    }
    return pts;
  };

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Slow breathing — each axis pulses independently on a slightly
    // different phase so it never looks like a uniform scale animation
    const radii = baseRadii.map((base, i) => base + Math.sin(t * 0.5 + i * 1.2) * 0.06);

    if (lineRef.current) {
      lineRef.current.geometry.setFromPoints(getPoints(radii));
    }
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(t * 0.15) * 0.05; // barely-there drift, not a spin
    }
  });

  return (
    <group ref={meshRef}>
      <line ref={lineRef}>
        <bufferGeometry attach="geometry" />
        <lineBasicMaterial attach="material" color="#2563eb" transparent opacity={0.5} />
      </line>
      {/* Faint fill so the pentagon reads as a shape, not just an outline */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0, 0.7, AXES]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}