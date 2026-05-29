import { GamepadButton } from "../../gamepad/Gamepad";

export type ButtonAction =
  | "confirm"
  | "back"
  | "pause"
  | "leaderboard-prev"
  | "leaderboard-next"
  | "nav-up"
  | "nav-down";

export type ButtonBinding = { device: "gamepad"; button: GamepadButton };

export type ActionBindings = Record<ButtonAction, ButtonBinding[]>;

export const DEFAULT_ACTION_BINDINGS: ActionBindings = {
  confirm: [{ device: "gamepad", button: GamepadButton.A }],
  back: [{ device: "gamepad", button: GamepadButton.B }],
  pause: [{ device: "gamepad", button: GamepadButton.Start }],
  "leaderboard-prev": [{ device: "gamepad", button: GamepadButton.LB }],
  "leaderboard-next": [{ device: "gamepad", button: GamepadButton.RB }],
  "nav-up": [{ device: "gamepad", button: GamepadButton.DPadUp }],
  "nav-down": [{ device: "gamepad", button: GamepadButton.DPadDown }],
};
