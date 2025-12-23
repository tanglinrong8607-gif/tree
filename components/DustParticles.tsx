
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const DustParticles: React.FC<{ count: number; radius: number; velocityScaling?: number }> = ({ count, radius, velocityScaling = 1.0 }) => {
  const meshRef = useRef<THREE.Points>(null);

  const points = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * Math.pow(Math.random(), 1/3);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      velocities[i * 3] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }

    return { pos, velocities };
  }, [count, radius]);

  useFrame(() => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        // Apply scaling factor to velocities based on gestures
        positions[i * 3] += points.velocities[i * 3] * velocityScaling;
        positions[i * 3 + 1] += points.velocities[i * 3 + 1] * velocityScaling;
        positions[i * 3 + 2] += points.velocities[i * 3 + 2] * velocityScaling;

        if (Math.abs(positions[i * 3]) > radius) positions[i * 3] *= -0.98;
        if (Math.abs(positions[i * 3 + 1]) > radius) positions[i * 3 + 1] *= -0.98;
        if (Math.abs(positions[i * 3 + 2]) > radius) positions[i * 3 + 2] *= -0.98;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points.pos}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#FFFFFF"
        transparent
        opacity={0.5}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
