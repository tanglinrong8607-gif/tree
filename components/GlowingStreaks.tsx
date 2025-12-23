
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_STREAK_BATCH = 10;
const COLOR_START = new THREE.Color("#FFEFC8");
const COLOR_END = new THREE.Color("#FFD1E0");

interface Streak {
  active: boolean;
  progress: number;
  start: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  length: number;
  width: number;
  color: THREE.Color;
}

export const GlowingStreaks: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lastTriggerTime = useRef(0);
  
  const streaks = useRef<Streak[]>(
    Array.from({ length: MAX_STREAK_BATCH }, () => ({
      active: false,
      progress: 0,
      start: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      speed: 0,
      length: 0,
      width: 0,
      color: new THREE.Color(),
    }))
  );

  const spawnBatch = (currentTime: number) => {
    const count = 5 + Math.floor(Math.random() * 6); // 5-10 streaks
    
    for (let i = 0; i < count; i++) {
      const streak = streaks.current[i];
      streak.active = true;
      streak.progress = 0;
      
      // Spawn Area: radius 6.0, height 4.0
      const radius = Math.random() * 6.0;
      const angle = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 4.0 + 1.5; // Offset to center around tree
      
      streak.start.set(
        Math.cos(angle) * radius,
        h,
        Math.sin(angle) * radius
      );
      
      // Random direction
      streak.direction.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      // Speed slowed down by another 2x: previous 0.8-1.6 -> now 0.4-0.8
      streak.speed = 0.4 + Math.random() * 0.4; 
      streak.length = 0.8 + Math.random() * 0.8; 
      
      // Width reduced by factor of ~2 again: previous 0.005-0.0125 -> now 0.0025-0.006
      streak.width = 0.0025 + Math.random() * 0.0035; 
      
      streak.color.copy(COLOR_START).lerp(COLOR_END, Math.random());
    }
  };

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  const tempColor = new THREE.Color();

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    // Trigger every 10 seconds
    if (time - lastTriggerTime.current > 10.0) {
      spawnBatch(time);
      lastTriggerTime.current = time;
    }

    streaks.current.forEach((streak, i) => {
      if (!streak.active) {
        matrix.makeScale(0, 0, 0);
        meshRef.current!.setMatrixAt(i, matrix);
        return;
      }

      // Progress based on speed.
      streak.progress += 0.015 * streak.speed;
      
      if (streak.progress >= 1.0) {
        streak.active = false;
        return;
      }

      // Current head position
      const distanceMoved = streak.progress * 8.0; // Total dash distance
      position.copy(streak.start).addScaledVector(streak.direction, distanceMoved);
      
      // Facing
      target.copy(position).add(streak.direction);
      
      matrix.identity();
      matrix.lookAt(position, target, THREE.Object3D.DEFAULT_UP);
      
      // Scale: length and width
      const scaleZ = streak.length;
      const scaleXY = streak.width;
      
      const sMatrix = new THREE.Matrix4().makeScale(scaleXY, scaleXY, scaleZ);
      matrix.multiply(sMatrix);
      matrix.setPosition(position);
      
      meshRef.current!.setMatrixAt(i, matrix);
      
      // Fade opacity
      const opacity = Math.sin(streak.progress * Math.PI); // Smooth fade in/out
      
      // Glow intensity reduced by 2x again: previous 0.375 -> now 0.1875
      tempColor.copy(streak.color).multiplyScalar(opacity * 0.1875); 
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_STREAK_BATCH]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial 
        transparent 
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </instancedMesh>
  );
};
