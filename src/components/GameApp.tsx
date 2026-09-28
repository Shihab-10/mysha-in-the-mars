import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, KeyboardControls, Preload } from "@react-three/drei";

import { AudioManager } from "../game/audio";
import { EQUIPMENT } from "../game/data";
import { keyboardMap, resetTouchMove } from "../game/input";
import { useMission } from "../game/mission";

import { IntroCinematic, StartScreen } from "./StartScreen";
import { GameWorld } from "./GameWorld";
import { GameHud } from "./GameHud";
import { Level2 } from "./Level2";
import { Level3 } from "./Level3";
import { Level4 } from "./Level4";
import { MissionReport } from "./MissionReport";
import { Button } from "./UI";

export default function GameApp() {
  const { mission, actions } = useMission();

  const [intro, setIntro] = useState(true);
  const [nearby, setNearby] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [tutorial, setTutorial] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  const audio = useRef(new AudioManager());
  const lastInteract = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  const playSound = useCallback((name: string) => audio.current.play(name, soundOn), [soundOn]);

  const currentEquipment = EQUIPMENT[mission.currentEquipmentIndex] ?? null;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2400);
  }, []);

  const interact = useCallback(() => {
    if (mission.interactionLocked) return;
    if (mission.phase === "preparation") {
      if (!nearby) {
        showNotice("MOVE CLOSER TO INTERACT");
        return;
      }
      if (nearby.kind === "rocket") {
        if (!mission.canBoardRocket) {
          showNotice("COLLECT ALL REQUIRED EQUIPMENT BEFORE BOARDING");
          audio.current.play("locked", soundOn);
          return;
        }
        audio.current.play("hatch", soundOn);
        actions.beginBoarding();
        return;
      }
      if (nearby.id !== currentEquipment?.id) {
        showNotice(`COLLECT ${currentEquipment?.name?.toUpperCase() ?? "THE REQUIRED EQUIPMENT"} FIRST`);
        audio.current.play("locked", soundOn);
        return;
      }
      actions.beginCollection(nearby.id);
      audio.current.play(nearby.sound, soundOn);
      window.setTimeout(() => {
        actions.finishCollection(nearby.id);
        showNotice(`${nearby.name?.toUpperCase() ?? "EQUIPMENT"} COLLECTED`);
        audio.current.play("confirmed", soundOn);
      }, 1250);
    } else if (mission.phase === "cockpit" && mission.launchPanelDismissed) {
      actions.reopenLaunchPanel();
    }
  }, [actions, currentEquipment, mission, nearby, showNotice, soundOn]);

  const level1Phase = [
    "preparation", "boarding", "cockpit", "countdown", "ignition", "liftoff", "ascent", "space", "journey",
  ].includes(mission.phase);

  useEffect(() => {
    if (!level1Phase) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyE" && !lastInteract.current) {
        lastInteract.current = true;
        interact();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyE") lastInteract.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [interact, level1Phase]);

  useEffect(() => {
    if (mission.phase !== "boarding") return;
    const timers = [
      window.setTimeout(() => actions.setBoardingStep(1), 1000),
      window.setTimeout(() => actions.setBoardingStep(2), 2200),
      window.setTimeout(() => actions.enterCockpit(), 3600),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [mission.phase, actions]);

  useEffect(() => {
    if (!["countdown", "ignition", "liftoff", "ascent", "space"].includes(mission.phase)) return;
    if (mission.phase === "countdown" && mission.countdown > 0) {
      audio.current.play("countdown", soundOn);
      const timer = window.setTimeout(actions.tickCountdown, 760);
      return () => window.clearTimeout(timer);
    }
    if (mission.phase === "countdown" && mission.countdown === 0) {
      audio.current.play("ignition", soundOn);
      const timer = window.setTimeout(actions.ignite, 500);
      return () => window.clearTimeout(timer);
    }
    if (mission.phase === "ignition") {
      const timer = window.setTimeout(actions.liftoff, 2200);
      return () => window.clearTimeout(timer);
    }
    if (mission.phase === "liftoff") {
      const timer = window.setTimeout(actions.beginAscent, 3000);
      return () => window.clearTimeout(timer);
    }
    if (mission.phase === "ascent") {
      const timer = window.setTimeout(actions.reachSpace, 3600);
      return () => window.clearTimeout(timer);
    }
    if (mission.phase === "space") {
      const timer = window.setTimeout(actions.beginJourney, 3200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [mission.phase, mission.countdown, actions, soundOn]);

  useEffect(() => {
    resetTouchMove();
  }, [mission.phase]);

  /* Optional shortcut for testing/demos: /?level=2|3|4 jumps straight to a level. */
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current) return;
    jumped.current = true;
    const level = new URLSearchParams(window.location.search).get("level");
    if (level === "2") { setIntro(false); actions.enterLevelTwo(); }
    if (level === "3") { setIntro(false); actions.enterLevelThree(); }
    if (level === "4") { setIntro(false); actions.enterLevelFour(); }
  }, [actions]);

  useEffect(() => () => { if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current); }, []);

  const context = useMemo(
    () => ({ nearby, currentEquipment, notice, tutorial, soundOn }),
    [nearby, currentEquipment, notice, tutorial, soundOn],
  );

  const toggleSound = () => setSoundOn((value) => !value);
  const shared = { mission, actions, soundOn, onToggleSound: toggleSound, playSound };

  if (intro) {
    return (
      <div className="mysha-root">
        <IntroCinematic onDone={() => setIntro(false)} />
      </div>
    );
  }

  if (mission.phase === "start") {
    return (
      <div className="mysha-root">
        <StartScreen
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onStart={() => {
            audio.current.unlock();
            audio.current.play("start", soundOn);
            actions.startMission();
          }}
        />
      </div>
    );
  }

  if (mission.phase === "report") {
    return (
      <div className="mysha-root">
        <MissionReport mission={mission} actions={actions} />
      </div>
    );
  }

  if (["level2", "level2complete"].includes(mission.phase)) {
    return <div className="mysha-root"><Level2 {...shared} /></div>;
  }

  if (["level3", "landing", "marswalk", "level3complete"].includes(mission.phase)) {
    return <div className="mysha-root"><Level3 {...shared} /></div>;
  }

  if (mission.phase === "level4") {
    return <div className="mysha-root"><Level4 {...shared} /></div>;
  }

  return (
    <div className="mysha-root">
      <KeyboardControls map={keyboardMap}>
        <main className={`game-shell phase-${mission.phase}`}>
          <Canvas
            shadows
            dpr={[1, 1.65]}
            camera={{ position: [0, 5.3, 9], fov: 48, near: 0.1, far: 500 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
            <Suspense fallback={null}>
              <GameWorld mission={mission} setNearby={setNearby} />
              <AdaptiveDpr pixelated />
              <Preload all />
            </Suspense>
          </Canvas>

          <GameHud
            mission={mission}
            actions={actions}
            context={context}
            onInteract={interact}
            onCloseTutorial={() => setTutorial(false)}
            onToggleSound={toggleSound}
          />

          {mission.phase === "journey" && (
            <div className="level-transition">
              <span>Level 1 complete</span>
              <strong>Mission phase 02 — Space journey</strong>
              <p>Interplanetary transit initiated. Destination Mars · navigation locked · crew secure aboard PROTOCOL B-612.</p>
              <div className="transition-stats">
                <span>Equipment <b>{mission.equipmentCount}/10</b></span>
                <span>Oxygen <b>{Math.round(mission.oxygen)}</b></span>
                <span>Power <b>{Math.round(mission.power)}</b></span>
              </div>
              <Button onClick={actions.enterLevelTwo}>Continue to Level 2</Button>
            </div>
          )}
        </main>
      </KeyboardControls>
    </div>
  );
}
