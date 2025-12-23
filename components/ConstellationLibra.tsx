import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const normalizeDir = (x: number, y: number, z: number): THREE.Vector3 => {
  return new THREE.Vector3(x, y, z).normalize();
};

const STAR_DATA = [
  { name: "α Lib", pos: [-0.3, 0.5, -1.0], color: "#FFFFFF", size: 0.08 },
  { name: "β Lib", pos: [-0.1, 0.35, -1.1], color: "#FFF8E1", size: 0.07 },
  { name: "γ Lib", pos: [0.1, 0.4, -1.05], color: "#FFF8E1", size: 0.07 },
  { name: "σ Lib", pos: [0.2, 0.2, -1.2], color: "#E8F5FF", size: 0.06 },
  { name: "δ Lib", pos: [0.0, 0.15, -1.25], color: "#E8F5FF", size: 0.06 }
];

export const ConstellationLibra: React.FC = () => {
  const stars = useMemo(() => {
    return STAR_DATA.map(star => ({
      ...star,
      position: normalizeDir(star.pos[0], star.pos[1], star.pos[2]).multiplyScalar(7.0)
    }));
  }, []);

  const starRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    starRefs.current.forEach((mesh, i) => {
      if (mesh) {
        // Star Glow Flicker (1.2Hz)
        const flicker = 0.7 + 0.3 * Math.sin(time * 1.2 * Math.PI * 2 + i);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = flicker;
        
        // Slight pulse in scale
        const s = 1.0 + 0.05 * Math.sin(time * 0.8 + i);
        mesh.scale.set(s, s, s);
      }
    });
  });

  return (
    <group position={[0, 0, -3.5]}>
      {/* Stars */}
      {stars.map((star, i) => (
        <mesh 
          key={star.name} 
          position={star.position}
          ref={el => starRefs.current[i] = el}
        >
          <sphereGeometry args={[star.size, 16, 16]} />
          <meshBasicMaterial 
            color={star.color} 
            transparent 
            depthWrite={false}
          />
          {/* Internal Glow Star */}
          <pointLight distance={1} intensity={0.7} color={star.color} />
        </mesh>
      ))}
    </group>
  );
};
