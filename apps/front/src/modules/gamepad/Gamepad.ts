import type { Settings, SettingsListType } from "../settings/Settings";

const LEFT_STICK_X_INDEX = 0;
const LEFT_STICK_Y_INDEX = 1;
const RIGHT_STICK_X_INDEX = 2;
const RIGHT_STICK_Y_INDEX = 3;
const STICK_DEADZONE = 0.02;

export enum GamepadButton {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6,
  RT = 7,
  Back = 8,
  Start = 9,
  LSB = 10,
  RSB = 11,
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
}

type ButtonHandler = () => void;
type HandlerMap = Map<GamepadButton, Set<ButtonHandler>>;

export class Gamepad {
  private selectedIndex: number | null;
  private previousButtonPressed: boolean[] = [];
  private downHandlers: HandlerMap = new Map();
  private upHandlers: HandlerMap = new Map();
  private offSettingChanged: () => void;

  constructor(settings: Settings) {
    this.selectedIndex = settings.get().selectedGamepadIndex;
    this.offSettingChanged = settings.events.on("onSettingChanged", (e) => {
      if (e.key === "selectedGamepadIndex") {
        this.selectedIndex = e.value as SettingsListType["selectedGamepadIndex"];
        this.previousButtonPressed = [];
      }
    });
  }

  public destroy() {
    this.offSettingChanged();
    this.downHandlers.clear();
    this.upHandlers.clear();
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

  public onButtonDown(button: GamepadButton, handler: ButtonHandler): () => void {
    return this.addHandler(this.downHandlers, button, handler);
  }

  public onButtonUp(button: GamepadButton, handler: ButtonHandler): () => void {
    return this.addHandler(this.upHandlers, button, handler);
  }

  public tick() {
    const pad = this.findGamepad();
    if (!pad) {
      if (this.previousButtonPressed.length > 0) this.previousButtonPressed = [];
      return;
    }

    for (let i = 0; i < pad.buttons.length; i++) {
      const wasPressed = this.previousButtonPressed[i] ?? false;
      const isPressed = pad.buttons[i]?.pressed ?? false;

      if (isPressed && !wasPressed) this.dispatch(this.downHandlers, i);
      else if (!isPressed && wasPressed) this.dispatch(this.upHandlers, i);

      this.previousButtonPressed[i] = isPressed;
    }
  }

  private addHandler(map: HandlerMap, button: GamepadButton, handler: ButtonHandler): () => void {
    let set = map.get(button);
    if (!set) {
      set = new Set();
      map.set(button, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  private dispatch(map: HandlerMap, buttonIndex: number) {
    const handlers = map.get(buttonIndex as GamepadButton);
    if (!handlers) return;
    for (const handler of [...handlers]) handler();
  }

  private findGamepad() {
    if (this.selectedIndex === null) return null;
    return navigator.getGamepads()[this.selectedIndex] ?? null;
  }
}
