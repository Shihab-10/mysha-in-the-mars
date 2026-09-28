import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, MathUtils } from "three";
import { SHIP_NAME, SHIP_SUBTITLE } from "../game/data";

/** Canvas-based label so spacecraft decals need no external font assets. */
export function useLabelTexture(title: string, subtitle = "", width = 512, height = 128) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e7eeec";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#0d1f24";
    ctx.fillRect(0, height - 12, width, 12);
    ctx.fillStyle = "#12252b";
    ctx.textAlign = "center";
    ctx.font = `900 ${subtitle ? 58 : 74}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText(title, width / 2, subtitle ? 64 : height / 2 + 24);
    if (subtitle) {
      ctx.fillStyle = "#c2552c";
      ctx.font = '700 26px Arial, sans-serif';
      ctx.fillText(subtitle, width / 2, 100);
    }
    const texture = new CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }, [title, subtitle, width, height]);
}

export function ShipDecal({ position = [0, 4.6, 1.3] as [number, number, number], rotation = [0, 0, 0] as [number, number, number], scale = 1 }) {
  const texture = useLabelTexture(SHIP_NAME, SHIP_SUBTITLE);
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1.9, 0.48]} />
      <meshStandardMaterial map={texture} roughness={0.5} metalness={0.1} toneMapped={false} />
    </mesh>
  );
}

export function SignLabel({ text, position, scale = 1, color = "#0c1d22" }: { text: string; position: [number, number, number]; scale?: number; color?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#7aedde";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 122);
    ctx.fillStyle = "#cdf6ee";
    ctx.textAlign = "center";
    ctx.font = '800 56px "Arial Narrow", Arial, sans-serif';
    ctx.fillText(text, 256, 84);
    return new CanvasTexture(canvas);
  }, [text, color]);
  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[2.4, 0.6]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

type AstronautProps = {
  rigRef?: any;
  suited?: boolean;
  gearLevel?: number;
  reaching?: boolean;
  walking?: boolean;
};

/** Procedural astronaut shared by every level. */
export function Astronaut({ rigRef, suited = true, gearLevel = 10, reaching = false, walking = false }: AstronautProps) {
  const armLeft = useRef<any>(null);
  const armRight = useRef<any>(null);
  const legLeft = useRef<any>(null);
  const legRight = useRef<any>(null);
  const walkClock = useRef(0);

  useFrame((_, delta) => {
    walkClock.current += delta * (walking ? 6 : 1.4);
    const swing = walking ? 0.5 : 0.08;
    if (armLeft.current) {
      armLeft.current.rotation.x = MathUtils.lerp(armLeft.current.rotation.x, reaching ? -1.1 : Math.sin(walkClock.current) * swing, 0.15);
    }
    if (armRight.current) {
      armRight.current.rotation.x = MathUtils.lerp(armRight.current.rotation.x, reaching ? -1.25 : -Math.sin(walkClock.current) * swing, 0.15);
    }
    if (legLeft.current) legLeft.current.rotation.x = MathUtils.lerp(legLeft.current.rotation.x, walking ? -Math.sin(walkClock.current) * 0.45 : 0, 0.2);
    if (legRight.current) legRight.current.rotation.x = MathUtils.lerp(legRight.current.rotation.x, walking ? Math.sin(walkClock.current) * 0.45 : 0, 0.2);
  });

  const suitOn = suited || gearLevel >= 2;
  const helmetOn = suited || gearLevel >= 3;
  const oxygenOn = suited || gearLevel >= 4;
  const commsOn = suited || gearLevel >= 5;
  const shieldOn = suited || gearLevel >= 10;

  return (
    <group ref={rigRef} position={[0, 0, 6]}>
      <group position={[0, 1.05, 0]}>
        <mesh castShadow position={[0, 0.82, 0]}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshStandardMaterial color="#8c553d" roughness={0.72} />
        </mesh>
        {!helmetOn && (
          <mesh position={[0, 1.02, -0.02]}>
            <sphereGeometry args={[0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#171414" roughness={0.92} />
          </mesh>
        )}
        {helmetOn && (
          <group position={[0, 0.84, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.39, 28, 28]} />
              <meshPhysicalMaterial color="#dfe8e5" roughness={0.24} metalness={0.2} transparent opacity={0.92} />
            </mesh>
            <mesh position={[0, 0.02, 0.32]}>
              <sphereGeometry args={[0.29, 24, 16, 0, Math.PI * 2, 0.32, 1.45]} />
              <meshPhysicalMaterial color="#18343b" roughness={0.1} metalness={0.65} />
            </mesh>
          </group>
        )}
        <mesh castShadow position={[0, 0.05, 0]}>
          <capsuleGeometry args={[suitOn ? 0.36 : 0.3, 0.7, 8, 18]} />
          <meshStandardMaterial color={suitOn ? "#d9e3e1" : "#244e58"} roughness={0.62} />
        </mesh>
        {suitOn && (
          <mesh position={[0, 0.13, 0.34]}>
            <boxGeometry args={[0.34, 0.18, 0.08]} />
            <meshStandardMaterial color={shieldOn ? "#d78f43" : "#3fc8b8"} emissive={shieldOn ? "#7a2d13" : "#083e38"} emissiveIntensity={0.6} />
          </mesh>
        )}
        {oxygenOn && (
          <group position={[0, 0.15, -0.38]}>
            <mesh><boxGeometry args={[0.48, 0.72, 0.22]} /><meshStandardMaterial color="#879694" metalness={0.5} roughness={0.35} /></mesh>
            <mesh position={[-0.14, 0.35, 0]}><cylinderGeometry args={[0.07, 0.07, 0.28, 12]} /><meshStandardMaterial color="#66e1cf" /></mesh>
          </group>
        )}
        {commsOn && <mesh position={[0.33, 0.45, 0.08]}><sphereGeometry args={[0.06, 12, 12]} /><meshBasicMaterial color="#6ff2de" /></mesh>}
        <group ref={armLeft} position={[-0.42, 0.26, 0]}>
          <mesh castShadow position={[0, -0.32, 0]}><capsuleGeometry args={[0.1, 0.48, 6, 12]} /><meshStandardMaterial color={suitOn ? "#d5dfdd" : "#2e606a"} /></mesh>
        </group>
        <group ref={armRight} position={[0.42, 0.26, 0]}>
          <mesh castShadow position={[0, -0.32, 0]}><capsuleGeometry args={[0.1, 0.48, 6, 12]} /><meshStandardMaterial color={suitOn ? "#d5dfdd" : "#2e606a"} /></mesh>
        </group>
        <group ref={legLeft} position={[-0.18, -0.5, 0]}>
          <mesh castShadow position={[0, -0.32, 0]}><capsuleGeometry args={[0.13, 0.65, 6, 12]} /><meshStandardMaterial color={suitOn ? "#cbd7d5" : "#182c33"} /></mesh>
        </group>
        <group ref={legRight} position={[0.18, -0.5, 0]}>
          <mesh castShadow position={[0, -0.32, 0]}><capsuleGeometry args={[0.13, 0.65, 6, 12]} /><meshStandardMaterial color={suitOn ? "#cbd7d5" : "#182c33"} /></mesh>
        </group>
      </group>
    </group>
  );
}

export function SeatedAstronaut({ bobbing = true }: { bobbing?: boolean }) {
  const ref = useRef<any>(null);
  useFrame((state) => {
    if (ref.current && bobbing) ref.current.position.y = -0.65 + Math.sin(state.clock.elapsedTime * 1.8) * 0.012;
  });
  return (
    <group ref={ref} position={[0, -0.65, 1.4]} rotation={[-0.2, 0, 0]}>
      <mesh position={[0, 1.55, 0]}><sphereGeometry args={[0.42, 24, 24]} /><meshPhysicalMaterial color="#dbe5e2" metalness={0.3} roughness={0.22} /></mesh>
      <mesh position={[0, 1.57, 0.35]}><sphereGeometry args={[0.31, 24, 16, 0, Math.PI * 2, 0.35, 1.35]} /><meshStandardMaterial color="#183c42" metalness={0.75} roughness={0.1} /></mesh>
      <mesh position={[0, 0.55, 0]}><capsuleGeometry args={[0.48, 1, 8, 20]} /><meshStandardMaterial color="#d5dfdc" /></mesh>
      <mesh position={[0, 0.6, 0.48]} rotation={[0, 0, 0.58]}><boxGeometry args={[1.3, 0.1, 0.08]} /><meshStandardMaterial color="#df7c43" /></mesh>
      <mesh position={[0, 0.6, 0.48]} rotation={[0, 0, -0.58]}><boxGeometry args={[1.3, 0.1, 0.08]} /><meshStandardMaterial color="#df7c43" /></mesh>
    </group>
  );
}

export function Rocket({
  atPad = false,
  boardingStep = 0,
  flightY = 0,
  legsDeployed = false,
}: { atPad?: boolean; boardingStep?: number; flightY?: number; legsDeployed?: boolean }) {
  const hatchOpen = boardingStep >= 1;
  return (
    <group position={atPad ? [-8.2, flightY, 5.3] : [0, flightY, 0]} scale={atPad ? 0.72 : 1}>
      <mesh castShadow position={[0, 4.2, 0]}>
        <cylinderGeometry args={[1.05, 1.28, 6.4, 28]} />
        <meshStandardMaterial color="#d9e2df" metalness={0.5} roughness={0.32} />
      </mesh>
      <mesh castShadow position={[0, 8.15, 0]}>
        <coneGeometry args={[1.05, 2.1, 28]} />
        <meshStandardMaterial color="#cbd6d3" metalness={0.45} roughness={0.3} />
      </mesh>
      {/* Spacecraft identity decals, readable from outside */}
      <ShipDecal position={[0, 5.9, 1.08]} />
      <ShipDecal position={[0, 5.9, -1.08]} rotation={[0, Math.PI, 0]} />
      <mesh position={[0, 4.8, 1.06]} rotation={[hatchOpen ? -1.2 : 0, 0, 0]}>
        <boxGeometry args={[0.72, 1.08, 0.12]} />
        <meshStandardMaterial color="#18383c" emissive="#0a2928" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 2.2, 0]}><torusGeometry args={[1.26, 0.08, 10, 28]} /><meshStandardMaterial color="#dc6c3e" /></mesh>
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} position={[x, 0.62, 0]}><cylinderGeometry args={[0.34, 0.5, 1.3, 18]} /><meshStandardMaterial color="#4b5c60" metalness={0.7} /></mesh>
      ))}
      {legsDeployed &&
        [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.5, 0.6, Math.sin(a) * 1.5]} rotation={[Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]}>
              <cylinderGeometry args={[0.1, 0.14, 2.4, 10]} />
              <meshStandardMaterial color="#6a7679" metalness={0.6} />
            </mesh>
          );
        })}
      {atPad && (
        <group>
          <mesh position={[2.2, 4.1, 0]}><boxGeometry args={[0.25, 8.2, 0.4]} /><meshStandardMaterial color="#4b5556" /></mesh>
          {[1.2, 3.2, 5.2, 7.2].map((y) => (
            <mesh key={y} position={[1.2, y, 0]}><boxGeometry args={[2, 0.12, 0.3]} /><meshStandardMaterial color="#657173" /></mesh>
          ))}
        </group>
      )}
    </group>
  );
}
