import { GamepadButton } from "../../gamepad/Gamepad";

export type ButtonAction = "confirm" | "back" | "pause";

export type ButtonBinding = { device: "gamepad"; button: GamepadButton };

export type ActionBindings = Record<ButtonAction, ButtonBinding[]>;

export const DEFAULT_ACTION_BINDINGS: ActionBindings = {
  confirm: [{ device: "gamepad", button: GamepadButton.A }],
  back: [{ device: "gamepad", button: GamepadButton.B }],
  pause: [{ device: "gamepad", button: GamepadButton.Start }],
};
