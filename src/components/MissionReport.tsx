import { checkpointStatus } from "../game/mission";
import { Button } from "./UI";

function grade(value: number) {
  if (value > 75) return "Excellent";
  if (value > 50) return "Stable";
  if (value > 25) return "Strained";
  return "Critical";
}

export function MissionReport({ mission, actions }: any) {
  const checkpoints = checkpointStatus(mission);
  const done = checkpoints.filter((c) => c.done).length;

  const decisions = [
    mission.harvested > 0
      ? `Potato cultivation produced ${mission.harvested} harvest${mission.harvested > 1 ? "s" : ""}, adding food without resupply from Earth.`
      : "No potato harvest was completed, so the outpost lived entirely on stored rations.",
    mission.panelDust < 35
      ? "Regular solar panel cleaning kept power generation high, which protected oxygen production."
      : "Dust was left on the solar array, so power generation stayed below its potential and limited life support.",
    mission.recyclerHealth > 60
      ? "The water recycler was maintained, so water losses stayed low."
      : "The water recycler ran degraded, so more water was lost each sol than recovered.",
    mission.radiation < 40
      ? "Radiation exposure was managed with shelter use during the particle event."
      : "Radiation exposure accumulated; shelter time would have protected crew health.",
    mission.landingQuality === "perfect"
      ? "A controlled landing left the spacecraft systems almost undamaged."
      : mission.landingQuality === "assisted"
        ? "Guidance assist was used during landing; minor system wear was recorded."
        : "A hard landing cost system health that had to be recovered on the surface.",
  ];

  return (
    <div className="report-screen">
      <div className="report-inner">
        <span>Mission debrief · Expedition 01</span>
        <h1>MYSHA IN THE MARS — Mission complete</h1>
        <h2>Mars outpost operational</h2>

        <div className="report-grid">
          <div className="report-cell"><span>Sols survived</span><strong>{mission.sol}</strong><p>Days of continuous outpost operation</p></div>
          <div className="report-cell"><span>Crew health</span><strong>{Math.round(mission.crewHealth)}</strong><p>{grade(mission.crewHealth)}</p></div>
          <div className="report-cell"><span>Oxygen stability</span><strong>{Math.round(mission.oxygen)}</strong><p>{grade(mission.oxygen)}</p></div>
          <div className="report-cell"><span>Water efficiency</span><strong>{Math.round(mission.recyclerHealth)}</strong><p>Recycler condition</p></div>
          <div className="report-cell"><span>Power management</span><strong>{Math.round(mission.power)}</strong><p>Array dust {Math.round(mission.panelDust)}%</p></div>
          <div className="report-cell"><span>Food production</span><strong>{Math.round(mission.food)}</strong><p>{mission.harvested} potato harvests</p></div>
          <div className="report-cell"><span>Radiation</span><strong>{Math.round(mission.radiation)}</strong><p>{mission.radiation < 40 ? "Within limits" : "Elevated exposure"}</p></div>
          <div className="report-cell"><span>System health</span><strong>{Math.round(mission.systemHealth)}</strong><p>{grade(mission.systemHealth)}</p></div>
        </div>

        <div className="report-section">
          <h3>Checkpoints · {done} of {checkpoints.length} completed</h3>
          <ul>
            {checkpoints.map((c) => (
              <li key={c.id}>SOL {c.sol} — {c.title}: {c.done ? "completed" : "not completed"}</li>
            ))}
          </ul>
        </div>

        <div className="report-section">
          <h3>Engineering decisions</h3>
          <ul>{decisions.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>

        <div className="report-section">
          <h3>Mission log</h3>
          <ul>{mission.log.slice(0, 10).map((entry: string, i: number) => <li key={i}>{entry}</li>)}</ul>
        </div>

        <div className="report-actions">
          <Button onClick={actions.reset}>Play again</Button>
        </div>
      </div>
    </div>
  );
}
