import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { ParticleTree } from './components/ParticleTree';
import { SnowflakeTop } from './components/SnowflakeTop';
import { DustParticles } from './components/DustParticles';
import { SpiralLightBand } from './components/SpiralLightBand';
import { ShootingStars } from './components/ShootingStars';
import { GlowingStreaks } from './components/GlowingStreaks';
import { HangingLightLines } from './components/HangingLightLines';
import { ConstellationLibra } from './components/ConstellationLibra';
import { WishResponse, GestureState } from './types';
import { Sparkles, Send, Loader2, Camera, CameraOff, Info, MoveHorizontal } from 'lucide-react';
import * as THREE from 'three';

import { generateWish } from './services/geminiService';

const Scene: React.FC<{ wish?: WishResponse, gesture: GestureState, rotationY: number }> = ({ wish, gesture, rotationY }) => {
  const dustVelocityScaling = gesture === 'open' ? 2.5 : 1.0;
  const pulseSpeed = gesture === 'open' ? 4.0 : 2.5;
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Apply the rotation from hand movement
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotationY, 0.1);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.5, 7]} fov={50} />
      <OrbitControls 
        enablePan={false} 
        minDistance={3} 
        maxDistance={15} 
        autoRotate={gesture === 'idle' && rotationY === 0} 
        autoRotateSpeed={0.5} 
      />
      
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 2, 15]} />
      
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#C8C8FF" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ShootingStars />
      <ConstellationLibra />
      
      <group ref={groupRef} position={[0, -1.5, 0]}>
        <ParticleTree 
          count={9600} 
          treeHeight={4}
          baseRadius={1.33} 
          colorStart="#C8C8FF"
          colorEnd="#FFFFFF"
          sizeRange={[0.045, 0.08]} 
          blinkSpeed={2.2}         
          glowIntensity={0.186624}
          blinkAmplitude={0.45}    
          breathingSpeed={1.6}     
          breathingAmplitude={0.25}
          gesture={gesture}
        />
        
        {gesture !== 'open' && (
          <>
            <SpiralLightBand />
            <HangingLightLines />
            <GlowingStreaks />
          </>
        )}
        
        <SnowflakeTop position={[0, 4.0, 0]} pulseSpeed={pulseSpeed} />
        
        {wish && (
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Text
              position={[0, 5.2, 0]}
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
              maxWidth={3}
              textAlign="center"
              font="https://fonts.gstatic.com/s/philosopher/v14/vEFV2_5QCwQ_DmapF3yXpZdkNqfX.woff"
            >
              {`"${wish.message}"\n— ${wish.author}`}
            </Text>
          </Float>
        )}
      </group>

      <DustParticles count={2000} radius={8} velocityScaling={dustVelocityScaling} />

      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [wish, setWish] = useState<WishResponse | undefined>();
  const [loading, setLoading] = useState(false);
  const [gesture, setGesture] = useState<GestureState>('idle');
  const [cameraActive, setCameraActive] = useState(false);
  const [rotationY, setRotationY] = useState(0);
  
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const prevHandXRef = useRef<number | null>(null);

  // Hand detection logic
  const onResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const wrist = landmarks[0];
      
      // Handle movement tracking for rotation
      if (prevHandXRef.current !== null) {
        const deltaX = wrist.x - prevHandXRef.current;
        // Sensitivity factor: 5.0 radians per normalized unit
        if (Math.abs(deltaX) > 0.002) {
          setRotationY(prev => prev + deltaX * 10.0);
        }
      }
      prevHandXRef.current = wrist.x;

      // Handle Gesture detection (Open/Fist)
      const getDistance = (p1: any, p2: any) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
      };

      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      const avgTipDist = (
        getDistance(wrist, indexTip) + 
        getDistance(wrist, middleTip) + 
        getDistance(wrist, ringTip) + 
        getDistance(wrist, pinkyTip)
      ) / 4;

      if (avgTipDist > 0.35) {
        setGesture('open');
      } else if (avgTipDist < 0.2) {
        setGesture('fist');
      } else {
        setGesture('idle');
      }
    } else {
      setGesture('idle');
      prevHandXRef.current = null;
    }
  }, []);

  const toggleCamera = async () => {
    if (cameraActive) {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      setCameraActive(false);
      setGesture('idle');
      setRotationY(0);
      return;
    }

    try {
      const videoElement = document.getElementById('tracking-video') as HTMLVideoElement;
      
      if (!handsRef.current) {
        // @ts-ignore
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        handsRef.current = hands;
      }

      // @ts-ignore
      const camera = new window.Camera(videoElement, {
        onFrame: async () => {
          await handsRef.current.send({ image: videoElement });
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed", err);
      alert("Could not access camera for hand tracking.");
    }
  };

  const handleMakeWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const newWish = await generateWish(topic);
      setWish(newWish);
      setTopic('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas shadows dpr={[1, 2]} className="w-full h-full">
        <Suspense fallback={null}>
          <Scene wish={wish} gesture={gesture} rotationY={rotationY} />
        </Suspense>
      </Canvas>

      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-12">
        <header className="flex items-center justify-between w-full pointer-events-auto">
          <div className="flex items-center space-x-3 text-white">
            <div className="p-2 bg-indigo-900/40 rounded-full border border-indigo-400/30 backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-light tracking-[0.2em] uppercase animate-celestial">Merry Christmas</h1>
              <p className="text-[10px] text-indigo-300/60 font-mono tracking-widest mt-1 uppercase italic">Hand Interaction Active</p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <button 
              onClick={toggleCamera}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all backdrop-blur-md ${
                cameraActive 
                  ? 'bg-red-500/20 border-red-500/50 text-red-100' 
                  : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100 hover:bg-indigo-500/30 shadow-lg shadow-indigo-500/20'
              }`}
            >
              {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              <span className="text-sm font-medium tracking-wide">
                {cameraActive ? 'Stop Tracking' : 'Enable Magic Control'}
              </span>
            </button>
            {cameraActive && (
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono flex items-center space-x-2">
                 <div className={`w-2 h-2 rounded-full animate-pulse ${gesture === 'open' ? 'bg-green-400' : gesture === 'fist' ? 'bg-blue-400' : 'bg-white/20'}`}></div>
                 <span>State: {gesture.toUpperCase()}</span>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-md w-full mx-auto md:mx-0 pointer-events-auto">
          {cameraActive && (
            <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl flex items-start space-x-3 text-white/70 shadow-2xl">
              <Info className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="text-xs space-y-2 leading-relaxed">
                <p className="flex items-center space-x-2">
                   <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                   <span><b className="text-indigo-200 uppercase">Open Hand:</b> Disperse tree particles.</span>
                </p>
                <p className="flex items-center space-x-2">
                   <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                   <span><b className="text-indigo-200 uppercase">Close Fist:</b> Restore tree form.</span>
                </p>
                <p className="flex items-center space-x-2">
                   <MoveHorizontal className="w-3 h-3 text-yellow-400" />
                   <span><b className="text-yellow-200 uppercase">Move Hand:</b> Rotate the celestial tree.</span>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleMakeWish} className="group relative flex flex-col space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Make a Christmas wish..."
                className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-xl transition-all shadow-2xl"
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !topic}
                className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-xl transition-all flex items-center justify-center shadow-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>

        <footer className="hidden md:flex justify-between items-end text-white/30 text-[10px] uppercase tracking-[0.3em] font-mono">
          <div className="space-y-1">
            <p>STATUS: {cameraActive ? 'TRACKING ACTIVE' : 'SYSTEM STANDBY'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span>Celestial AI v2.5</span>
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;