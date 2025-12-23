
export type GestureState = 'idle' | 'open' | 'fist';

export interface ParticleConfig {
  count: number;
  treeHeight: number;
  baseRadius: number;
  colorStart: string;
  colorEnd: string;
  sizeRange: [number, number];
  blinkSpeed: number;
  glowIntensity: number;
  blinkAmplitude: number;
  breathingSpeed?: number;
  breathingAmplitude?: number;
  gesture?: GestureState;
  // Interactive props
  interactionFactor?: number;
  rotationY?: number;
}

export interface WishResponse {
  message: string;
  author: string;
}
