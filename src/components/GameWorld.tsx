import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, Stars, useKeyboardControls } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { EQUIPMENT, ROCKET_POSITION } from "../game/data";
import { touchMove } from "../game/input";
import { Astronaut, Rocket, SeatedAstronaut } from "./Actors";

const temp = new Vector3();
const forward = new Vector3();
const side = new Vector3();

function EquipmentObject({ item, index, mission, playerRef }: any) {
  const ref = useRef<any>(null);
  const collected = mission.collectedEquipment.includes(item.id);
  const active = EQUIPMENT[mission.currentEquipmentIndex]?.id === item.id && !collected;
  const collecting = mission.collectingId === item.id;
  const origin = useMemo(() => new Vector3(...item.position), [item.position]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * (active ? 1.2 : 0.35);
    const lift = Math.sin(state.clock.elapsedTime * 2 + index) * 0.08;
    if (collecting && playerRef.current) {
      temp.copy(playerRef.current.position).add(new Vector3(0, 1.4, 0));
      ref.current.position.lerp(temp, 0.075);
      ref.current.scale.multiplyScalar(0.975);
    } else {
      ref.current.position.y = origin.y + lift;
    }
  });

  if (collected) return null;
  return (
    <group ref={ref} position={item.position}>
      <mesh castShadow>
        {index === 2 ? <sphereGeometry args={[0.4, 24, 18]} /> : index === 5 ? <boxGeometry args={[0.62, 0.42, 0.08]} /> : <boxGeometry args={[0.52, 0.62, 0.34]} />}
        <meshStandardMaterial color={item.color} emissive={active ? item.color : "#000000"} emissiveIntensity={active ? 0.45 : 0} metalness={0.3} roughness={0.4} />
      </mesh>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
          <ringGeometry args={[0.48, 0.64, 32]} />
          <meshBasicMaterial color="#74efdc" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 18]} />
        <meshStandardMaterial color="#152328" metalness={0.45} roughness={0.65} />
      </mesh>
      <gridHelper args={[24, 24, "#294a50", "#1a3036"]} position={[0, 0.012, 0]} />
      <mesh position={[0, 4, -7]} receiveShadow><boxGeometry args={[22, 8, 0.3]} /><meshStandardMaterial color="#101b20" /></mesh>
      <mesh position={[10.5, 4, 0]} receiveShadow><boxGeometry args={[0.3, 8, 14]} /><meshStandardMaterial color="#111f23" /></mesh>
      {EQUIPMENT.slice(0, 6).map((item) => (
        <group key={item.id} position={[item.position[0], 1.25, -5.55]}>
          <mesh receiveShadow><boxGeometry args={[2.15, 2.7, 0.45]} /><meshStandardMaterial color="#1d3035" metalness={0.55} /></mesh>
          <mesh position={[0, 1.1, 0.25]}><boxGeometry args={[1.75, 0.08, 0.08]} /><meshBasicMaterial color="#64dac9" /></mesh>
        </group>
      ))}
      {[8, 5.4, 2, -1.5].map((x) => (
        <mesh key={x} position={[x, 0.55, 4.6]} receiveShadow>
          <boxGeometry args={[2.1, 1.1, 1.25]} />
          <meshStandardMaterial color="#24373b" metalness={0.55} roughness={0.42} />
        </mesh>
      ))}
      {[-8, -4, 0, 4, 8].map((x) => (
        <mesh key={x} position={[x, 6.4, -6.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3, 10]} />
          <meshBasicMaterial color="#75e8d8" />
        </mesh>
      ))}
    </group>
  );
}

function PrepRoom({ mission, setNearby }: any) {
  const playerRef = useRef<any>(null);
  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls();
  const yaw = useRef(0);
  const nearbyRef = useRef("");
  const walking = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const lock = () => {
      if (mission.phase === "preparation" && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    };
    const look = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas) yaw.current -= event.movementX * 0.0022;
    };
    canvas.addEventListener("click", lock);
    document.addEventListener("mousemove", look);
    return () => {
      canvas.removeEventListener("click", lock);
      document.removeEventListener("mousemove", look);
    };
  }, [gl, mission.phase]);

  useFrame((state, delta) => {
    if (!playerRef.current) return;
    const boarding = mission.phase === "boarding";
    walking.current = false;
    if (mission.phase === "preparation" && !mission.interactionLocked) {
      const keys = getKeys();
      const up = keys['forward'] || touchMove.forward;
      const backward = keys['backward'] || touchMove.backward;
      const left = keys['left'] || touchMove.left;
      const right = keys['right'] || touchMove.right;
      forward.set(Math.sin(yaw.current), 0, Math.cos(yaw.current));
      side.set(forward.z, 0, -forward.x);
      temp.set(0, 0, 0);
      if (up) temp.addScaledVector(forward, -1);
      if (backward) temp.add(forward);
      if (left) temp.addScaledVector(side, -1);
      if (right) temp.add(side);
      if (temp.lengthSq() > 0) {
        temp.normalize();
        walking.current = true;
        playerRef.current.position.addScaledVector(temp, delta * 3.6);
        playerRef.current.rotation.y = Math.atan2(temp.x, temp.z);
      }
      playerRef.current.position.x = MathUtils.clamp(playerRef.current.position.x, -9.2, 9.2);
      playerRef.current.position.z = MathUtils.clamp(playerRef.current.position.z, -6.5, 6.7);
    }
    if (boarding) {
      const target = mission.boardingStep === 0 ? new Vector3(-5.8, 0, 4.7) : new Vector3(-7.2, 0, 4.7);
      playerRef.current.position.lerp(target, delta * 1.4);
      playerRef.current.rotation.y = MathUtils.lerp(playerRef.current.rotation.y, -Math.PI / 2, delta * 2);
    }
    const cameraDistance = boarding ? 6 : 7.2;
    const cameraHeight = boarding ? 3.1 : 4.3;
    const angle = boarding ? 0.8 : yaw.current;
    temp.set(
      playerRef.current.position.x + Math.sin(angle) * cameraDistance,
      cameraHeight,
      playerRef.current.position.z + Math.cos(angle) * cameraDistance,
    );
    camera.position.lerp(temp, boarding ? 0.035 : 0.12);
    camera.lookAt(playerRef.current.position.x, 1.25, playerRef.current.position.z);

    if (mission.phase === "preparation") {
      let closest: any = null;
      let closestDistance = 2.05;
      EQUIPMENT.forEach((item) => {
        if (mission.collectedEquipment.includes(item.id)) return;
        const distance = playerRef.current.position.distanceTo(new Vector3(...item.position));
        if (distance < closestDistance) {
          closest = { ...item, kind: "equipment" };
          closestDistance = distance;
        }
      });
      const rocketDistance = playerRef.current.position.distanceTo(new Vector3(...ROCKET_POSITION));
      if (rocketDistance < 2.7) closest = { kind: "rocket", id: "rocket", name: "PROTOCOL B-612" };
      const key = closest?.id || "";
      if (nearbyRef.current !== key) {
        nearbyRef.current = key;
        setNearby(closest);
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#071015"]} />
      <fog attach="fog" args={["#071015", 12, 34]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 10, 4]} color="#dffbf5" intensity={2.2} castShadow />
      <pointLight position={[-7, 4, 4]} color="#72e9dc" intensity={28} distance={12} />
      <Room />
      <Rocket atPad boardingStep={mission.boardingStep} />
      <Astronaut
        rigRef={playerRef}
        suited={false}
        gearLevel={mission.equipmentCount}
        reaching={Boolean(mission.collectingId)}
        walking={walking.current}
      />
      {EQUIPMENT.map((item, index) => (
        <EquipmentObject key={item.id} item={item} index={index} mission={mission} playerRef={playerRef} />
      ))}
    </>
  );
}

function Cockpit({ mission }: any) {
  const camera = useThree((state) => state.camera);
  useFrame((state) => {
    camera.position.lerp(new Vector3(0, 2.2, 5.4), 0.08);
    camera.lookAt(0, 1.9, -2);
    camera.rotation.z = Math.sin(state.clock.elapsedTime * 8) * (mission.phase === "countdown" ? 0.0015 : 0.0004);
  });
  return (
    <>
      <color attach="background" args={["#03090c"]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 3, 2]} color="#70e3d2" intensity={15} distance={8} />
      <pointLight position={[-3, 1, -1]} color="#df6438" intensity={8} distance={5} />
      <mesh position={[0, 2.2, -4.5]}><boxGeometry args={[8, 5, 0.4]} /><meshStandardMaterial color="#101c20" metalness={0.7} /></mesh>
      <mesh position={[0, 2.9, -4.25]}><boxGeometry args={[4.6, 1.5, 0.2]} /><meshPhysicalMaterial color="#27424a" transmission={0.2} roughness={0.18} /></mesh>
      <mesh position={[0, 0.7, -2.5]} rotation={[-0.4, 0, 0]}><boxGeometry args={[6.5, 1.8, 1]} /><meshStandardMaterial color="#17272c" metalness={0.65} /></mesh>
      {[-2.2, -1.1, 0, 1.1, 2.2].map((x, index) => (
        <group key={x} position={[x, 1.2, -1.95]}>
          <mesh><boxGeometry args={[0.75, 0.48, 0.05]} /><meshStandardMaterial color="#092126" emissive={index % 2 ? "#1b6d65" : "#6b2d18"} emissiveIntensity={1.3} /></mesh>
          <mesh position={[0, -0.46, 0.02]}><boxGeometry args={[0.09, 0.18, 0.05]} /><meshBasicMaterial color={index % 2 ? "#76efde" : "#e67b47"} /></mesh>
        </group>
      ))}
      <SeatedAstronaut />
    </>
  );
}

function LaunchScene({ mission }: any) {
  const rocket = useRef<any>(null);
  const smoke = useRef<any>(null);
  const phaseTime = useRef(0);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    phaseTime.current = 0;
  }, [mission.phase]);
  useFrame((state, delta) => {
    phaseTime.current += delta;
    const elapsed = state.clock.elapsedTime;
    let targetY = 0;
    if (mission.phase === "liftoff") targetY = Math.min(17, phaseTime.current * 5.5);
    if (mission.phase === "ascent") targetY = 28;
    if (rocket.current) rocket.current.position.y = MathUtils.lerp(rocket.current.position.y, targetY, delta * 0.65);
    if (mission.phase === "ignition" || mission.phase === "liftoff") {
      camera.position.x = Math.sin(elapsed * 38) * 0.055;
      camera.position.y = 5.6 + Math.cos(elapsed * 34) * 0.045;
    }
    if (mission.phase === "ascent") {
      camera.position.lerp(new Vector3(10, 16, 22), delta * 0.42);
      camera.lookAt(0, rocket.current?.position.y ?? 10, 0);
    } else {
      camera.position.lerp(new Vector3(10, 5.6, 17), delta * 0.5);
      camera.lookAt(0, 5.4, 0);
    }
    if (smoke.current) smoke.current.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.08);
  });
  const flame = ["ignition", "liftoff", "ascent"].includes(mission.phase);
  return (
    <>
      <color attach="background" args={[mission.phase === "ascent" ? "#061424" : "#183a4a"]} />
      <fog attach="fog" args={["#173846", 18, 75]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[-8, 18, 10]} color="#f5eee2" intensity={2.8} />
      <group ref={rocket}>
        <Rocket />
        {flame && (
          <group position={[0, -1.4, 0]}>
            <mesh><coneGeometry args={[1.1, 6.5, 22]} /><meshBasicMaterial color="#ffb23f" transparent opacity={0.86} /></mesh>
            <pointLight color="#ff7b2d" intensity={180} distance={20} />
          </group>
        )}
      </group>
      <mesh position={[0, -1.2, 0]} receiveShadow><cylinderGeometry args={[6, 7, 1, 48]} /><meshStandardMaterial color="#242c2e" /></mesh>
      <group position={[4, 4, 0]}>
        <mesh><boxGeometry args={[0.7, 11, 0.7]} /><meshStandardMaterial color="#596466" /></mesh>
        {[0, 2, 4, 6, 8].map((y) => <mesh key={y} position={[-2, y - 3.7, 0]}><boxGeometry args={[4, 0.18, 0.35]} /><meshStandardMaterial color="#6f7b7d" /></mesh>)}
      </group>
      {flame && (
        <group ref={smoke}>
          {Array.from({ length: 18 }).map((_, index) => (
            <Float key={index} speed={1 + (index % 4)} floatIntensity={1.4}>
              <mesh position={[((index % 6) - 2.5) * 1.1, -1.5 + (index % 3) * 0.3, ((index % 4) - 1.5) * 1.2]}>
                <sphereGeometry args={[0.7 + (index % 3) * 0.35, 12, 12]} />
                <meshStandardMaterial color={index % 2 ? "#b8b7af" : "#696d6c"} transparent opacity={0.48} />
              </mesh>
            </Float>
          ))}
        </group>
      )}
    </>
  );
}

function SpaceScene({ mission }: any) {
  const craft = useRef<any>(null);
  const camera = useThree((state) => state.camera);
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    camera.position.lerp(new Vector3(7, 3.2, 12), delta * 0.4);
    camera.lookAt(0, 0, 0);
    if (craft.current) {
      craft.current.rotation.z = Math.sin(time * 0.5) * 0.03;
      craft.current.position.x = Math.sin(time * 0.2) * 0.25;
    }
  });
  return (
    <>
      <color attach="background" args={["#010407"]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[-8, 6, 5]} color="#f8e6c0" intensity={3.5} />
      <Stars radius={100} depth={50} count={3000} factor={3} fade speed={0.25} />
      <mesh position={[-11, -4, -8]}>
        <sphereGeometry args={[6, 48, 48]} />
        <meshStandardMaterial color="#25688d" roughness={0.88} />
      </mesh>
      <mesh position={[mission.phase === "journey" ? 6 : 18, 2.2, -28]}>
        <sphereGeometry args={[3.4, 48, 48]} />
        <meshStandardMaterial color="#a54b2c" roughness={0.95} />
      </mesh>
      <group ref={craft} rotation={[0.1, -0.6, -0.15]}>
        <Rocket />
        <mesh position={[0, -1.6, 0]}><coneGeometry args={[0.65, 4, 18]} /><meshBasicMaterial color="#78e7d8" transparent opacity={0.38} /></mesh>
      </group>
    </>
  );
}

export function GameWorld({ mission, setNearby }: any) {
  if (mission.phase === "preparation" || mission.phase === "boarding") {
    return <PrepRoom mission={mission} setNearby={setNearby} />;
  }
  if (mission.phase === "cockpit" || mission.phase === "countdown") {
    return <Cockpit mission={mission} />;
  }
  if (["ignition", "liftoff", "ascent"].includes(mission.phase)) {
    return <LaunchScene mission={mission} />;
  }
  return <SpaceScene mission={mission} />;
}
