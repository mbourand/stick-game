import { GamepadAxisKind, GamepadButtonKind, type GamepadMappingType } from "./types";

export const DEFAULT_MAPPING: GamepadMappingType = {
  axisMapping: {
    [GamepadAxisKind.LeftStickX]: { kind: GamepadAxisKind.LeftStickX, index: 0, inverted: false },
    [GamepadAxisKind.LeftStickY]: { kind: GamepadAxisKind.LeftStickY, index: 1, inverted: false },
    [GamepadAxisKind.RightStickX]: { kind: GamepadAxisKind.RightStickX, index: 2, inverted: false },
    [GamepadAxisKind.RightStickY]: { kind: GamepadAxisKind.RightStickY, index: 3, inverted: false },
  },
  buttonMapping: {
    [GamepadButtonKind.LeftStickClick]: { kind: GamepadButtonKind.LeftStickClick, index: 10 },
    [GamepadButtonKind.RightStickClick]: { kind: GamepadButtonKind.RightStickClick, index: 11 },
  },
};
