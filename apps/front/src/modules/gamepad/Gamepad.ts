const LEFT_STICK_X_INDEX = 0;
const LEFT_STICK_Y_INDEX = 1;
const RIGHT_STICK_X_INDEX = 2;
const RIGHT_STICK_Y_INDEX = 3;
const STICK_DEADZONE = 0.02;

export class Gamepad {
  private selectedIndex: number | null;

  constructor(selectedIndex: number | null = null) {
    this.selectedIndex = selectedIndex;
  }

  public setSelectedIndex(selectedIndex: number | null) {
    this.selectedIndex = selectedIndex;
  }

  public getClampedStickPosition(stick: "left" | "right"): { x: number; y: number } {
    const pad = this.findGamepad();
    if (!pad) return { x: 0, y: 0 };

    const xIndex = stick === "left" ? LEFT_STICK_X_INDEX : RIGHT_STICK_X_INDEX;
    const yIndex = stick === "left" ? LEFT_STICK_Y_INDEX : RIGHT_STICK_Y_INDEX;
    const x = pad.axes[xIndex] ?? 0;
    const y = pad.axes[yIndex] ?? 0;

    if (x * x + y * y < STICK_DEADZONE * STICK_DEADZONE) return { x: 0, y: 0 };

    const length = Math.sqrt(x * x + y * y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private findGamepad() {
    if (this.selectedIndex === null) return null;
    return navigator.getGamepads()[this.selectedIndex] ?? null;
  }
}
