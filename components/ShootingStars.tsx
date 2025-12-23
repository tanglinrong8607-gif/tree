
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const METEOR_COUNT = 8;
const METEOR_COLOR = new THREE.Color("#FFEFD5");

interface Meteor {
  id: number;
  active: boolean;
  progress: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  opacity: number;
  length: number;
  nextSpawnTime: number;
}

export const ShootingStars: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Track state of each meteor
  const meteors = useRef<Meteor[]>(
    Array.from({ length: METEOR_COUNT }, (_, i) => ({
      id: i,
      active: false,
      progress: 0,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      speed: 0,
      opacity: 0,
      length: 1,
      // Stagger initial spawns
      nextSpawnTime: Math.random() * 5, 
    }))
  );

  const resetMeteor = (meteor: Meteor, currentTime: number) => {
    // 1. Position: Random start in the distant sky
    const radius = 50 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI / 2); // Mostly upper hemisphere

    meteor.start.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );

    // 2. Direction: Randomly across the view
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 1.6, // from -0.8 to 0.8
      (Math.random() - 0.5) * 0.6, // from -0.3 to 0.3
      -1.1 + (Math.random() - 0.5) * 0.2 // around -1.2 to -1.0
    ).normalize();
    
    // 3. Trajectory Length and Speed
    const distance = 30 + Math.random() * 20;
    meteor.end.copy(meteor.start).add(direction.multiplyScalar(distance));
    
    // Map specified speed range 1.2-2.5 to progress increment
    // Assuming 'speed' is distance units per second. 
    const speedVal = 1.2 + Math.random() * 1.3;
    meteor.speed = speedVal / distance; 
    
    // Meteor visual length (0.6 to 1.2)
    meteor.length = 0.6 + Math.random() * 0.6;
    
    meteor.progress = 0;
    meteor.active = true;
    meteor.opacity = 0;
    
    // Set next spawn interval (3.5 to 9.0s)
    meteor.nextSpawnTime = currentTime + (3.5 + Math.random() * 5.5);
  };

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const lookAtPos = new THREE.Vector3();
  const tempColor = new THREE.Color();

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    meteors.current.forEach((meteor, i) => {
      // Manage spawning
      if (!meteor.active) {
        if (time >= meteor.nextSpawnTime) {
          resetMeteor(meteor, time);
        } else {
          // Hide inactive instances far away
          matrix.makeScale(0, 0, 0);
          meshRef.current!.setMatrixAt(i, matrix);
          return;
        }
      }

      // Update active meteor progress
      meteor.progress += meteor.speed;
      
      // Calculate opacity: soft fade in (20%) then fade out (20%)
      if (meteor.progress < 0.2) {
        meteor.opacity = meteor.progress * 5;
      } else if (meteor.progress > 0.8) {
        meteor.opacity = 1 - (meteor.progress - 0.8) * 5;
      } else {
        meteor.opacity = 1;
      }

      // Deactivate when complete
      if (meteor.progress >= 1) {
        meteor.active = false;
        meteor.opacity = 0;
      }

      // Interpolate current position
      position.lerpVectors(meteor.start, meteor.end, meteor.progress);
      
      // Calculate rotation to face movement direction
      lookAtPos.lerpVectors(meteor.start, meteor.end, meteor.progress + 0.01);
      
      matrix.identity();
      matrix.lookAt(position, lookAtPos, new THREE.Vector3(0, 1, 0));
      
      // Brightness Pulse: 0.7 to 1.3 at 1.0Hz
      const pulse = 1.0 + 0.3 * Math.sin(time * Math.PI * 2);
      const finalBrightness = meteor.opacity * pulse;
      
      // Scale: very thin streak
      const scaleX = 0.015;
      const scaleY = 0.015;
      const scaleZ = meteor.length;
      
      const sMatrix = new THREE.Matrix4().makeScale(scaleX, scaleY, scaleZ);
      matrix.multiply(sMatrix);
      matrix.setPosition(position);
      
      meshRef.current!.setMatrixAt(i, matrix);
      
      // Apply color and brightness
      tempColor.copy(METEOR_COLOR).multiplyScalar(finalBrightness);
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, METEOR_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial 
        transparent 
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </instancedMesh>
  );
};
