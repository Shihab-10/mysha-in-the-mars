import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload, Stars } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { LANDING_ZONES } from "../game/data";
import { touchMove } from "../game/input";
import { Astronaut, Rocket, SignLabel } from "./Actors";
import { Button } from "./UI";
import { TouchPad } from "./TouchControls";

const keys = { up: false, down: false, left: false, right: false };

function useLandingKeys() {
  useEffect(() => {
    const set = (code: string, value: boolean) => {
      if (code === "KeyW" || code === "ArrowUp") keys.up = value;
      if (code === "KeyS" || code === "ArrowDown") keys.down = value;
      if (code === "KeyA" || code === "ArrowLeft") keys.left = value;
      if (code === "KeyD" || code === "ArrowRight") keys.right = value;
    };
    const down = (e: KeyboardEvent) => set(e.code, true);
    const up = (e: KeyboardEvent) => set(e.code, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.up = keys.down = keys.left = keys.right = false;
    };
  }, []);
}

/* ---------------- Mars terrain ---------------- */

function MarsGround({ withZones = true, selected }: { withZones?: boolean; selected?: string | null }) {
  const rocks = useMemo(
    () =>
      Array.from({ length: 46 }).map((_, i) => ({
        p: [Math.sin(i * 12.9898) * 34, 0, Math.cos(i * 78.233) * 30] as [number, number, number],
        s: 0.3 + ((i * 37) % 10) / 9,
      })),
    [],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220, 1, 1]} />
        <meshStandardMaterial color="#9b4a2c" roughness={1} />
      </mesh>
      {[-42, -18, 16, 44].map((x, i) => (
        <mesh key={x} position={[x, 3.4 + i, -46 - i * 6]}>
          <coneGeometry args={[16 + i * 3, 10 + i * 3, 6]} />
          <meshStandardMaterial color="#7d3a22" roughness={1} />
        </mesh>
      ))}
      {rocks.map((rock, i) => (
        <mesh key={i} position={[rock.p[0], rock.s * 0.4, rock.p[2]]} castShadow>
          <dodecahedronGeometry args={[rock.s, 0]} />
          <meshStandardMaterial color={i % 3 ? "#8b4428" : "#6f3620"} roughness={1} />
        </mesh>
      ))}
      {withZones &&
        LANDING_ZONES.map((zone) => (
          <group key={zone.id} position={[zone.x, 0.02, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[3.4, 4.4, 40]} />
              <meshBasicMaterial color={zone.color} transparent opacity={selected === zone.id ? 0.95 : 0.4} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[3.4, 32]} />
              <meshBasicMaterial color={zone.color} transparent opacity={selected === zone.id ? 0.22 : 0.08} />
            </mesh>
            <SignLabel text={zone.name} position={[0, 2.6, 0]} scale={1.1} />
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 2.4, 8]} />
              <meshBasicMaterial color={zone.color} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

function DustCloud({ intensity }: { intensity: number }) {
  const group = useRef<any>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child: any, i: number) => {
      const p = (t * 0.5 + i * 0.13) % 1;
      const r = 2 + p * 7 * intensity;
      child.position.set(Math.cos(i * 2.1) * r, 0.2 + p * 1.6, Math.sin(i * 2.1) * r);
      child.scale.setScalar(0.7 + p * 2.2);
      child.material.opacity = Math.max(0, 0.34 * (1 - p) * intensity);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#c07a4d" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- Descent gameplay ---------------- */

type Telemetry = { altitude: number; speed: number; fuel: number; x: number; assist: boolean; zone: string | null };

function Descent({ mission, actions, onTelemetry, playSound }: any) {
  const craft = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const state = useRef({ altitude: 110, vel: 5, x: -3.4, xv: 0, fuel: 100, assist: false, done: false });
  const emit = useRef(0);
  const zoneRef = useRef<string | null>(null);

  useEffect(() => {
    state.current = { altitude: 110, vel: 5, x: -3.4, xv: 0, fuel: 100, assist: false, done: false };
  }, [mission.landingAttempts]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = state.current;
    if (s.done) return;

    const wantThrust = keys.up || touchMove.forward;
    const easeOff = keys.down || touchMove.backward;
    const left = keys.left || touchMove.left;
    const right = keys.right || touchMove.right;

    // Forgiving flight model: gravity is gentle, thrust is strong, fuel is generous.
    let thrust = 0;
    if (wantThrust && s.fuel > 0) thrust = 1;
    if (easeOff) thrust = 0;

    // Auto-assist so beginners never crash outright.
    s.assist = false;
    if (s.altitude < 34 && s.vel > 6.5) {
      thrust = 1;
      s.assist = true;
    }

    s.vel += (2.4 - thrust * 5.2) * delta;
    s.vel = MathUtils.clamp(s.vel, -6, 16);
    if (thrust > 0) s.fuel = Math.max(0, s.fuel - delta * 5.5);
    s.altitude = Math.max(0, s.altitude - s.vel * delta * 3.2);

    if (left) s.xv -= delta * 5;
    if (right) s.xv += delta * 5;
    s.xv *= Math.exp(-1.6 * delta);
    s.x = MathUtils.clamp(s.x + s.xv * delta * 3.4, -20, 20);

    const zone = LANDING_ZONES.find((z) => Math.abs(z.x - s.x) < 4.4) ?? null;
    if ((zone?.id ?? null) !== zoneRef.current) {
      zoneRef.current = zone?.id ?? null;
      if (zone) actions.selectZone(zone.id);
    }

    if (craft.current) {
      craft.current.position.set(s.x, s.altitude * 0.32 + 1.6, 0);
      craft.current.rotation.z = MathUtils.lerp(craft.current.rotation.z, -s.xv * 0.05, 0.1);
    }
    const camTarget = new Vector3(s.x + 8, s.altitude * 0.32 + 7, 17);
    camera.position.lerp(camTarget, delta * 2.4);
    camera.lookAt(s.x, s.altitude * 0.32 + 1.6, 0);

    emit.current += delta;
    if (emit.current > 0.12) {
      emit.current = 0;
      onTelemetry({ altitude: s.altitude, speed: s.vel * 3.2, fuel: s.fuel, x: s.x, assist: s.assist, zone: zoneRef.current });
    }

    if (s.altitude <= 0.05) {
      s.done = true;
      const speed = s.vel * 3.2;
      const onZone = Boolean(zoneRef.current);
      const quality = speed < 14 && onZone ? "perfect" : speed < 26 ? "assisted" : "hard";
      playSound("touchdown");
      actions.land(quality);
    }
  });

  const thrusting = keys.up || touchMove.forward || state.current.assist;

  return (
    <group ref={craft}>
      <group scale={0.55}>
        <Rocket legsDeployed />
      </group>
      {thrusting && (
        <group position={[0, -0.3, 0]}>
          <mesh><coneGeometry args={[0.45, 2.4, 16]} /><meshBasicMaterial color="#ffb23f" transparent opacity={0.8} /></mesh>
          <pointLight color="#ff8a3d" intensity={60} distance={12} />
        </group>
      )}
    </group>
  );
}

/* ---------------- Landing cinematic + exit ---------------- */

function LandedScene({ mission, walker }: any) {
  const camera = useThree((s) => s.camera);
  const step = mission.exitStep;
  useFrame((_, delta) => {
    const target =
      step < 3 ? new Vector3(9, 5.5, 13) : step < 5 ? new Vector3(6, 3.4, 9) : new Vector3(4.5, 3, 11);
    camera.position.lerp(target, delta * 0.9);
    camera.lookAt(walker?.current ? walker.current.position.x : 0, 2.4, walker?.current ? walker.current.position.z : 0);
  });
  return null;
}

function ExitWalker({ mission, rigRef }: any) {
  useFrame((_, delta) => {
    if (!rigRef.current) return;
    const step = mission.exitStep;
    const target = step >= 5 ? new Vector3(4.2, 0, 6.4) : step >= 4 ? new Vector3(2.2, 0, 3.4) : new Vector3(1.1, 0, 1.6);
    rigRef.current.position.lerp(target, delta * 0.8);
    rigRef.current.rotation.y = MathUtils.lerp(rigRef.current.rotation.y, 0.7, delta * 2);
    rigRef.current.visible = step >= 3;
  });
  return <Astronaut rigRef={rigRef} suited walking={mission.exitStep >= 3} />;
}

/* ---------------- Mars surface walk ---------------- */

const SAMPLE_POINT = new Vector3(11, 0, -7);

function SurfaceWalk({ mission, actions, playSound }: any) {
  const rig = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const dir = useRef(new Vector3());
  const stepTimer = useRef(0);

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
      rig.current.position.addScaledVector(dir.current, delta * 4);
      rig.current.rotation.y = MathUtils.lerp(rig.current.rotation.y, Math.atan2(dir.current.x, dir.current.z), 0.25);
      stepTimer.current += delta;
      if (stepTimer.current > 0.42) {
        stepTimer.current = 0;
        playSound("footstep");
      }
    }
    rig.current.position.x = MathUtils.clamp(rig.current.position.x, -24, 24);
    rig.current.position.z = MathUtils.clamp(rig.current.position.z, -24, 24);
    camera.position.lerp(new Vector3(rig.current.position.x + 1.2, 4.6, rig.current.position.z + 8.5), delta * 3);
    camera.lookAt(rig.current.position.x, 1.5, rig.current.position.z);

    if (!mission.walkObjectiveDone && rig.current.position.distanceTo(SAMPLE_POINT) < 2.6) {
      playSound("confirmed");
      actions.completeWalkObjective();
    }
  });

  return (
    <>
      <Astronaut rigRef={rig} suited walking />
      {!mission.walkObjectiveDone && (
        <group position={SAMPLE_POINT.toArray() as [number, number, number]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 2, 32]} />
            <meshBasicMaterial color="#7aedde" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
            <meshBasicMaterial color="#7aedde" />
          </mesh>
          <SignLabel text="SAMPLE SITE" position={[0, 2.6, 0]} scale={0.9} />
        </group>
      )}
    </>
  );
}

/* ---------------- Level shell ---------------- */

const GUIDE = [
  { min: 70, title: "Step 1 — control your descent", text: "Hold W (or ▲) to fire the engine and slow down." },
  { min: 40, title: "Step 2 — align your spacecraft", text: "Use A / D to drift over a glowing landing zone." },
  { min: 12, title: "Step 3 — control your thrust", text: "Keep speed under 15 m/s as the surface gets close." },
  { min: 0, title: "Step 4 — land", text: "Hold steady. Guidance assist helps if you come in fast." },
];

export function Level3({ mission, actions, soundOn, onToggleSound, playSound }: any) {
  useLandingKeys();
  const [tel, setTel] = useState<Telemetry>({ altitude: 110, speed: 16, fuel: 100, x: -3.4, assist: false, zone: null });
  const walker = useRef<any>(null);

  /* Landing cinematic timeline */
  useEffect(() => {
    if (mission.phase !== "landing") return;
    const timers = [1, 2, 3, 4, 5].map((step) => window.setTimeout(() => actions.setExitStep(step), step * 1400));
    const done = window.setTimeout(() => actions.startMarsWalk(), 8200);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(done);
    };
  }, [mission.phase, actions]);

  useEffect(() => {
    if (mission.phase === "landing" && mission.exitStep === 3) playSound("hatch");
  }, [mission.phase, mission.exitStep, playSound]);

  const guide = GUIDE.find((g) => tel.altitude >= g.min) ?? GUIDE[GUIDE.length - 1];
  const zone = LANDING_ZONES.find((z) => z.id === (tel.zone ?? mission.selectedZone));
  const descending = mission.phase === "level3";

  return (
    <main className="game-shell">
      <Canvas shadows dpr={[1, 1.6]} camera={{ position: [10, 40, 20], fov: 52, far: 800 }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#e9b58a"]} />
          <fog attach="fog" args={["#d59a70", 40, 190]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[-24, 30, 14]} color="#ffd9b0" intensity={2.6} castShadow />
          <Stars radius={200} depth={60} count={700} factor={5} fade speed={0.2} />
          <MarsGround selected={tel.zone ?? mission.selectedZone} withZones={descending} />

          {descending && <Descent mission={mission} actions={actions} onTelemetry={setTel} playSound={playSound} />}

          {!descending && (
            <group position={[zone ? zone.x : 0, 0, 0]}>
              <group scale={0.55} position={[0, 1.2, 0]}>
                <Rocket legsDeployed />
              </group>
              <DustCloud intensity={mission.phase === "landing" && mission.exitStep < 2 ? 1 : 0.15} />
              {mission.exitStep >= 3 && (
                <mesh position={[1.2, 0.7, 1.2]} rotation={[0, 0.7, 0.5]}>
                  <boxGeometry args={[0.9, 0.08, 3]} />
                  <meshStandardMaterial color="#8d999b" metalness={0.6} />
                </mesh>
              )}
            </group>
          )}

          {mission.phase === "landing" && (
            <>
              <ExitWalker mission={mission} rigRef={walker} />
              <LandedScene mission={mission} walker={walker} />
            </>
          )}

          {(mission.phase === "marswalk" || mission.phase === "level3complete") && (
            <SurfaceWalk mission={mission} actions={actions} playSound={playSound} />
          )}
          <Preload all />
        </Suspense>
      </Canvas>

      <div className="game-hud">
        <header className="hud-top">
          <div className="hud-brand"><i /><span>MYSHA IN THE MARS<small>Level 3 · Mars Landing</small></span></div>
          <div className="phase-label">
            <span>{descending ? "Powered descent" : mission.phase === "landing" ? "Touchdown sequence" : "Surface walk"}</span>
            <i /><b>{zone ? zone.name : "Choose a landing zone"}</b>
          </div>
          <Button variant="ghost" className="hud-sound" onClick={onToggleSound}>Audio {soundOn ? "On" : "Off"}</Button>
        </header>

        {descending && (
          <>
            <div className="landing-gauges">
              <div className={`gauge ${tel.speed > 26 ? "is-danger" : tel.speed > 15 ? "is-warn" : "is-good"}`}>
                <span>Speed</span><b>{Math.round(tel.speed)} m/s</b>
              </div>
              <div className="gauge"><span>Altitude</span><b>{Math.round(tel.altitude)} m</b></div>
              <div className={`gauge ${tel.fuel < 25 ? "is-warn" : ""}`}><span>Fuel</span><b>{Math.round(tel.fuel)}%</b></div>
              <div className="gauge"><span>Angle</span><b>{Math.abs(Math.round(tel.x * 0.6))}°</b></div>
              <div className={`gauge ${tel.zone ? "is-good" : "is-warn"}`}><span>Zone</span><b>{zone ? zone.name.split(" ")[0] : "None"}</b></div>
              <div className="gauge"><span>Systems</span><b>{Math.round(mission.systemHealth)}</b></div>
            </div>

            <div className="step-banner">
              <span>{tel.assist ? "Guidance assist engaged" : "Guided landing"}</span>
              <strong>{guide.title}</strong>
              <p>{guide.text}{zone ? ` · ${zone.name}: ${zone.note}` : " · Drift left or right onto a marked zone."}</p>
            </div>

            <TouchPad interactLabel="THRUST" />
          </>
        )}

        {mission.phase === "landing" && (
          <div className="cinematic-caption">
            <span>Touchdown · step {Math.min(mission.exitStep + 1, 6)} of 6</span>
            <strong>
              {["Legs contact", "Dust settling", "Engines shut down", "Hatch opening", "Ramp extended", "Mysha steps onto Mars"][Math.min(mission.exitStep, 5)]}
            </strong>
            <p>PROTOCOL B-612 is stable on the surface.</p>
            <div className="cinematic-progress"><i style={{ width: `${(mission.exitStep + 1) * 16.6}%` }} /></div>
          </div>
        )}

        {mission.phase === "marswalk" && (
          <>
            <div className="objective-strip">
              <span>Surface objective</span>
              <b>{mission.walkObjectiveDone ? "Sample collected — return signal sent" : "Walk to the marked sample site"}</b>
            </div>
            <TouchPad />
            {mission.walkObjectiveDone && (
              <div className="action-bar">
                <Button onClick={actions.completeLevelThree}>Complete Level 3</Button>
              </div>
            )}
          </>
        )}
      </div>

      {mission.phase === "level3complete" && (
        <div className="level-transition">
          <span>Level 3 complete</span>
          <strong>Mars landing successful</strong>
          <p>Mission phase 04 — Mars outpost survival. PROTOCOL B-612 stays beside the base as your shelter of last resort.</p>
          <div className="transition-stats">
            <span>Landing <b>{mission.landingQuality || "assisted"}</b></span>
            <span>Zone <b>{zone?.name ?? "Safe Ridge"}</b></span>
            <span>Water <b>{Math.round(mission.water)}</b></span>
            <span>Power <b>{Math.round(mission.power)}</b></span>
          </div>
          <Button onClick={actions.enterLevelFour}>Continue to Level 4</Button>
        </div>
      )}

      {mission.phase === "landing" && mission.landingQuality === "hard" && mission.exitStep === 0 && (
        <div className="notice-toast">HARD LANDING · SYSTEM HEALTH REDUCED</div>
      )}
    </main>
  );
}
