export enum GamepadAxisKind {
  LeftStickX = "LeftStickX",
  LeftStickY = "LeftStickY",
  RightStickX = "RightStickX",
  RightStickY = "RightStickY",
}

export type GamepadAxisMapping = {
  kind: GamepadAxisKind;
  index: number;
  inverted: boolean;
};

export type GamepadAxisMappingType = Record<GamepadAxisKind, GamepadAxisMapping>;

export enum GamepadButtonKind {
  LeftStickClick = "LeftStickClick",
  RightStickClick = "RightStickClick",
}

export type GamepadButtonMapping = {
  kind: GamepadButtonKind;
  index: number;
};

export type GamepadButtonMappingType = Record<GamepadButtonKind, GamepadButtonMapping>;

export type GamepadMappingType = {
  axisMapping: GamepadAxisMappingType;
  buttonMapping: GamepadButtonMappingType;
};
