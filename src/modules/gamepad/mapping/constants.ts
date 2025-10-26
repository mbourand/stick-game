import { GamepadAxisKind, type GamepadAxisMapping } from "./types";

export const DEFAULT_MAPPING = {
  [GamepadAxisKind.LeftStickX]: { kind: GamepadAxisKind.LeftStickX, index: 0, inverted: false },
  [GamepadAxisKind.LeftStickY]: { kind: GamepadAxisKind.LeftStickY, index: 1, inverted: false },
  [GamepadAxisKind.RightStickX]: { kind: GamepadAxisKind.RightStickX, index: 2, inverted: false },
  [GamepadAxisKind.RightStickY]: { kind: GamepadAxisKind.RightStickY, index: 3, inverted: false },
} as const satisfies Record<GamepadAxisKind, GamepadAxisMapping>;
