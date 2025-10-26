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
