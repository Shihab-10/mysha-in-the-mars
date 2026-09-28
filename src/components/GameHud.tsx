import { EQUIPMENT, PHASE_LABELS } from "../game/data";
import { Button } from "./UI";
import { TouchPad } from "./TouchControls";

function Brand() {
  return (
    <div className="hud-brand">
      <i />
      <span>MYSHA IN THE MARS<small>Mars Outpost Survival</small></span>
    </div>
  );
}

function EquipmentChecklist({ mission }: any) {
  return (
    <aside className={`equipment-panel ${mission.allEquipmentCollected ? "is-complete" : ""}`}>
      <div className="equipment-head">
        <span>Mission Equipment</span>
        <strong>{String(mission.equipmentCount).padStart(2, "0")} / 10</strong>
      </div>
      <div className="equipment-progress"><i style={{ width: `${mission.equipmentCount * 10}%` }} /></div>
      <div className="equipment-list">
        {EQUIPMENT.map((item, index) => {
          const collected = mission.collectedEquipment.includes(item.id);
          const current = index === mission.currentEquipmentIndex && !mission.allEquipmentCollected;
          const locked = index > mission.currentEquipmentIndex && !collected;
          return (
            <div className={`equipment-row ${collected ? "is-collected" : ""} ${current ? "is-current" : ""} ${locked ? "is-locked" : ""}`} key={item.id}>
              <span className="equipment-icon">{collected ? "✓" : item.icon}</span>
              <span className="equipment-name"><small>{String(index + 1).padStart(2, "0")}</small>{item.short}</span>
              <i />
            </div>
          );
        })}
      </div>
      {mission.allEquipmentCollected && (
        <div className="equipment-complete">
          <b>Equipment complete</b>
          <span>Proceed to PROTOCOL B-612</span>
        </div>
      )}
    </aside>
  );
}

function Tutorial({ onClose }: any) {
  return (
    <div className="tutorial-card">
      <div>
        <span>Level 1 controls</span>
        <strong>Prepare astronaut Mysha</strong>
      </div>
      <div className="control-grid">
        <span><b>WASD</b> Move</span>
        <span><b>Mouse</b> Look</span>
        <span><b>E</b> Interact</span>
        <span><b>ESC</b> Release</span>
      </div>
      <p>Collect the highlighted equipment in order. Click the 3D world to capture the mouse. On touch devices use the on-screen pad and the round E button.</p>
      <Button onClick={onClose}>Begin preparation</Button>
    </div>
  );
}

function InteractionPrompt({ mission, context, onInteract }: any) {
  if (mission.phase !== "preparation" || mission.interactionLocked) return null;
  const nearby = context.nearby;
  if (!nearby) {
    return (
      <div className="objective-strip">
        <span>Current objective</span>
        <b>{mission.allEquipmentCollected ? "Walk to the rocket boarding area" : `Locate ${context.currentEquipment?.name}`}</b>
      </div>
    );
  }
  const isRocket = nearby.kind === "rocket";
  const enabled = isRocket ? mission.canBoardRocket : nearby.id === context.currentEquipment?.id;
  return (
    <Button className={`interaction-prompt ${enabled ? "" : "is-locked"}`} variant={enabled ? "primary" : "secondary"} onClick={onInteract}>
      <kbd>E</kbd>
      <span>
        <small>{enabled ? "Interact" : "Locked"}</small>
        {isRocket ? (enabled ? "Board PROTOCOL B-612" : "Equipment required") : enabled ? `Collect ${nearby.short}` : `Collect ${context.currentEquipment?.short} first`}
      </span>
    </Button>
  );
}

function BoardingOverlay({ step }: any) {
  const stages = [
    ["Boarding access granted", "Mysha is approaching PROTOCOL B-612."],
    ["Hatch opening", "Access mechanism extended."],
    ["Entering spacecraft", "Transitioning to the crew cabin."],
  ];
  const copy = stages[Math.min(step, stages.length - 1)];
  return (
    <div className="cinematic-caption">
      <span>Boarding sequence · {String(step + 1).padStart(2, "0")}</span>
      <strong>{copy[0]}</strong>
      <p>{copy[1]}</p>
      <div className="cinematic-progress"><i style={{ width: `${(step + 1) * 33.34}%` }} /></div>
    </div>
  );
}

function LaunchConfirmation({ mission, actions }: any) {
  if (mission.phase !== "cockpit") return null;
  if (mission.launchPanelDismissed) {
    return (
      <Button className="resume-launch" onClick={actions.reopenLaunchPanel}>
        Open launch confirmation
      </Button>
    );
  }
  return (
    <div className="launch-confirm">
      <span>Mission Control</span>
      <strong>Ready for launch?</strong>
      <div className="verification">
        <p><i /> Astronaut seated</p>
        <p><i /> Required equipment verified</p>
        <p><i /> Spacecraft systems ready</p>
      </div>
      <div className="launch-actions">
        <Button variant="secondary" onClick={actions.dismissLaunchPanel}>Not yet</Button>
        <Button onClick={actions.confirmLaunch}>Launch now</Button>
      </div>
    </div>
  );
}

function LaunchOverlay({ mission, actions }: any) {
  const active = ["countdown", "ignition", "liftoff", "ascent", "space"].includes(mission.phase);
  if (!active) return null;
  const titles: Record<string, string[]> = {
    ignition: ["Ignition", "Main engines at full thrust"],
    liftoff: ["Liftoff", "PROTOCOL B-612 has cleared the tower"],
    ascent: ["Atmospheric ascent", "Passing maximum aerodynamic pressure"],
    space: ["Orbital insertion", "Earth departure trajectory acquired"],
  };
  return (
    <>
      {mission.phase === "countdown" ? (
        <div className="countdown">
          <span>T minus</span>
          <strong>{mission.countdown}</strong>
          <p>Launch confirmed · Crew secure</p>
        </div>
      ) : (
        <div className="launch-status">
          <span>PROTOCOL B-612 launch sequence</span>
          <strong>{titles[mission.phase][0]}</strong>
          <p>{titles[mission.phase][1]}</p>
        </div>
      )}
      <Button variant="ghost" className="skip-button" onClick={actions.beginJourney}>Skip cinematic</Button>
    </>
  );
}

export function GameHud({ mission, actions, context, onInteract, onCloseTutorial, onToggleSound }: any) {
  const showChecklist = mission.phase === "preparation";
  return (
    <div className="game-hud">
      <header className="hud-top">
        <Brand />
        <div className="phase-label">
          <span>{PHASE_LABELS[mission.phase]}</span>
          <i />
          <b>Earth · Launch Facility</b>
        </div>
        <Button variant="ghost" className="hud-sound" onClick={onToggleSound}>Audio {context.soundOn ? "On" : "Off"}</Button>
      </header>
      {showChecklist && <EquipmentChecklist mission={mission} />}
      {showChecklist && context.tutorial && <Tutorial onClose={onCloseTutorial} />}
      <InteractionPrompt mission={mission} context={context} onInteract={onInteract} />
      {showChecklist && !context.tutorial && <TouchPad onInteract={onInteract} />}
      {context.notice && <div className="notice-toast">{context.notice}</div>}
      {mission.collectingId && (
        <div className="collection-action">
          <span>Equipment interaction</span>
          <strong>{EQUIPMENT.find((item) => item.id === mission.collectingId)?.name}</strong>
          <i />
        </div>
      )}
      {mission.phase === "boarding" && <BoardingOverlay step={mission.boardingStep} />}
      <LaunchConfirmation mission={mission} actions={actions} />
      <LaunchOverlay mission={mission} actions={actions} />
    </div>
  );
}
