/** Shared touch/virtual movement state, written by the HUD pad, read in useFrame. */
export const touchMove = { forward: false, backward: false, left: false, right: false };

export function resetTouchMove() {
  touchMove.forward = false;
  touchMove.backward = false;
  touchMove.left = false;
  touchMove.right = false;
}

export const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "interact", keys: ["KeyE"] },
];
