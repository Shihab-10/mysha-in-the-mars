import { touchMove } from "../game/input";

type PadKey = "forward" | "backward" | "left" | "right";

function padHandlers(key: PadKey) {
  const on = () => {
    touchMove[key] = true;
  };
  const off = () => {
    touchMove[key] = false;
  };
  return {
    onPointerDown: on,
    onPointerUp: off,
    onPointerLeave: off,
    onPointerCancel: off,
    onContextMenu: (e: any) => e.preventDefault(),
  };
}

/** Large touch-friendly movement pad + interact button (also usable with a mouse). */
export function TouchPad({ onInteract, interactLabel = "E" }: { onInteract?: () => void; interactLabel?: string }) {
  return (
    <>
      <div className="touch-pad touch-pad--move">
        <button className="pad-up" aria-label="Move forward" {...padHandlers("forward")}>▲</button>
        <button className="pad-left" aria-label="Move left" {...padHandlers("left")}>◀</button>
        <button className="pad-down" aria-label="Move back" {...padHandlers("backward")}>▼</button>
        <button className="pad-right" aria-label="Move right" {...padHandlers("right")}>▶</button>
      </div>
      {onInteract && (
        <button className="ui-button touch-interact" onClick={onInteract} aria-label="Interact">
          {interactLabel}
        </button>
      )}
    </>
  );
}
