import type { Gamepad } from "../../gamepad/Gamepad";
import type { InputDeviceAdapter } from "./InputDeviceAdapter";

/** Wraps a `Gamepad` instance behind the generic `InputDeviceAdapter` contract. */
export function createGamepadAdapter(gamepad: Gamepad): InputDeviceAdapter {
  return {
    device: "gamepad",
    onButtonDown(binding, handler) {
      if (binding.device !== "gamepad") return null;
      return gamepad.onButtonDown(binding.button, handler);
    },
    onButtonUp(binding, handler) {
      if (binding.device !== "gamepad") return null;
      return gamepad.onButtonUp(binding.button, handler);
    },
    getStick(side) {
      return gamepad.getClampedStickPosition(side);
    },
    tick() {
      gamepad.tick();
    },
    destroy() {
      gamepad.destroy();
    },
  };
}
