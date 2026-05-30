import { GamepadButton } from "../../gamepad/Gamepad";

export type ButtonAction =
  | "confirm"
  | "back"
  | "pause"
  | "leaderboard-prev"
  | "leaderboard-next"
  | "nav-up"
  | "nav-down"
  | "nav-left"
  | "nav-right";

export type ButtonBinding =
  | { device: "gamepad"; button: GamepadButton }
  /** `key` matches `KeyboardEvent.key` (e.g. "Enter", "Escape", "ArrowUp", "a"). */
  | { device: "keyboard"; key: string };

export type ActionBindings = Record<ButtonAction, ButtonBinding[]>;

export const DEFAULT_ACTION_BINDINGS: ActionBindings = {
  confirm: [
    { device: "gamepad", button: GamepadButton.A },
    { device: "keyboard", key: "Enter" },
  ],
  back: [
    { device: "gamepad", button: GamepadButton.B },
    { device: "keyboard", key: "Escape" },
  ],
  // Escape doubles as `back` and `pause`: the gameplay scene only binds
  // `pause`, menu scenes only bind `back`, so the active scene picks one or
  // the other. In Pause itself, both are bound to the same resume callback —
  // the second dispatch is a no-op because the first kicks off a transition
  // that the SceneManager guards re-entry on.
  pause: [
    { device: "gamepad", button: GamepadButton.Start },
    { device: "keyboard", key: "Escape" },
  ],
  "leaderboard-prev": [
    { device: "gamepad", button: GamepadButton.LB },
    { device: "keyboard", key: "PageUp" },
  ],
  "leaderboard-next": [
    { device: "gamepad", button: GamepadButton.RB },
    { device: "keyboard", key: "PageDown" },
  ],
  "nav-up": [
    { device: "gamepad", button: GamepadButton.DPadUp },
    { device: "keyboard", key: "ArrowUp" },
  ],
  "nav-down": [
    { device: "gamepad", button: GamepadButton.DPadDown },
    { device: "keyboard", key: "ArrowDown" },
  ],
  "nav-left": [
    { device: "gamepad", button: GamepadButton.DPadLeft },
    { device: "keyboard", key: "ArrowLeft" },
  ],
  "nav-right": [
    { device: "gamepad", button: GamepadButton.DPadRight },
    { device: "keyboard", key: "ArrowRight" },
  ],
};
