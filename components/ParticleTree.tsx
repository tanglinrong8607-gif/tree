
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleConfig } from '../types';

const vertexShader = `
  uniform float uTime;
  uniform float uBlinkSpeed;
  uniform float uBlinkAmplitude;
  uniform float uGradientNoise;
  uniform float uBreathingSpeed;
  uniform float uBreathingAmplitude;
  uniform float uInteractionFactor;
  
  attribute float aScale;
  attribute float aRandom;
  attribute vec3 aTargetPosition;
  varying float vAlpha;
  varying vec3 vColor;
  attribute vec3 color;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vColor = color;
    
    float noise = hash(aRandom * 100.0 + floor(uTime * 0.5)) * uGradientNoise;
    float blink = sin(uTime * uBlinkSpeed + aRandom * 10.0);
    vAlpha = (1.0 - uBlinkAmplitude) + uBlinkAmplitude * blink + noise;
    vAlpha = clamp(vAlpha, 0.0, 1.5); 
    
    float breathing = 1.0 + uBreathingAmplitude * sin(uTime * uBreathingSpeed + aRandom * 7.0);
    
    // Mix between the tree position and the scattered target position
    float t = clamp(uInteractionFactor * 1.2 - aRandom * 0.2, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);

    vec3 scatteredPos = aTargetPosition + vec3(
      sin(uTime * 0.5 + aRandom * 50.0),
      cos(uTime * 0.6 + aRandom * 50.0),
      sin(uTime * 0.4 + aRandom * 50.0)
    ) * 0.2;

    vec3 pos = mix(position, scatteredPos, t);

    // Subtle jitter when in tree form
    float treeJitter = (1.0 - t) * 0.05;
    pos.x += sin(uTime * 0.2 + aRandom * 10.0) * uGradientNoise * treeJitter;
    pos.z += cos(uTime * 0.2 + aRandom * 10.0) * uGradientNoise * treeJitter;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aScale * breathing * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float uGlowIntensity;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    float strength = pow(1.0 - (r * 2.0), 1.2);
    // Colors can exceed 1.0 for bloom effect
    gl_FragColor = vec4(vColor * (1.0 + uGlowIntensity), vAlpha * strength * 0.3);
  }
`;

export const ParticleTree: React.FC<ParticleConfig> = ({
  count,
  treeHeight,
  baseRadius,
  sizeRange,
  blinkSpeed,
  glowIntensity,
  blinkAmplitude,
  breathingSpeed = 1.6,
  breathingAmplitude = 0.25,
  gesture = 'idle'
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const interactionFactorRef = useRef(0);
  
  const points = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const targetPos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);

    const silverWhite = new THREE.Color("#C8C8FF");
    const pinkGold = new THREE.Color("#FF7BB8");

    const numSegments = 6;
    const fillRatio = 0.745; 

    for (let i = 0; i < count; i++) {
      const segmentIndex = Math.floor(Math.random() * numSegments);
      const localProgress = Math.random() * fillRatio;
      const hRatio = (segmentIndex + localProgress) / numSegments;
      const height = hRatio * treeHeight;
      const radius = (1 - hRatio) * baseRadius;
      const angle = Math.random() * Math.PI * 2;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      const spread = 12;
      targetPos[i * 3] = (Math.random() - 0.5) * spread * 2;
      targetPos[i * 3 + 1] = (Math.random() - 0.2) * spread * 1.5;
      targetPos[i * 3 + 2] = (Math.random() - 0.5) * spread;

      const isPinkGold = Math.random() < 0.3333;
      
      if (isPinkGold) {
        colors[i * 3] = pinkGold.r;
        colors[i * 3 + 1] = pinkGold.g;
        colors[i * 3 + 2] = pinkGold.b;
      } else {
        // Boost silver-white particles intensity by 1.5x
        colors[i * 3] = silverWhite.r * 1.5;
        colors[i * 3 + 1] = silverWhite.g * 1.5;
        colors[i * 3 + 2] = silverWhite.b * 1.5;
      }

      const baseScale = THREE.MathUtils.lerp(sizeRange[0], sizeRange[1], Math.random());
      const multiplier = isPinkGold ? (2.0 + Math.random()) : (1.0 + Math.random());
      scales[i] = baseScale * multiplier; 
      randoms[i] = Math.random();
    }

    return { pos, targetPos, colors, scales, randoms };
  }, [count, treeHeight, baseRadius, sizeRange]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBlinkSpeed: { value: blinkSpeed },
    uBlinkAmplitude: { value: blinkAmplitude },
    uGlowIntensity: { value: glowIntensity },
    uGradientNoise: { value: 0.2 },
    uBreathingSpeed: { value: breathingSpeed },
    uBreathingAmplitude: { value: breathingAmplitude },
    uInteractionFactor: { value: 0 }
  }), []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      
      let target = 0;
      if (gesture === 'open') target = 1;
      if (gesture === 'fist') target = 0;
      
      interactionFactorRef.current = THREE.MathUtils.lerp(
        interactionFactorRef.current,
        target,
        delta * 2.0
      );
      
      material.uniforms.uInteractionFactor.value = interactionFactorRef.current;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={points.pos} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPosition" count={count} array={points.targetPos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={points.colors} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={points.scales} itemSize={1} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={points.randoms} itemSize={1} />
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
