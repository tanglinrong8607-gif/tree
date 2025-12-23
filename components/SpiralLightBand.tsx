
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uBaseRadius;
  uniform float uTurns;
  uniform float uRotationSpeed;
  uniform float uRiseSpeed;
  uniform float uFlickerSpeed;
  uniform float uFlickerIntensity;
  
  attribute float aProgress;
  attribute float aRandom;
  attribute float aScale;
  attribute vec3 aOffset; 
  
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Continuous rising motion looping from 0 to 1
    float t = fract(aProgress + uTime * uRiseSpeed);
    
    // Soft fade at top and bottom (fadeOutEdges: true)
    float edgeFade = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.88, t);
    
    // Conical spiral math: radius shrinks as it goes up
    // baseRadius is 1.6 as requested.
    float coneFactor = (1.0 - t); 
    
    // Rotation direction: counter-clockwise (positive Y rotation in Three.js is CCW)
    float angle = t * 3.14159265 * 2.0 * uTurns + uTime * uRotationSpeed;
    float radius = uBaseRadius * coneFactor;
    
    // Base position strictly on the spiral line
    vec3 basePos = vec3(
      cos(angle) * radius,
      t * uHeight,
      sin(angle) * radius
    );
    
    // Tight offset for "lineWidth: 0.025" effect
    vec3 finalPos = basePos + aOffset * 0.025;
    
    // Flicker / Shimmer effect
    float flicker = 1.0 - (uFlickerIntensity * 0.5 + uFlickerIntensity * 0.5 * sin(uTime * uFlickerSpeed + aRandom * 40.0));
    vAlpha = edgeFade * flicker;
    
    // Color Gradient: #FFEBF0 (Pink) to #E8F5FF (Blue-white)
    vec3 colorStart = vec3(1.0, 0.92, 0.94);
    vec3 colorEnd = vec3(0.91, 0.96, 1.0);
    vColor = mix(colorStart, colorEnd, t);

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = aScale * (1000.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float uGlowIntensity;
  uniform float uTime;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Smooth radial glow
    float strength = pow(1.0 - (r * 2.0), 2.0);
    
    // Apply requested glow intensity (0.5)
    vec3 finalColor = vColor * (1.0 + uGlowIntensity);
    
    gl_FragColor = vec4(finalColor, vAlpha * strength);
  }
`;

export const SpiralLightBand: React.FC = () => {
  const count = 1800; // As requested
  const meshRef = useRef<THREE.Points>(null);

  const attributes = useMemo(() => {
    const progress = new Float32Array(count);
    const randoms = new Float32Array(count);
    const scales = new Float32Array(count);
    const offsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      progress[i] = Math.random(); 
      randoms[i] = Math.random();
      // Particle size for a delicate line
      scales[i] = 0.015 + Math.random() * 0.01; 
      
      // Jitter offset within the line width
      offsets[i * 3] = (Math.random() - 0.5);
      offsets[i * 3 + 1] = (Math.random() - 0.5);
      offsets[i * 3 + 2] = (Math.random() - 0.5);
    }

    return { progress, randoms, scales, offsets };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uHeight: { value: 4.6 }, // treeHeight + 0.6
    uBaseRadius: { value: 1.6 }, // As requested
    uTurns: { value: 4.2 }, // As requested
    uRotationSpeed: { value: 0.12 }, // Counter-clockwise speed
    uRiseSpeed: { value: 0.05 }, // Rising logic
    uGlowIntensity: { value: 0.5 }, // As requested
    uFlickerSpeed: { value: 3.5 },
    uFlickerIntensity: { value: 0.3 }
  }), []);

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
          count={count}
          array={attributes.progress}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={attributes.randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={count}
          array={attributes.scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          count={count}
          array={attributes.offsets}
          itemSize={3}
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
