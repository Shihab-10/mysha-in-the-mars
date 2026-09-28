import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload, Stars } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { GROWTH_LABELS, PLOT_POSITIONS, STATIONS, SOL_CHECKPOINTS } from "../game/data";
import { touchMove } from "../game/input";
import { checkpointStatus } from "../game/mission";
import { Astronaut, Rocket, SignLabel } from "./Actors";
import { Button, Meter } from "./UI";
import { TouchPad } from "./TouchControls";

const keys = { up: false, down: false, left: false, right: false };

function useWalkKeys(onInteract: () => void) {
  useEffect(() => {
    const set = (code: string, value: boolean) => {
      if (code === "KeyW" || code === "ArrowUp") keys.up = value;
      if (code === "KeyS" || code === "ArrowDown") keys.down = value;
      if (code === "KeyA" || code === "ArrowLeft") keys.left = value;
      if (code === "KeyD" || code === "ArrowRight") keys.right = value;
    };
    const down = (e: KeyboardEvent) => {
      set(e.code, true);
      if (e.code === "KeyE" && !e.repeat) onInteract();
    };
    const up = (e: KeyboardEvent) => set(e.code, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.up = keys.down = keys.left = keys.right = false;
    };
  }, [onInteract]);
}

/* ---------------- Outpost props ---------------- */

function Habitat() {
  return (
    <group position={[0, 0, 7.5]}>
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[2.6, 4.4, 8, 24]} />
        <meshStandardMaterial color="#d7dedb" metalness={0.25} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.3, -2.9]}>
        <cylinderGeometry args={[1.1, 1.1, 1.8, 18]} />
        <meshStandardMaterial color="#9fb0b2" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.3, -3.8]}>
        <circleGeometry args={[0.85, 22]} />
        <meshStandardMaterial color="#123239" emissive="#0e4b46" emissiveIntensity={0.9} />
      </mesh>
      <SignLabel text="HABITAT · E" position={[0, 3.6, -3.4]} scale={1} />
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 2.4, -2.3]}>
          <circleGeometry args={[0.5, 20]} />
          <meshStandardMaterial color="#8fd8e6" emissive="#2a7f86" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PotatoPlant({ stage, stressed }: { stage: number; stressed: boolean }) {
  if (stage === 0) return null;
  const h = 0.12 + stage * 0.16;
  const color = stressed ? "#a7913f" : stage >= 4 ? "#5fbd5a" : "#4a9b52";
  return (
    <group>
      {[-0.18, 0, 0.18].map((x, i) => (
        <mesh key={x} position={[x, h / 2, (i - 1) * 0.12]} castShadow>
          <coneGeometry args={[0.1 + stage * 0.02, h, 7]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      {stage >= 4 &&
        [-0.2, 0.22].map((x) => (
          <mesh key={x} position={[x, 0.06, 0.24]}>
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshStandardMaterial color="#c79a5e" roughness={0.9} />
          </mesh>
        ))}
    </group>
  );
}

function Greenhouse({ plots, powered }: any) {
  return (
    <group position={[9, 0, 1]}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[5.4, 2.8, 4.4]} />
        <meshPhysicalMaterial color="#9fe4e0" transparent opacity={0.22} roughness={0.08} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.2, 4.2]} />
        <meshStandardMaterial color="#3c2b22" roughness={1} />
      </mesh>
      {PLOT_POSITIONS.map((p, i) => (
        <group key={i} position={[p[0] * 1.35, 0.14, p[2] * 1.35]}>
          <mesh receiveShadow>
            <boxGeometry args={[1.1, 0.28, 0.9]} />
            <meshStandardMaterial color="#4a3324" roughness={1} />
          </mesh>
          <group position={[0, 0.16, 0]}>
            <PotatoPlant stage={plots[i].stage} stressed={plots[i].stressed} />
          </group>
        </group>
      ))}
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 2.5, 0]}>
          <boxGeometry args={[2.2, 0.1, 0.24]} />
          <meshStandardMaterial color="#e9f7c8" emissive={powered ? "#b6ff7d" : "#1d2a1a"} emissiveIntensity={powered ? 1.4 : 0.1} />
        </mesh>
      ))}
      <mesh position={[0, 1, 2.3]}>
        <boxGeometry args={[0.8, 1, 0.2]} />
        <meshStandardMaterial color="#17313a" emissive="#1c6f68" emissiveIntensity={0.8} />
      </mesh>
      <SignLabel text="GREENHOUSE" position={[0, 3.2, 0]} scale={1.1} />
    </group>
  );
}

function WaterUnit({ health }: { health: number }) {
  const flow = useRef<any>(null);
  useFrame((state) => {
    if (flow.current) flow.current.material.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 4) * 0.2 * (health / 100);
  });
  return (
    <group position={[-9, 0, 1]}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.4, 2, 20]} />
        <meshStandardMaterial color="#8ba3aa" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh ref={flow} position={[0, 1.2, 1.25]}>
        <boxGeometry args={[1.6, 0.4, 0.1]} />
        <meshBasicMaterial color="#79d9ff" transparent opacity={0.5} />
      </mesh>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 1.7, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 2, 12]} />
          <meshStandardMaterial color="#6d7f84" metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#0d2b30" emissive={health > 50 ? "#4be0c4" : "#e77b3d"} emissiveIntensity={1.4} />
      </mesh>
      <SignLabel text="WATER RECYCLER" position={[0, 3, 0]} scale={1.1} />
    </group>
  );
}

function SolarArray({ dust }: { dust: number }) {
  const tone = MathUtils.lerp(0.1, 0.65, dust / 100);
  return (
    <group position={[-4, 0, -9]}>
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 1.6, 10]} />
            <meshStandardMaterial color="#6d7a7d" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.6, 0]} rotation={[-0.7, 0, 0]} castShadow>
            <boxGeometry args={[2.4, 0.08, 1.6]} />
            <meshStandardMaterial color={`rgb(${Math.round(40 + tone * 150)}, ${Math.round(60 + tone * 90)}, ${Math.round(110 - tone * 40)})`} metalness={0.6} roughness={0.3 + tone} />
          </mesh>
        </group>
      ))}
      <SignLabel text="SOLAR ARRAY" position={[0, 3, 0]} scale={1.1} />
    </group>
  );
}

function Storage() {
  return (
    <group position={[6, 0, -8]}>
      {[[-0.9, 0.4, 0], [0.9, 0.4, 0], [0, 1.2, 0]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[1.5, 0.8, 1.2]} />
          <meshStandardMaterial color={i === 2 ? "#c98b4c" : "#9aa8a6"} metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
      <SignLabel text="FOOD STORAGE" position={[0, 2.5, 0]} scale={1.1} />
    </group>
  );
}

function Antenna() {
  const dish = useRef<any>(null);
  useFrame((state) => {
    if (dish.current) dish.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.5;
  });
  return (
    <group position={[13, 0, -7]}>
      <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[0.12, 0.16, 3.6, 10]} /><meshStandardMaterial color="#77848a" metalness={0.7} /></mesh>
      <group ref={dish} position={[0, 3.6, 0]}>
        <mesh rotation={[-0.9, 0, 0]}>
          <sphereGeometry args={[1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <meshStandardMaterial color="#dfe6e3" metalness={0.4} side={2} />
        </mesh>
      </group>
      <SignLabel text="COMMS" position={[0, 5.2, 0]} scale={0.9} />
    </group>
  );
}

function ExteriorWorld({ mission }: any) {
  const rocks = useMemo(
    () => Array.from({ length: 40 }).map((_, i) => ({ x: Math.sin(i * 15.3) * 26, z: Math.cos(i * 9.7) * 24, s: 0.25 + ((i * 17) % 8) / 10 })),
    [],
  );
  const powered = mission.power > 18;
  return (
    <>
      <color attach="background" args={["#e8b189"]} />
      <fog attach="fog" args={["#d29a72", 30, 150]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[16, 26, 10]} color="#ffdbb5" intensity={2.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Stars radius={180} depth={50} count={500} factor={5} fade speed={0.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#9b4a2c" roughness={1} />
      </mesh>
      {[-40, -12, 20, 46].map((x, i) => (
        <mesh key={x} position={[x, 3 + i, -44 - i * 5]}>
          <coneGeometry args={[15 + i * 2, 9 + i * 2, 6]} />
          <meshStandardMaterial color="#7d3a22" roughness={1} />
        </mesh>
      ))}
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.s * 0.4, r.z]} castShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color={i % 3 ? "#8b4428" : "#6f3620"} roughness={1} />
        </mesh>
      ))}
      <Habitat />
      <Greenhouse plots={mission.plots} powered={powered} />
      <WaterUnit health={mission.recyclerHealth} />
      <SolarArray dust={mission.panelDust} />
      <Storage />
      <Antenna />
      <group position={[-16, 0, -2]} scale={0.7}>
        <Rocket legsDeployed />
      </group>
    </>
  );
}

function InteriorWorld({ mission }: any) {
  return (
    <>
      <color attach="background" args={["#07151a"]} />
      <fog attach="fog" args={["#07151a", 14, 42]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 3.2, 0]} color="#8ff0e0" intensity={22} distance={16} />
      <pointLight position={[0, 2.4, -4]} color={mission.shelterActive ? "#ffb066" : "#4fd6c2"} intensity={14} distance={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#1b2c31" metalness={0.4} roughness={0.7} />
      </mesh>
      <gridHelper args={[16, 16, "#2c4b52", "#1d3339"]} position={[0, 0.01, 0]} />
      {/* walls */}
      <mesh position={[0, 2.2, -7]}><boxGeometry args={[16, 4.4, 0.3]} /><meshStandardMaterial color="#13252a" /></mesh>
      <mesh position={[-7.5, 2.2, 0]}><boxGeometry args={[0.3, 4.4, 14]} /><meshStandardMaterial color="#13252a" /></mesh>
      <mesh position={[7.5, 2.2, 0]}><boxGeometry args={[0.3, 4.4, 14]} /><meshStandardMaterial color="#13252a" /></mesh>
      {/* window to Mars */}
      <mesh position={[0, 2.4, -6.8]}>
        <circleGeometry args={[1.4, 28]} />
        <meshBasicMaterial color="#c9713f" />
      </mesh>
      {/* control console */}
      <group position={[-3.6, 0, -2.4]}>
        <mesh position={[0, 0.8, 0]}><boxGeometry args={[2.4, 1.6, 0.9]} /><meshStandardMaterial color="#1a3038" metalness={0.6} /></mesh>
        <mesh position={[0, 1.5, 0.3]} rotation={[-0.5, 0, 0]}><boxGeometry args={[2, 0.8, 0.06]} /><meshStandardMaterial color="#0b262b" emissive="#2ec6b0" emissiveIntensity={1.2} /></mesh>
        <SignLabel text="POWER CONSOLE" position={[0, 2.4, 0]} scale={0.9} />
      </group>
      {/* radiation shelter */}
      <group position={[3.8, 0, -2.4]}>
        <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[1.3, 1.3, 2.4, 18, 1, true]} /><meshStandardMaterial color="#54626a" metalness={0.65} side={2} /></mesh>
        <mesh position={[0, 2.5, 0]}><sphereGeometry args={[1.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#6a7880" metalness={0.6} /></mesh>
        <mesh position={[0, 0.5, 1.28]}><planeGeometry args={[0.8, 0.5]} /><meshStandardMaterial color="#09231f" emissive={mission.shelterActive ? "#4be07f" : mission.radiation > 50 ? "#ff5340" : "#e7b85e"} emissiveIntensity={1.4} /></mesh>
        <SignLabel text="RADIATION SHELTER" position={[0, 3.6, 0]} scale={1} />
      </group>
      {/* mission computer */}
      <group position={[0, 0, -4.2]}>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.6, 1.8, 0.6]} /><meshStandardMaterial color="#17282e" metalness={0.5} /></mesh>
        <mesh position={[0, 1.5, 0.32]}><planeGeometry args={[1.2, 0.7]} /><meshStandardMaterial color="#061e22" emissive="#39d2ff" emissiveIntensity={1.1} /></mesh>
        <SignLabel text="MISSION COMPUTER" position={[0, 2.5, 0]} scale={0.9} />
      </group>
      {/* sleeping area + storage */}
      {[-5.6, -4.2].map((z, i) => (
        <mesh key={z} position={[5.4, 0.45, z]}>
          <boxGeometry args={[2.4, 0.5, 1]} />
          <meshStandardMaterial color={i ? "#2b4149" : "#31505a"} />
        </mesh>
      ))}
      <mesh position={[-5.6, 0.7, 2.4]}><boxGeometry args={[1.4, 1.4, 1.4]} /><meshStandardMaterial color="#30474d" /></mesh>
      {/* airlock */}
      <group position={[0, 0, 5.2]}>
        <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[1.1, 1.1, 2.6, 18]} /><meshStandardMaterial color="#9fb0b2" metalness={0.5} /></mesh>
        <mesh position={[0, 1.3, 0.62]}><circleGeometry args={[0.8, 22]} /><meshStandardMaterial color="#123239" emissive="#0e4b46" emissiveIntensity={0.9} /></mesh>
        <SignLabel text="AIRLOCK · E" position={[0, 2.9, 0.7]} scale={0.9} />
      </group>
    </>
  );
}

/* ---------------- Player ---------------- */

function Walker({ mission, setNearby, playSound }: any) {
  const rig = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const dir = useRef(new Vector3());
  const nearbyRef = useRef("");
  const stepTimer = useRef(0);
  const interior = mission.interior;

  useEffect(() => {
    if (rig.current) rig.current.position.set(0, 0, interior ? 3.2 : 0);
  }, [interior]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!rig.current) return;
    const up = keys.up || touchMove.forward;
    const down = keys.down || touchMove.backward;
    const left = keys.left || touchMove.left;
    const right = keys.right || touchMove.right;
    dir.current.set((right ? 1 : 0) - (left ? 1 : 0), 0, (down ? 1 : 0) - (up ? 1 : 0));
    const moving = dir.current.lengthSq() > 0;
    if (moving) {
      dir.current.normalize();
      rig.current.position.addScaledVector(dir.current, delta * 4.2);
      rig.current.rotation.y = MathUtils.lerp(rig.current.rotation.y, Math.atan2(dir.current.x, dir.current.z), 0.25);
      stepTimer.current += delta;
      if (stepTimer.current > 0.45) {
        stepTimer.current = 0;
        playSound("footstep");
      }
    }
    const bound = interior ? 6.4 : 22;
    rig.current.position.x = MathUtils.clamp(rig.current.position.x, -bound, bound);
    rig.current.position.z = MathUtils.clamp(rig.current.position.z, -bound, interior ? 6.2 : bound);

    camera.position.lerp(new Vector3(rig.current.position.x + 1, interior ? 4 : 5, rig.current.position.z + (interior ? 7 : 9)), delta * 3);
    camera.lookAt(rig.current.position.x, 1.4, rig.current.position.z);

    let closest: any = null;
    let best = 3.4;
    STATIONS.filter((s) => Boolean(s.interior) === interior).forEach((station) => {
      const d = rig.current.position.distanceTo(new Vector3(...station.position));
      if (d < best) {
        best = d;
        closest = station;
      }
    });
    const key = closest?.id ?? "";
    if (key !== nearbyRef.current) {
      nearbyRef.current = key;
      setNearby(closest);
    }
  });

  return <Astronaut rigRef={rig} suited walking={keys.up || keys.down || keys.left || keys.right || touchMove.forward} />;
}

/* ---------------- Level shell ---------------- */

export function Level4({ mission, actions, soundOn, onToggleSound, playSound }: any) {
  const [nearby, setNearby] = useState<any>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | undefined>(undefined);

  const say = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const interact = useRef<() => void>(() => {});
  interact.current = () => {
    if (modal) return;
    if (!nearby) {
      say("WALK CLOSER TO A STATION");
      return;
    }
    switch (nearby.id) {
      case "habitat":
        playSound("hatch");
        actions.setInterior(true);
        say("ENTERED THE HABITAT");
        break;
      case "airlock-in":
        playSound("hatch");
        actions.setInterior(false);
        say("BACK ON THE SURFACE");
        break;
      case "greenhouse":
        setModal("greenhouse");
        break;
      case "console":
        setModal("console");
        break;
      case "computer":
        setModal("computer");
        break;
      case "shelter":
        playSound("shield");
        actions.toggleShelter();
        say(mission.shelterActive ? "SHELTER RELEASED" : "RADIATION SHELTER ENGAGED · POWER IN USE");
        break;
      case "water":
        playSound("water");
        actions.maintainWater();
        say("WATER ROUTED · RECYCLER SERVICED");
        break;
      case "solar":
        playSound("clean");
        actions.cleanSolar();
        say("PANELS CLEANED · POWER GENERATION UP");
        break;
      case "storage":
        playSound("cabinet");
        actions.collectFood();
        say("RATION CRATE COLLECTED · +9 FOOD");
        break;
      case "antenna":
        playSound("radio");
        say("LINK TO EARTH STABLE · 14 MIN DELAY");
        break;
      default:
        break;
    }
  };

  useWalkKeys(() => interact.current());

  /* Sol clock */
  useEffect(() => {
    if (mission.phase !== "level4") return;
    const id = window.setInterval(() => actions.advanceSol(), 6500);
    return () => window.clearInterval(id);
  }, [mission.phase, actions]);

  useEffect(() => {
    if (mission.activeEvent) playSound("alert");
  }, [mission.activeEvent, playSound]);

  useEffect(() => () => { if (noticeTimer.current) window.clearTimeout(noticeTimer.current); }, []);

  const checkpoints = checkpointStatus(mission);
  const nextCheckpoint = checkpoints.find((c) => !c.done);
  const allDone = checkpoints.every((c) => c.done);
  const missionReady = allDone && mission.sol >= 20;

  return (
    <main className="game-shell">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [2, 6, 12], fov: 52, far: 400 }}>
        <Suspense fallback={null}>
          {mission.interior ? <InteriorWorld mission={mission} /> : <ExteriorWorld mission={mission} />}
          <Walker mission={mission} setNearby={setNearby} playSound={playSound} />
          <Preload all />
        </Suspense>
      </Canvas>

      <div className="game-hud">
        <header className="hud-top">
          <div className="hud-brand"><i /><span>MYSHA IN THE MARS<small>Level 4 · Outpost Survival</small></span></div>
          <div className="phase-label">
            <span>SOL {String(mission.sol).padStart(2, "0")}</span><i />
            <b>{mission.interior ? "Habitat interior" : "Outpost exterior"}</b>
          </div>
          <Button variant="ghost" className="hud-sound" onClick={onToggleSound}>Audio {soundOn ? "On" : "Off"}</Button>
        </header>

        <aside className="panel-card resource-panel">
          <h3>Outpost status</h3>
          <Meter label="Oxygen" value={mission.oxygen} />
          <Meter label="Water" value={mission.water} />
          <Meter label="Power" value={mission.power} />
          <Meter label="Food" value={mission.food} />
          <Meter label="Crew" value={mission.crewHealth} />
          <Meter label="Radiation" value={100 - mission.radiation} />
          <Meter label="Panels" value={100 - mission.panelDust} />
          <Meter label="Recycler" value={mission.recyclerHealth} />
        </aside>

        <aside className="panel-card task-panel">
          <h3>Sol checkpoints</h3>
          <div className="task-list">
            {checkpoints.map((c) => (
              <div key={c.id} className={`task-row ${c.done ? "is-done" : c.id === nextCheckpoint?.id ? "is-active" : ""}`}>
                <i />
                <span>SOL {c.sol} · {c.title}</span>
              </div>
            ))}
          </div>
          <p className="task-hint">{nextCheckpoint ? nextCheckpoint.task : "All checkpoints complete — file the mission report."}</p>
        </aside>

        {mission.activeEvent && (
          <div className="alarm-banner">
            <span>Mission event · SOL {mission.sol}</span>
            <strong>{mission.activeEvent.title}</strong>
            <p>{mission.activeEvent.text} → {mission.activeEvent.task}</p>
          </div>
        )}

        {notice && <div className="notice-toast">{notice}</div>}

        {nearby ? (
          <Button className="interaction-prompt" onClick={() => interact.current()}>
            <kbd>E</kbd>
            <span><small>{nearby.name}</small>{nearby.prompt}</span>
          </Button>
        ) : (
          <div className="objective-strip">
            <span>Objective</span>
            <b>{nextCheckpoint ? nextCheckpoint.task : "Report to the mission computer inside the habitat"}</b>
          </div>
        )}

        <TouchPad onInteract={() => interact.current()} />

        {missionReady && !modal && (
          <div className="action-bar" style={{ bottom: "9.8rem" }}>
            <Button onClick={() => { playSound("complete"); actions.finishMission(); }}>File final mission report</Button>
          </div>
        )}
      </div>

      {modal === "greenhouse" && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span>Greenhouse · Mars research facility</span>
            <strong>Potato cultivation</strong>
            <p>Select a plot to grow potatoes. Planting uses water and power; grow lights keep drawing power while plants develop. Growth advances every sol when water and power stay healthy.</p>
            <div className="plot-grid">
              {mission.plots.map((plot: any, i: number) => (
                <button
                  key={i}
                  className={`plot-tile ${plot.stage === 4 ? "is-ready" : ""} ${plot.stressed ? "is-stressed" : ""}`}
                  onClick={() => {
                    if (plot.stage === 4) {
                      playSound("harvest");
                      actions.harvest(i);
                      say("FOOD READY FOR HARVEST · +18 FOOD");
                    } else if (plot.stage === 0) {
                      if (mission.water < 8 || mission.power < 8) {
                        playSound("locked");
                        say("NOT ENOUGH WATER OR POWER TO PLANT");
                        return;
                      }
                      playSound("plant");
                      actions.plant(i);
                      say("WATER ROUTED TO GREENHOUSE · POWER USED FOR GROW LIGHTS");
                    } else {
                      playSound("locked");
                      say(plot.stressed ? "PLANTS ARE STRESSED · ADD WATER AND POWER" : "POTATO PLANTS ARE GROWING");
                    }
                  }}
                >
                  <span>Plot {i + 1}</span>
                  <strong>{GROWTH_LABELS[plot.stage]}</strong>
                  <span>{plot.stressed ? "Stressed · low water/power" : plot.stage === 0 ? "Empty bed, ready to plant" : "Growing normally"}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Close greenhouse</Button>
            </div>
          </div>
        </div>
      )}

      {modal === "console" && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span>Power console · SOL {mission.sol}</span>
            <strong>Power priority</strong>
            <p>Solar power is limited. Choose what gets it first — every choice has a real consequence for the next sols.</p>
            <div className="modal-actions">
              {[
                ["life-support", "Life support — more oxygen"],
                ["greenhouse", "Greenhouse — more food"],
                ["water", "Water recycling — more water"],
                ["balanced", "Balanced — a little of everything"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={mission.powerPriority === value ? "primary" : "secondary"}
                  onClick={() => {
                    playSound("confirmed");
                    actions.setPriority(value);
                    say(`POWER PRIORITY · ${String(label).toUpperCase()}`);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModal(null)}>Close console</Button>
            </div>
          </div>
        </div>
      )}

      {modal === "computer" && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <span>Mission computer</span>
            <strong>Outpost log · SOL {mission.sol}</strong>
            <p>
              {SOL_CHECKPOINTS.length} checkpoints define this expedition. Completed: {checkpoints.filter((c) => c.done).length}.
              {missionReady ? " All objectives met — the final report can be filed." : " Keep the outpost alive and finish the remaining tasks."}
            </p>
            <div className="task-list" style={{ marginTop: "1rem" }}>
              {mission.log.slice(0, 8).map((entry: string, i: number) => (
                <div className="task-row is-done" key={i}><i /><span>{entry}</span></div>
              ))}
            </div>
            <div className="modal-actions">
              {missionReady && <Button onClick={() => { playSound("complete"); actions.finishMission(); }}>File mission report</Button>}
              <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
