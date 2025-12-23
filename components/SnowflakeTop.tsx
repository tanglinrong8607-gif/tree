
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowflakeTopProps {
  position: [number, number, number];
  pulseSpeed?: number;
}

export const SnowflakeTop: React.FC<SnowflakeTopProps> = ({ position, pulseSpeed = 2.5 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 18;
    const innerRadius = 7.5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 2.5, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.5,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 4
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.017;
      meshRef.current.rotation.y += 0.0017;
      
      const pulseScale = 1.0 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.1;
      const baseScale = 0.0072; 
      meshRef.current.scale.set(baseScale * pulseScale, baseScale * pulseScale, baseScale * pulseScale);
    }
    
    if (materialRef.current) {
      const intensity = (0.6 + Math.sin(state.clock.elapsedTime * (pulseSpeed * 0.8)) * 0.4) * 2.0;
      materialRef.current.emissiveIntensity = intensity;
    }
  });

  return (
    <group position={position}>
      <pointLight distance={3} intensity={4} color="#FFD1F0" />
      <mesh ref={meshRef}>
        <extrudeGeometry args={[starShape, extrudeSettings]} />
        <meshStandardMaterial 
          ref={materialRef}
          color="#FF7BB8"
          roughness={0.1}
          metalness={0.9}
          emissive="#FFB5E0"
          emissiveIntensity={2.0}
        />
      </mesh>
    </group>
  );
};
