import { GamepadAxisKind, type GamepadAxisMapping } from "./mapping/types";

export class Gamepad {
  private mapping: Record<GamepadAxisKind, GamepadAxisMapping>;

  constructor(mapping: Record<GamepadAxisKind, GamepadAxisMapping>) {
    this.mapping = mapping;
  }

  public setMapping(mapping: Record<GamepadAxisKind, GamepadAxisMapping>) {
    this.mapping = mapping;
  }

  public getAxisValue(axisKind: GamepadAxisKind, sensitivity = 1, deadzone = 0.02): number {
    const gamepad = navigator.getGamepads()[0];
    if (!gamepad) return 0;
    const axisMapping = this.mapping[axisKind];

    const otherStickAxisKind = (() => {
      switch (axisKind) {
        case GamepadAxisKind.LeftStickX:
          return GamepadAxisKind.LeftStickY;
        case GamepadAxisKind.LeftStickY:
          return GamepadAxisKind.LeftStickX;
        case GamepadAxisKind.RightStickX:
          return GamepadAxisKind.RightStickY;
        case GamepadAxisKind.RightStickY:
          return GamepadAxisKind.RightStickX;
      }
    })();

    const otherAxisMapping = this.mapping[otherStickAxisKind];

    const value = (gamepad.axes[axisMapping.index] || 0) * sensitivity;
    const otherValue = gamepad.axes[otherAxisMapping.index] || 0;

    const isLockedInDeadzone = value * value + otherValue * otherValue < deadzone ** 2;

    if (isLockedInDeadzone) return 0;
    return axisMapping.inverted ? -value : value;
  }

  public getClampedStickPosition(stick: "left" | "right"): { x: number; y: number } {
    const stickXKind = stick === "left" ? GamepadAxisKind.LeftStickX : GamepadAxisKind.RightStickX;
    const stickYKind = stick === "left" ? GamepadAxisKind.LeftStickY : GamepadAxisKind.RightStickY;

    const axisX = this.getAxisValue(stickXKind);
    const axisY = this.getAxisValue(stickYKind);

    const length = Math.sqrt(axisX * axisX + axisY * axisY);
    const normalizedX = length > 1 ? axisX / length : axisX;
    const normalizedY = length > 1 ? axisY / length : axisY;

    return { x: normalizedX, y: normalizedY };
  }
}
