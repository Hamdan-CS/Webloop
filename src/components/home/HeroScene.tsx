import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';

function Nodes() {
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    const count = 14;
    const arr: { pos: [number, number, number]; size: number; speed: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.6 + Math.sin(i * 1.7) * 0.8;
      arr.push({
        pos: [Math.cos(angle) * radius, Math.sin(i * 2.1) * 1.4, Math.sin(angle) * radius * 0.6],
        size: 0.08 + (i % 3) * 0.04,
        speed: 0.3 + (i % 4) * 0.15,
      });
    }
    return arr;
  }, []);

  const edges = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(
          nodes[i].pos[0] - nodes[j].pos[0],
          nodes[i].pos[1] - nodes[j].pos[1],
          nodes[i].pos[2] - nodes[j].pos[2],
        );
        if (dist < 3.2) pairs.push([i, j]);
      }
    }
    return pairs;
  }, [nodes]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.08;
    group.current.rotation.x = Math.sin(t * 0.15) * 0.12;
  });

  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    edges.forEach(([a, b]) => {
      positions.push(...nodes[a].pos, ...nodes[b].pos);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [edges, nodes]);

  return (
    <group ref={group}>
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <icosahedronGeometry args={[n.size, 1]} />
          <meshStandardMaterial
            color={i % 4 === 0 ? '#22d3ee' : i % 4 === 1 ? '#a78bfa' : '#5b6896'}
            emissive={i % 4 === 0 ? '#0891b2' : '#000000'}
            emissiveIntensity={0.4}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      ))}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.22} />
      </lineSegments>
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#22d3ee" />
      <pointLight position={[-4, -2, 2]} intensity={0.8} color="#a78bfa" />
      <Suspense fallback={null}>
        <Nodes />
      </Suspense>
    </Canvas>
  );
}
