export const SHIP_NAME = "PROTOCOL B-612";
export const SHIP_SUBTITLE = "MARS TRANSIT VEHICLE";

export type EquipmentItem = {
  id: string;
  name: string;
  short: string;
  icon: string;
  sound: string;
  position: [number, number, number];
  color: string;
};

export const EQUIPMENT: EquipmentItem[] = [
  { id: "inner-suit", name: "Inner Mission Suit", short: "Inner Suit", icon: "IS", sound: "fabric", position: [-8, 0.8, -5], color: "#d6e5e5" },
  { id: "space-suit", name: "Main Spacesuit", short: "Spacesuit", icon: "MS", sound: "suit", position: [-5.3, 1, -5], color: "#e8ede7" },
  { id: "helmet", name: "Helmet", short: "Helmet", icon: "HM", sound: "helmet", position: [-2.5, 1.15, -5], color: "#b7e5ed" },
  { id: "oxygen-pack", name: "Oxygen Backpack", short: "Oxygen Pack", icon: "O2", sound: "connector", position: [0.5, 0.9, -5], color: "#c8d5d3" },
  { id: "comms", name: "Communication System", short: "Comms", icon: "CM", sound: "radio", position: [4, 1, -5], color: "#63dbc9" },
  { id: "tablet", name: "Mission Tablet", short: "Tablet", icon: "TB", sound: "tablet", position: [7.2, 1.05, -5], color: "#5cb8d1" },
  { id: "emergency-o2", name: "Emergency Oxygen", short: "Emergency O₂", icon: "EO", sound: "connector", position: [8, 0.9, 0], color: "#e7d88b" },
  { id: "medical-kit", name: "Medical Kit", short: "Medical Kit", icon: "MD", sound: "cabinet", position: [5.4, 0.8, 4.2], color: "#e6e9e5" },
  { id: "tools", name: "Mission Tools", short: "Tools", icon: "TL", sound: "tools", position: [2, 0.8, 4.2], color: "#d2b46f" },
  { id: "radiation", name: "Radiation Protection Equipment", short: "Radiation Gear", icon: "RP", sound: "shield", position: [-1.5, 0.9, 4.2], color: "#db9d55" },
];

export const ROCKET_POSITION: [number, number, number] = [-7.4, 0, 4.5];

export const PHASE_LABELS: Record<string, string> = {
  preparation: "Level 1 · Preparation Facility",
  boarding: "Boarding Sequence",
  cockpit: "B-612 Cockpit",
  countdown: "Launch Sequence",
  ignition: "Engine Ignition",
  liftoff: "Liftoff",
  ascent: "Atmospheric Ascent",
  space: "Orbital Transition",
  journey: "Level 1 Complete",
  level2: "Level 2 · Space Journey",
  level2complete: "Level 2 Complete",
  level3: "Level 3 · Mars Landing",
  landing: "Landing Cinematic",
  marswalk: "Mars Surface Walk",
  level3complete: "Level 3 Complete",
  level4: "Level 4 · Outpost Survival",
  report: "Mission Debrief",
};

/* ---------- Level 2 repair procedure ---------- */

export type RepairStep = {
  id: string;
  label: string;
  hint: string;
  action: string;
  station: [number, number, number];
};

export const LEAK_STEPS: RepairStep[] = [
  {
    id: "inspect",
    label: "Inspect the oxygen system",
    hint: "Find where the pressure is dropping.",
    action: "Inspect O₂ module",
    station: [-2.1, 0, -1.2],
  },
  {
    id: "emergency",
    label: "Activate emergency oxygen",
    hint: "Emergency tanks keep the cabin breathable while you work.",
    action: "Open emergency valve",
    station: [2.1, 0, -1.2],
  },
  {
    id: "power",
    label: "Route power to life support",
    hint: "Life support needs power to rebuild cabin pressure.",
    action: "Route power",
    station: [0, 0, -2.3],
  },
  {
    id: "repair",
    label: "Repair the leaking component",
    hint: "Seal the fractured oxygen line with your tools.",
    action: "Seal the O₂ line",
    station: [-2.1, 0, -1.2],
  },
];

/* ---------- Level 3 landing zones ---------- */

export type LandingZone = {
  id: string;
  name: string;
  x: number;
  color: string;
  note: string;
  water: number;
  power: number;
  risk: string;
};

export const LANDING_ZONES: LandingZone[] = [
  { id: "ridge", name: "Safe Ridge", x: -14, color: "#7aedde", note: "Stable ground, steady sunlight.", water: 0, power: 6, risk: "Low risk" },
  { id: "ice", name: "Ice Valley", x: 0, color: "#9fd4ff", note: "Buried water ice, rough terrain.", water: 18, power: 0, risk: "Higher risk" },
  { id: "dust", name: "Dust Basin", x: 14, color: "#e7b85e", note: "Easy approach, dusty and dim.", water: 4, power: -4, risk: "Dust events" },
];

/* ---------- Level 4 outpost ---------- */

export type Station = {
  id: string;
  name: string;
  prompt: string;
  position: [number, number, number];
  interior?: boolean;
};

export const STATIONS: Station[] = [
  { id: "habitat", name: "Habitat Airlock", prompt: "Enter habitat", position: [0, 0, 4] },
  { id: "greenhouse", name: "Greenhouse", prompt: "Open greenhouse", position: [9, 0, 1] },
  { id: "water", name: "Water Recycling Unit", prompt: "Inspect water recycler", position: [-9, 0, 1] },
  { id: "solar", name: "Solar Array", prompt: "Inspect solar panels", position: [-4, 0, -9] },
  { id: "storage", name: "Food Storage", prompt: "Collect food supplies", position: [6, 0, -8] },
  { id: "antenna", name: "Comms Antenna", prompt: "Check comms link", position: [13, 0, -7] },
  { id: "airlock-in", name: "Airlock", prompt: "Exit habitat", position: [0, 0, 5.2], interior: true },
  { id: "console", name: "Power Console", prompt: "Open power console", position: [-3.6, 0, -2.4], interior: true },
  { id: "shelter", name: "Radiation Shelter", prompt: "Enter radiation shelter", position: [3.8, 0, -2.4], interior: true },
  { id: "computer", name: "Mission Computer", prompt: "Read mission computer", position: [0, 0, -4.2], interior: true },
];

export const SOL_CHECKPOINTS = [
  { sol: 15, id: "inspection", title: "System inspection", task: "Inspect the power console inside the habitat." },
  { sol: 30, id: "water", title: "Water recycling check", task: "Maintain the water recycling unit outside." },
  { sol: 45, id: "solar", title: "Solar panel maintenance", task: "Clean the solar array." },
  { sol: 60, id: "food", title: "Food production check", task: "Harvest potatoes in the greenhouse." },
];

export const PLOT_POSITIONS: [number, number, number][] = [
  [-1.6, 0, -0.9],
  [0, 0, -0.9],
  [1.6, 0, -0.9],
  [-0.8, 0, 0.8],
  [0.8, 0, 0.8],
];

export const GROWTH_LABELS = ["EMPTY", "PLANTED", "SPROUTING", "GROWING", "READY TO HARVEST"];
