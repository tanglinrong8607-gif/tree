import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uBaseRadius;
  uniform float uAngles[5];
  
  attribute float aProgress; // 0 (top) to 1 (bottom)
  attribute float aLineIndex;
  attribute float aRandom;
  
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    int lineIdx = int(aLineIndex);
    float angle = uAngles[lineIdx];
    
    // Conical shape logic + Hanging "Sag"
    // aProgress 0 at peak, 1 at floor.
    // The radius follows the cone but sags outward slightly in the middle.
    float coneRadius = uBaseRadius * aProgress;
    float sag = 0.15 * sin(aProgress * 3.14159); 
    float radius = coneRadius + sag;
    
    // Vertical position from top down
    float yPos = uHeight * (1.0 - aProgress);

    // Dynamic Swaying (Wind effect)
    float swayScale = aProgress * 0.04;
    float swayX = sin(uTime * 0.6 + aLineIndex * 2.0) * swayScale;
    float swayZ = cos(uTime * 0.5 + aLineIndex * 2.0) * swayScale;

    vec3 pos = vec3(
      cos(angle) * radius + swayX,
      yPos,
      sin(angle) * radius + swayZ
    );

    // Flicker/Twinkle
    float flicker = 0.6 + 0.4 * sin(uTime * (3.0 + aRandom * 5.0) + aRandom * 100.0);
    
    // Fade out at the very top and very bottom
    vAlpha = smoothstep(0.0, 0.05, aProgress) * smoothstep(1.0, 0.95, aProgress) * flicker;
    
    // Warm light color (Champagne Gold)
    vec3 colorGold = vec3(1.0, 0.85, 0.5);
    vec3 colorWhite = vec3(1.0, 1.0, 0.95);
    vColor = mix(colorGold, colorWhite, aRandom * 0.4);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    // Perspective scaling for particles
    gl_PointSize = (0.06 + aRandom * 0.04) * (800.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Soft glow core
    float strength = pow(1.0 - (r * 2.0), 3.0);
    gl_FragColor = vec4(vColor, vAlpha * strength);
  }
`;

export const HangingLightLines: React.FC = () => {
  const lineCount = 5;
  const particlesPerLine = 400; 
  const totalCount = lineCount * particlesPerLine;
  const meshRef = useRef<THREE.Points>(null);

  // Y-pattern clusters (3 directions)
  const angles = useMemo(() => [
    0.0,         // Cluster 1 (Right)
    0.1,         // Cluster 1 (offset)
    2.094,       // Cluster 2 (120 deg)
    2.194,       // Cluster 2 (offset)
    4.188        // Cluster 3 (240 deg)
  ], []);

  const attributes = useMemo(() => {
    const progress = new Float32Array(totalCount);
    const lineIndices = new Float32Array(totalCount);
    const randoms = new Float32Array(totalCount);

    for (let i = 0; i < totalCount; i++) {
      const lineIdx = Math.floor(i / particlesPerLine);
      const partIdx = i % particlesPerLine;
      
      progress[i] = partIdx / particlesPerLine;
      lineIndices[i] = lineIdx;
      randoms[i] = Math.random();
    }

    return { progress, lineIndices, randoms };
  }, [totalCount, particlesPerLine]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: 4.0 },
    uBaseRadius: { value: 1.4 }, // Slightly wider than tree
    uAngles: { value: angles }
  }), [angles]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-aProgress"
          count={totalCount}
          array={attributes.progress}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aLineIndex"
          count={totalCount}
          array={attributes.lineIndices}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={totalCount}
          array={attributes.randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
