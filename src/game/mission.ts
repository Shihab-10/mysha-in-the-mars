import { useCallback, useMemo, useReducer } from "react";
import { EQUIPMENT, LEAK_STEPS, LANDING_ZONES, SOL_CHECKPOINTS, PLOT_POSITIONS } from "./data";

export type Plot = { stage: number; water: number; stressed: boolean };

export type MissionState = ReturnType<typeof makeInitial>;

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

function makeInitial() {
  return {
    currentLevel: 1,
    phase: "start" as string,

    /* Level 1 (preserved) */
    collectedEquipment: [] as string[],
    currentEquipmentIndex: 0,
    equipmentCount: 0,
    allEquipmentCollected: false,
    canBoardRocket: false,
    astronautBoarding: false,
    astronautBoarded: false,
    astronautSeated: false,
    spacecraftSystemsReady: false,
    launchReady: false,
    launchConfirmed: false,
    countdownActive: false,
    countdown: 10,
    rocketLaunched: false,
    journeyStarted: false,
    interactionLocked: false,
    collectingId: null as string | null,
    boardingStep: 0,
    launchPanelDismissed: false,

    /* Persistent resources */
    oxygen: 100,
    water: 78,
    power: 86,
    food: 64,
    systemHealth: 100,
    crewHealth: 100,
    radiation: 12,

    /* Level 2 */
    journeyProgress: 0,
    leakActive: false,
    leakStep: 0,
    leakResolved: false,
    lifeSupportPowered: false,
    emergencyOxygen: false,

    /* Level 3 */
    selectedZone: null as string | null,
    landingQuality: "" as string,
    landingAttempts: 0,
    exitStep: 0,
    walkObjectiveDone: false,

    /* Level 4 */
    sol: 1,
    interior: false,
    plots: PLOT_POSITIONS.map(() => ({ stage: 0, water: 0, stressed: false })) as Plot[],
    panelDust: 42,
    recyclerHealth: 64,
    shelterActive: false,
    powerPriority: "life-support" as string,
    foodCollected: 0,
    harvested: 0,
    objectives: [] as string[],
    activeEvent: null as null | { id: string; title: string; text: string; task: string },
    eventsSeen: [] as string[],
    log: [] as string[],
  };
}

export const initialMission = makeInitial();

const withLog = (state: MissionState, message: string): MissionState => ({
  ...state,
  log: [message, ...state.log].slice(0, 24),
});

const EVENTS = [
  { sol: 12, id: "dust", title: "Solar dust event", text: "Dust is settling on the solar array.", task: "Clean the solar panels." },
  { sol: 26, id: "filter", title: "Water filter warning", text: "The recycler filter is losing efficiency.", task: "Maintain the water recycling unit." },
  { sol: 40, id: "radiation", title: "Radiation spike", text: "Solar particle event detected outside.", task: "Use the radiation shelter inside the habitat." },
  { sol: 52, id: "power", title: "Power shortage", text: "Battery reserve is dropping overnight.", task: "Set power priority at the console." },
];

export function missionReducer(state: MissionState, action: any): MissionState {
  switch (action.type) {
    /* ----- Level 1 (unchanged behaviour) ----- */
    case "START":
      return { ...state, phase: "preparation" };
    case "BEGIN_COLLECTION":
      if (state.interactionLocked || state.collectedEquipment.includes(action.id)) return state;
      if (EQUIPMENT[state.currentEquipmentIndex]?.id !== action.id) return state;
      return { ...state, interactionLocked: true, collectingId: action.id };
    case "FINISH_COLLECTION": {
      if (state.collectingId !== action.id) return state;
      const collectedEquipment = [...state.collectedEquipment, action.id];
      const count = collectedEquipment.length;
      const complete = count === EQUIPMENT.length;
      return {
        ...state,
        collectedEquipment,
        equipmentCount: count,
        currentEquipmentIndex: Math.min(count, EQUIPMENT.length - 1),
        allEquipmentCollected: complete,
        canBoardRocket: complete,
        interactionLocked: false,
        collectingId: null,
      };
    }
    case "BEGIN_BOARDING":
      if (!state.canBoardRocket || state.astronautBoarding) return state;
      return { ...state, phase: "boarding", astronautBoarding: true, interactionLocked: true, boardingStep: 0 };
    case "BOARDING_STEP":
      return state.phase === "boarding" ? { ...state, boardingStep: action.step } : state;
    case "ENTER_COCKPIT":
      if (state.phase !== "boarding") return state;
      return {
        ...state,
        phase: "cockpit",
        astronautBoarding: false,
        astronautBoarded: true,
        astronautSeated: true,
        spacecraftSystemsReady: true,
        launchReady: true,
        interactionLocked: false,
        boardingStep: 3,
      };
    case "DISMISS_LAUNCH":
      return { ...state, launchPanelDismissed: true };
    case "REOPEN_LAUNCH":
      return { ...state, launchPanelDismissed: false };
    case "CONFIRM_LAUNCH":
      if (!state.launchReady || state.launchConfirmed) return state;
      return { ...state, phase: "countdown", launchConfirmed: true, countdownActive: true, interactionLocked: true, countdown: 10 };
    case "TICK":
      return state.phase === "countdown" ? { ...state, countdown: Math.max(0, state.countdown - 1) } : state;
    case "IGNITE":
      return state.phase === "countdown" && state.countdown === 0 ? { ...state, phase: "ignition", countdownActive: false } : state;
    case "LIFTOFF":
      return state.phase === "ignition" ? { ...state, phase: "liftoff", rocketLaunched: true } : state;
    case "ASCENT":
      return state.phase === "liftoff" ? { ...state, phase: "ascent" } : state;
    case "SPACE":
      return state.phase === "ascent" ? { ...state, phase: "space" } : state;
    case "JOURNEY":
      return ["countdown", "ignition", "liftoff", "ascent", "space"].includes(state.phase)
        ? { ...state, phase: "journey", journeyStarted: true, rocketLaunched: true, countdownActive: false, interactionLocked: false }
        : state;
    case "LEVEL_TWO":
      return { ...state, phase: "level2", currentLevel: 2, journeyProgress: 0 };

    /* ----- Level 2 ----- */
    case "JOURNEY_PROGRESS": {
      if (state.phase !== "level2") return state;
      const progress = Math.min(100, state.journeyProgress + action.delta);
      const draining = state.leakActive && !state.leakResolved;
      return {
        ...state,
        journeyProgress: progress,
        oxygen: clamp(state.oxygen - (draining ? action.delta * 0.55 : 0)),
        power: clamp(state.power - action.delta * 0.05),
        crewHealth: clamp(state.crewHealth - (state.oxygen < 30 ? action.delta * 0.08 : 0)),
      };
    }
    case "TRIGGER_LEAK":
      if (state.leakActive || state.leakResolved) return state;
      return withLog({ ...state, leakActive: true, leakStep: 0 }, "SOL 0 · Oxygen system anomaly detected");
    case "LEAK_ACTION": {
      if (!state.leakActive || state.leakResolved) return state;
      const step = LEAK_STEPS[state.leakStep];
      if (!step || step.id !== action.id) return state;
      const next = state.leakStep + 1;
      const resolved = next >= LEAK_STEPS.length;
      let s: MissionState = { ...state, leakStep: next };
      if (step.id === "emergency") s = { ...s, emergencyOxygen: true, oxygen: clamp(s.oxygen + 22) };
      if (step.id === "power") s = { ...s, lifeSupportPowered: true, power: clamp(s.power - 8), oxygen: clamp(s.oxygen + 10) };
      if (resolved) {
        s = { ...s, leakResolved: true, leakActive: false, oxygen: clamp(s.oxygen + 25), systemHealth: clamp(s.systemHealth - 6) };
      }
      return withLog(s, `Level 2 · ${step.label} complete`);
    }
    case "LEVEL_TWO_COMPLETE":
      return state.phase === "level2" ? { ...state, phase: "level2complete" } : state;
    case "LEVEL_THREE":
      return { ...state, phase: "level3", currentLevel: 3, selectedZone: null, landingQuality: "" };

    /* ----- Level 3 ----- */
    case "SELECT_ZONE":
      return { ...state, selectedZone: action.id };
    case "LANDED": {
      const zone = LANDING_ZONES.find((z) => z.id === state.selectedZone) ?? LANDING_ZONES[0]!;
      return withLog(
        {
          ...state,
          phase: "landing",
          landingQuality: action.quality,
          exitStep: 0,
          water: clamp(state.water + zone.water),
          power: clamp(state.power + zone.power),
          systemHealth: clamp(state.systemHealth - (action.quality === "hard" ? 12 : 3)),
        },
        `Level 3 · ${action.quality === "perfect" ? "Textbook" : action.quality === "assisted" ? "Assisted" : "Hard"} landing at ${zone.name}`,
      );
    }
    case "RETRY_LANDING":
      return { ...state, phase: "level3", landingAttempts: state.landingAttempts + 1, landingQuality: "" };
    case "EXIT_STEP":
      return { ...state, exitStep: action.step };
    case "MARS_WALK":
      return { ...state, phase: "marswalk" };
    case "WALK_OBJECTIVE":
      return state.walkObjectiveDone ? state : withLog({ ...state, walkObjectiveDone: true }, "Level 3 · First steps on Mars recorded");
    case "LEVEL_THREE_COMPLETE":
      return { ...state, phase: "level3complete" };
    case "LEVEL_FOUR":
      return { ...state, phase: "level4", currentLevel: 4, sol: 1, interior: false };

    /* ----- Level 4 ----- */
    case "SET_INTERIOR":
      return { ...state, interior: action.value, shelterActive: action.value ? state.shelterActive : false };
    case "ADVANCE_SOL": {
      const sol = state.sol + 1;
      const lightPower = state.plots.some((p) => p.stage > 0 && p.stage < 4) ? 1.6 : 0;
      const solar = Math.max(0.15, 1 - state.panelDust / 130) * 3.2;
      const recycle = (state.recyclerHealth / 100) * 2.1;
      const shelterDrain = state.shelterActive ? 1.4 : 0;

      const power = clamp(state.power + solar - 2.3 - lightPower - shelterDrain);
      const water = clamp(state.water + recycle - 1.6 - lightPower * 0.6);
      const oxygen = clamp(state.oxygen + (power > 30 ? 1.8 : -1.4) - 1.1);
      const food = clamp(state.food - 1.1);
      const radiation = clamp(state.radiation + (state.shelterActive ? -6 : 1.4));
      const crewHealth = clamp(
        state.crewHealth +
          (oxygen > 35 && food > 15 && water > 15 && radiation < 60 ? 0.6 : -2.2),
      );

      const plots = state.plots.map((plot) => {
        if (plot.stage === 0 || plot.stage === 4) return plot;
        const ok = water > 12 && power > 18;
        if (!ok) return { ...plot, stressed: true };
        return { ...plot, stressed: false, stage: Math.min(4, plot.stage + 1) };
      });

      const dueEvent = EVENTS.find((e) => e.sol <= sol && !state.eventsSeen.includes(e.id));
      const next: MissionState = {
        ...state,
        sol,
        power,
        water,
        oxygen,
        food,
        radiation,
        crewHealth,
        plots,
        panelDust: clamp(state.panelDust + 0.8),
        recyclerHealth: clamp(state.recyclerHealth - 0.5),
      };
      if (dueEvent && !state.activeEvent) {
        return withLog(
          { ...next, activeEvent: dueEvent, eventsSeen: [...state.eventsSeen, dueEvent.id] },
          `SOL ${sol} · ${dueEvent.title}`,
        );
      }
      return next;
    }
    case "PLANT": {
      if (state.plots[action.index]?.stage !== 0) return state;
      if (state.water < 8 || state.power < 8) return state;
      const plots = state.plots.map((p, i) => (i === action.index ? { stage: 1, water: 1, stressed: false } : p));
      return withLog(
        { ...state, plots, water: clamp(state.water - 6), power: clamp(state.power - 4) },
        `SOL ${state.sol} · Potatoes planted in plot ${action.index + 1}`,
      );
    }
    case "HARVEST": {
      if (state.plots[action.index]?.stage !== 4) return state;
      const plots = state.plots.map((p, i) => (i === action.index ? { stage: 0, water: 0, stressed: false } : p));
      return withLog(
        {
          ...state,
          plots,
          food: clamp(state.food + 18),
          harvested: state.harvested + 1,
          objectives: state.objectives.includes("food") ? state.objectives : [...state.objectives, "food"],
          activeEvent: state.activeEvent?.id === "food" ? null : state.activeEvent,
        },
        `SOL ${state.sol} · Potato harvest: +18 food`,
      );
    }
    case "COLLECT_FOOD":
      return withLog(
        { ...state, food: clamp(state.food + 9), foodCollected: state.foodCollected + 1 },
        `SOL ${state.sol} · Ration crate recovered from storage`,
      );
    case "MAINTAIN_WATER":
      return withLog(
        {
          ...state,
          recyclerHealth: clamp(state.recyclerHealth + 26),
          water: clamp(state.water + 9),
          power: clamp(state.power - 4),
          objectives: state.objectives.includes("water") ? state.objectives : [...state.objectives, "water"],
          activeEvent: state.activeEvent?.id === "filter" ? null : state.activeEvent,
        },
        `SOL ${state.sol} · Water recycler serviced`,
      );
    case "CLEAN_SOLAR":
      return withLog(
        {
          ...state,
          panelDust: clamp(state.panelDust - 34),
          power: clamp(state.power + 7),
          objectives: state.objectives.includes("solar") ? state.objectives : [...state.objectives, "solar"],
          activeEvent: state.activeEvent?.id === "dust" ? null : state.activeEvent,
        },
        `SOL ${state.sol} · Solar array cleaned`,
      );
    case "SET_PRIORITY": {
      const gain =
        action.value === "life-support"
          ? { oxygen: 8, water: 0, food: 0 }
          : action.value === "greenhouse"
            ? { oxygen: 0, water: -2, food: 6 }
            : action.value === "water"
              ? { oxygen: 0, water: 8, food: 0 }
              : { oxygen: 2, water: 2, food: 2 };
      return withLog(
        {
          ...state,
          powerPriority: action.value,
          oxygen: clamp(state.oxygen + gain.oxygen),
          water: clamp(state.water + gain.water),
          food: clamp(state.food + gain.food),
          power: clamp(state.power - 3),
          objectives: state.objectives.includes("inspection") ? state.objectives : [...state.objectives, "inspection"],
          activeEvent: state.activeEvent?.id === "power" ? null : state.activeEvent,
        },
        `SOL ${state.sol} · Power priority: ${action.value}`,
      );
    }
    case "TOGGLE_SHELTER":
      return withLog(
        {
          ...state,
          shelterActive: !state.shelterActive,
          radiation: !state.shelterActive ? clamp(state.radiation - 18) : state.radiation,
          power: clamp(state.power - (!state.shelterActive ? 3 : 0)),
          activeEvent: state.activeEvent?.id === "radiation" && !state.shelterActive ? null : state.activeEvent,
        },
        `SOL ${state.sol} · Radiation shelter ${state.shelterActive ? "released" : "engaged"}`,
      );
    case "DISMISS_EVENT":
      return { ...state, activeEvent: null };
    case "FINISH_MISSION":
      return withLog({ ...state, phase: "report" }, "Mars outpost operational — mission complete");
    case "RESET":
      return makeInitial();
    default:
      return state;
  }
}

export function useMission() {
  const [mission, dispatch] = useReducer(missionReducer, initialMission);
  const send = useCallback((type: string, payload: any = {}) => dispatch({ type, ...payload }), []);
  const actions = useMemo(
    () => ({
      startMission: () => send("START"),
      beginCollection: (id: string) => send("BEGIN_COLLECTION", { id }),
      finishCollection: (id: string) => send("FINISH_COLLECTION", { id }),
      beginBoarding: () => send("BEGIN_BOARDING"),
      setBoardingStep: (step: number) => send("BOARDING_STEP", { step }),
      enterCockpit: () => send("ENTER_COCKPIT"),
      dismissLaunchPanel: () => send("DISMISS_LAUNCH"),
      reopenLaunchPanel: () => send("REOPEN_LAUNCH"),
      confirmLaunch: () => send("CONFIRM_LAUNCH"),
      tickCountdown: () => send("TICK"),
      ignite: () => send("IGNITE"),
      liftoff: () => send("LIFTOFF"),
      beginAscent: () => send("ASCENT"),
      reachSpace: () => send("SPACE"),
      beginJourney: () => send("JOURNEY"),
      enterLevelTwo: () => send("LEVEL_TWO"),
      journeyProgress: (delta: number) => send("JOURNEY_PROGRESS", { delta }),
      triggerLeak: () => send("TRIGGER_LEAK"),
      leakAction: (id: string) => send("LEAK_ACTION", { id }),
      completeLevelTwo: () => send("LEVEL_TWO_COMPLETE"),
      enterLevelThree: () => send("LEVEL_THREE"),
      selectZone: (id: string) => send("SELECT_ZONE", { id }),
      land: (quality: string) => send("LANDED", { quality }),
      retryLanding: () => send("RETRY_LANDING"),
      setExitStep: (step: number) => send("EXIT_STEP", { step }),
      startMarsWalk: () => send("MARS_WALK"),
      completeWalkObjective: () => send("WALK_OBJECTIVE"),
      completeLevelThree: () => send("LEVEL_THREE_COMPLETE"),
      enterLevelFour: () => send("LEVEL_FOUR"),
      setInterior: (value: boolean) => send("SET_INTERIOR", { value }),
      advanceSol: () => send("ADVANCE_SOL"),
      plant: (index: number) => send("PLANT", { index }),
      harvest: (index: number) => send("HARVEST", { index }),
      collectFood: () => send("COLLECT_FOOD"),
      maintainWater: () => send("MAINTAIN_WATER"),
      cleanSolar: () => send("CLEAN_SOLAR"),
      setPriority: (value: string) => send("SET_PRIORITY", { value }),
      toggleShelter: () => send("TOGGLE_SHELTER"),
      dismissEvent: () => send("DISMISS_EVENT"),
      finishMission: () => send("FINISH_MISSION"),
      reset: () => send("RESET"),
    }),
    [send],
  );
  return { mission, actions };
}

export function checkpointStatus(mission: MissionState) {
  return SOL_CHECKPOINTS.map((cp) => ({
    ...cp,
    due: mission.sol >= cp.sol,
    done: mission.objectives.includes(cp.id),
  }));
}
