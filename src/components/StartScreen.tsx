import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { Button } from "./UI";

/* ---------------- Opening cinematic ---------------- */

const BEATS = [
  { at: 0, kicker: "Deep space", title: "Outbound from Sol" },
  { at: 1.1, kicker: "Earth", title: "Home, falling behind" },
  { at: 2.2, kicker: "Luna", title: "Passing the Moon" },
  { at: 3.2, kicker: "Mars", title: "The red planet ahead" },
];

function IntroRig({ clockRef }: { clockRef: React.MutableRefObject<number> }) {
  const earth = useRef<any>(null);
  const moon = useRef<any>(null);
  const mars = useRef<any>(null);

  useFrame((state, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;
    const camera = state.camera;
    camera.position.lerp(new Vector3(Math.sin(t * 0.14) * 2.2, 0.6 + t * 0.1, 16 - t * 2.6), 0.06);
    camera.lookAt(0, 0, -20);
    if (earth.current) {
      earth.current.rotation.y += delta * 0.06;
      earth.current.scale.setScalar(MathUtils.lerp(earth.current.scale.x, Math.max(0.25, 1.6 - t * 0.32), 0.08));
    }
    if (moon.current) moon.current.position.x = MathUtils.lerp(moon.current.position.x, t > 1.8 ? 4.2 : 12, 0.04);
    if (mars.current) {
      mars.current.rotation.y += delta * 0.05;
      const target = t > 2.6 ? 1 : 0.15;
      mars.current.scale.setScalar(MathUtils.lerp(mars.current.scale.x, target, 0.035));
    }
  });

  return (
    <>
      <color attach="background" args={["#010306"]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[-8, 5, 6]} color="#fff0d6" intensity={3.2} />
      <Stars radius={90} depth={60} count={3600} factor={3.4} fade speed={1.4} />
      <group ref={earth} position={[-3.6, -0.7, -6]}>
        <mesh>
          <sphereGeometry args={[2.1, 48, 48]} />
          <meshStandardMaterial color="#2a6f9e" roughness={0.85} emissive="#0b2436" emissiveIntensity={0.4} />
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[2.1, 32, 32]} />
          <meshBasicMaterial color="#8ed6ff" transparent opacity={0.09} />
        </mesh>
      </group>
      <mesh ref={moon} position={[12, 1.6, -14]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#b9b6ae" roughness={1} />
      </mesh>
      <group ref={mars} position={[1.6, 0.4, -26]} scale={0.15}>
        <mesh>
          <sphereGeometry args={[4.6, 64, 64]} />
          <meshStandardMaterial color="#a94c2b" roughness={0.95} />
        </mesh>
        <mesh scale={1.04}>
          <sphereGeometry args={[4.6, 32, 32]} />
          <meshBasicMaterial color="#ff9d6a" transparent opacity={0.08} />
        </mesh>
      </group>
    </>
  );
}

export function IntroCinematic({ onDone }: { onDone: () => void }) {
  const clockRef = useRef(0);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timers = BEATS.map((b, i) => window.setTimeout(() => setBeat(i), b.at * 1000));
    const end = window.setTimeout(onDone, 4300);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(end);
    };
  }, [onDone]);

  return (
    <main className="start-screen">
      <Canvas camera={{ position: [0, 0, 16], fov: 50 }} dpr={[1, 1.5]}>
        <IntroRig clockRef={clockRef} />
      </Canvas>
      <div className="start-shade" />
      <div className="intro-caption" key={beat}>
        <span>{BEATS[beat]!.kicker}</span>
        <strong>{BEATS[beat]!.title}</strong>
      </div>
      <Button variant="ghost" className="intro-skip" onClick={onDone}>Skip intro</Button>
    </main>
  );
}

/* ---------------- Main menu ---------------- */

function Mars() {
  const ref = useRef<any>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.035;
  });
  return (
    <group position={[3.8, -0.4, -2]}>
      <mesh ref={ref}>
        <sphereGeometry args={[3.35, 64, 64]} />
        <meshStandardMaterial color="#a64b2b" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh position={[-1.1, 1.4, 2.9]} rotation={[0.3, 0.2, -0.2]}>
        <torusGeometry args={[0.72, 0.09, 12, 48, 2.2]} />
        <meshStandardMaterial color="#cf7045" roughness={1} />
      </mesh>
      <pointLight position={[-5, 5, 5]} color="#ffb16f" intensity={75} distance={18} />
    </group>
  );
}

function Shuttle() {
  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
      <group position={[-1.1, 0.7, 1]} rotation={[0.05, 0.35, -0.25]} scale={0.38}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.72, 4.2, 18]} />
          <meshStandardMaterial color="#d9e6e5" metalness={0.75} roughness={0.23} />
        </mesh>
        <mesh position={[1.65, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.54, 0.54, 2.4, 18]} />
          <meshStandardMaterial color="#66777b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[2.7, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.48, 2.6, 18]} />
          <meshBasicMaterial color="#77f0de" transparent opacity={0.32} />
        </mesh>
      </group>
    </Float>
  );
}

export function StartScreen({ onStart, soundOn, onToggleSound }: any) {
  return (
    <main className="start-screen">
      <Canvas camera={{ position: [0, 0, 8], fov: 42 }} dpr={[1, 1.5]}>
        <color attach="background" args={["#020608"]} />
        <fog attach="fog" args={["#020608", 8, 23]} />
        <ambientLight intensity={0.18} />
        <directionalLight position={[-5, 8, 8]} color="#bff9f0" intensity={2.4} />
        <Stars radius={60} depth={30} count={1800} factor={2.2} fade speed={0.35} />
        <Mars />
        <Shuttle />
      </Canvas>
      <div className="start-shade" />
      <div className="intro-fade" />
      <header className="start-header">
        <div className="game-brand"><i /><span>MYSHA · EXPEDITION 01</span></div>
        <Button variant="ghost" className="sound-button" onClick={onToggleSound}>
          SOUND {soundOn ? "ON" : "OFF"}
        </Button>
      </header>
      <section className="start-content">
        <span className="start-kicker">A Mars outpost survival experience</span>
        <div className="start-title" role="heading" aria-level={1}>
          <span>MYSHA IN</span>
          <strong>THE MARS</strong>
        </div>
        <div className="start-subtitle">Mars Outpost Survival</div>
        <p>
          Prepare astronaut Mysha. Complete the flight equipment sequence, board PROTOCOL B-612,
          survive the journey, land on Mars and keep the outpost alive.
        </p>
        <Button className="start-button" onClick={onStart}>
          <span>Start Mission</span><b>01</b>
        </Button>
        <div className="start-meta">
          <span><i /> Interactive 3D · 4 levels</span>
          <span>Level 1 · Earth Departure</span>
        </div>
      </section>
      <div className="start-coordinate">23.8103° N<br />90.4125° E</div>
    </main>
  );
}
