import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Preload } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { LEAK_STEPS, SHIP_NAME } from "../game/data";
import { Astronaut, SignLabel } from "./Actors";
import { Button, Meter } from "./UI";

/* --------- Scene --------- */

function JourneyDriver({ mission, actions }: any) {
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    if (mission.phase !== "level2") return;
    const blocked = mission.leakActive && !mission.leakResolved && mission.journeyProgress >= 58;
    if (blocked || mission.journeyProgress >= 100) return;
    accumulator.current += delta;
    if (accumulator.current > 0.25) {
      actions.journeyProgress(accumulator.current * 2.6);
      accumulator.current = 0;
    }
  });
  return null;
}

function LeakJet({ active }: { active: boolean }) {
  const group = useRef<any>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.visible = active;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child: any, i: number) => {
      const p = ((t * 1.6 + i * 0.22) % 1);
      child.position.set(-0.1 - p * 1.4, 0.2 + p * 0.5, 0.2 + Math.sin(i) * 0.1);
      child.scale.setScalar(0.06 + p * 0.28);
      child.material.opacity = 0.55 * (1 - p);
    });
  });
  return (
    <group ref={group} position={[-2.1, 1.1, -1.1]}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#bdf6ff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Station({ position, label, color, alert }: any) {
  const ref = useRef<any>(null);
  useFrame((state) => {
    if (ref.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * (alert ? 8 : 2)) * 0.5;
      ref.current.material.emissiveIntensity = 0.6 + pulse * (alert ? 1.6 : 0.5);
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.2, 1.7, 0.5]} />
        <meshStandardMaterial color="#16292f" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh ref={ref} position={[0, 1.2, 0.27]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshStandardMaterial color={alert ? "#41100c" : "#0a2b2b"} emissive={color} emissiveIntensity={1} />
      </mesh>
      <SignLabel text={label} position={[0, 2.05, 0.28]} scale={0.42} />
    </group>
  );
}

function CabinScene({ mission }: any) {
  const camera = useThree((state) => state.camera);
  const astronaut = useRef<any>(null);
  const mars = useRef<any>(null);
  const earth = useRef<any>(null);
  const targetStation = LEAK_STEPS[Math.min(mission.leakStep, LEAK_STEPS.length - 1)]?.station ?? [0, 0, 0];

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    camera.position.lerp(new Vector3(0, 3.1, 7.4), 0.05);
    camera.lookAt(0, 1.6, -2.4);
    camera.position.x += Math.sin(t * 9) * 0.006;
    camera.position.y += Math.cos(t * 7) * 0.005;

    if (astronaut.current) {
      const goal = mission.leakActive && !mission.leakResolved ? new Vector3(...targetStation) : new Vector3(0, 0, 1.4);
      astronaut.current.position.lerp(goal.clone().add(new Vector3(0, 0, 1.15)), delta * 1.6);
      astronaut.current.rotation.y = MathUtils.lerp(astronaut.current.rotation.y, 0, delta * 3);
    }
    const p = mission.journeyProgress / 100;
    if (mars.current) mars.current.scale.setScalar(MathUtils.lerp(0.35, 2.4, p));
    if (earth.current) earth.current.scale.setScalar(MathUtils.lerp(1.4, 0.22, p));
  });

  const alarm = mission.leakActive && !mission.leakResolved;

  return (
    <>
      <color attach="background" args={["#03090c"]} />
      <ambientLight intensity={0.26} />
      <pointLight position={[0, 3.4, 2]} color="#70e3d2" intensity={18} distance={11} />
      <pointLight position={[-3, 2, -1]} color={alarm ? "#ff5b45" : "#df6438"} intensity={alarm ? 24 : 8} distance={7} />

      {/* Window to space */}
      <group position={[0, 2.6, -6.2]}>
        <Stars radius={70} depth={40} count={1400} factor={2.6} fade speed={0.3} />
        <mesh ref={mars} position={[2.2, 0.4, -12]}>
          <sphereGeometry args={[1.6, 40, 40]} />
          <meshStandardMaterial color="#a94c2b" roughness={0.95} emissive="#3d1408" emissiveIntensity={0.3} />
        </mesh>
        <mesh ref={earth} position={[-3.1, -0.6, -13]}>
          <sphereGeometry args={[1.1, 32, 32]} />
          <meshStandardMaterial color="#2a6f9e" roughness={0.9} />
        </mesh>
      </group>

      {/* Cabin shell */}
      <mesh position={[0, 2.2, -5.2]}>
        <boxGeometry args={[11, 6, 0.3]} />
        <meshStandardMaterial color="#0f1c21" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.9, -5.02]}>
        <boxGeometry args={[5.2, 1.8, 0.1]} />
        <meshPhysicalMaterial color="#8fd5e6" transparent opacity={0.12} roughness={0.05} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#132226" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, -3.4]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[7, 1.7, 1]} />
        <meshStandardMaterial color="#17272c" metalness={0.65} />
      </mesh>

      <Station position={[-2.1, 0, -1.2]} label="OXYGEN" color={alarm ? "#ff4a32" : "#5fe6d2"} alert={alarm && mission.leakStep !== 1} />
      <Station position={[2.1, 0, -1.2]} label="EMERGENCY O2" color={mission.emergencyOxygen ? "#5fe6d2" : "#e7b85e"} alert={alarm && mission.leakStep === 1} />
      <Station position={[0, 0, -2.3]} label="POWER" color={mission.lifeSupportPowered ? "#5fe6d2" : "#7fb6ff"} alert={alarm && mission.leakStep === 2} />
      <Station position={[4.3, 0, 0.6]} label="WATER" color="#7fd8ff" alert={false} />
      <Station position={[-4.3, 0, 0.6]} label="FOOD" color="#d7b36a" alert={false} />

      <LeakJet active={alarm} />
      <Astronaut rigRef={astronaut} suited walking={false} reaching={alarm} />
      <SignLabel text={SHIP_NAME} position={[0, 4.6, -5.0]} scale={0.85} />
    </>
  );
}

/* --------- Level 2 shell --------- */

export function Level2({ mission, actions, soundOn, onToggleSound, playSound }: any) {
  const leakTriggered = useRef(false);

  useEffect(() => {
    if (!leakTriggered.current && mission.journeyProgress > 22 && !mission.leakResolved) {
      leakTriggered.current = true;
      actions.triggerLeak();
      playSound("alarm");
    }
  }, [mission.journeyProgress, mission.leakResolved, actions, playSound]);

  useEffect(() => {
    if (mission.journeyProgress >= 100 && mission.phase === "level2") {
      playSound("complete");
      actions.completeLevelTwo();
    }
  }, [mission.journeyProgress, mission.phase, actions, playSound]);

  const step = LEAK_STEPS[mission.leakStep];
  const alarm = mission.leakActive && !mission.leakResolved;

  return (
    <main className="game-shell">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 3.2, 8], fov: 50 }} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <CabinScene mission={mission} />
          <JourneyDriver mission={mission} actions={actions} />
          <Preload all />
        </Suspense>
      </Canvas>

      <div className="game-hud">
        <header className="hud-top">
          <div className="hud-brand"><i /><span>MYSHA IN THE MARS<small>Level 2 · Space Journey</small></span></div>
          <div className="phase-label">
            <span>Transit to Mars</span><i /><b>{Math.round(mission.journeyProgress)}% of the crossing</b>
          </div>
          <Button variant="ghost" className="hud-sound" onClick={onToggleSound}>Audio {soundOn ? "On" : "Off"}</Button>
        </header>

        <aside className="panel-card resource-panel">
          <h3>Life support</h3>
          <Meter label="Oxygen" value={mission.oxygen} />
          <Meter label="Water" value={mission.water} />
          <Meter label="Power" value={mission.power} />
          <Meter label="Food" value={mission.food} />
          <Meter label="Systems" value={mission.systemHealth} />
          <Meter label="Crew" value={mission.crewHealth} />
        </aside>

        <aside className="panel-card task-panel">
          <h3>{alarm ? "Emergency procedure" : "Flight plan"}</h3>
          <div className="task-list">
            {LEAK_STEPS.map((item, i) => (
              <div key={item.id} className={`task-row ${i < mission.leakStep ? "is-done" : i === mission.leakStep && alarm ? "is-active" : ""}`}>
                <i />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="task-hint">
            {alarm
              ? step?.hint
              : mission.leakResolved
                ? "Cabin pressure restored. Mars is growing in the forward window."
                : "Cruise stable. Monitor oxygen, power and water while Earth falls behind."}
          </p>
        </aside>

        {alarm && (
          <div className="alarm-banner">
            <span>Warning · Oxygen system anomaly</span>
            <strong>Oxygen leak detected</strong>
            <p>{step?.label}: {step?.hint}</p>
          </div>
        )}

        {alarm && (
          <div className="action-bar">
            {LEAK_STEPS.map((item, i) => (
              <Button
                key={item.id}
                variant={i === mission.leakStep ? "primary" : "secondary"}
                disabled={i !== mission.leakStep}
                onClick={() => {
                  actions.leakAction(item.id);
                  playSound(item.id === "repair" ? "repair" : "confirmed");
                }}
              >
                {item.action}
              </Button>
            ))}
          </div>
        )}

        {!alarm && mission.leakResolved && mission.journeyProgress < 100 && (
          <div className="objective-strip">
            <span>Mars approach</span>
            <b>Repair complete · holding course for Mars</b>
          </div>
        )}
      </div>

      {mission.phase === "level2complete" && (
        <div className="level-transition">
          <span>Level 2 complete</span>
          <strong>Mars approach successful</strong>
          <p>Oxygen emergency resolved and the crossing is done. PROTOCOL B-612 is in Mars orbit, ready for descent.</p>
          <div className="transition-stats">
            <span>Oxygen <b>{Math.round(mission.oxygen)}</b></span>
            <span>Power <b>{Math.round(mission.power)}</b></span>
            <span>Systems <b>{Math.round(mission.systemHealth)}</b></span>
            <span>Crew <b>{Math.round(mission.crewHealth)}</b></span>
          </div>
          <Button onClick={actions.enterLevelThree}>Continue to Level 3</Button>
        </div>
      )}
    </main>
  );
}
