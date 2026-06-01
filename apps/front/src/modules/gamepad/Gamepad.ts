import type { Settings, SettingsListType } from "../settings/Settings";
import { EventEmitter } from "../utils/EventEmitter";

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

/** Identity of the pad currently driving input, or null when none is active. */
export type ActiveGamepadInfo = { index: number; id: string } | null;

type GamepadEvents = {
  /**
   * Fired whenever the active pad changes — claimed on connect, swapped on
   * manual override, or cleared on disconnect. The React layer uses this to
   * surface a "controller connected" toast.
   */
  onActiveGamepadChanged: (info: ActiveGamepadInfo) => void;
};

export class Gamepad {
  public readonly events = new EventEmitter<GamepadEvents>();

  /**
   * Manual selection from settings (a pad index), or null for "Auto". When
   * set and that pad is connected it always wins; otherwise we auto-detect.
   */
  private override: number | null;
  /** The pad we're actually reading from. Sticky: kept until it disconnects. */
  private activeIndex: number | null = null;
  private previousButtonPressed: boolean[] = [];
  private downHandlers: HandlerMap = new Map();
  private upHandlers: HandlerMap = new Map();
  private offSettingChanged: () => void;

  constructor(settings: Settings) {
    this.override = settings.get().selectedGamepadIndex;
    this.offSettingChanged = settings.events.on("onSettingChanged", (e) => {
      if (e.key === "selectedGamepadIndex") {
        this.override = e.value as SettingsListType["selectedGamepadIndex"];
        this.resolveActive();
      }
    });
    window.addEventListener("gamepadconnected", this.onConnected);
    window.addEventListener("gamepaddisconnected", this.onDisconnected);
    // Claim any pad already present (e.g. a pad pressed before this scene mounted).
    this.resolveActive();
  }

  public destroy() {
    this.offSettingChanged();
    window.removeEventListener("gamepadconnected", this.onConnected);
    window.removeEventListener("gamepaddisconnected", this.onDisconnected);
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
    // Fallback for browsers that don't reliably fire `gamepadconnected`: keep
    // trying to claim a pad while none is active. Cheap — a single array scan.
    if (this.activeIndex === null) this.resolveActive();

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
    if (this.activeIndex === null) return null;
    return navigator.getGamepads()[this.activeIndex] ?? null;
  }

  private onConnected = () => this.resolveActive();

  private onDisconnected = (e: GamepadEvent) => {
    if (e.gamepad.index === this.activeIndex) this.activeIndex = null;
    this.resolveActive();
  };

  /**
   * Decide which pad drives input: a connected manual override wins; otherwise
   * keep the current pad if it's still connected (sticky); otherwise claim the
   * first connected pad. Since browsers only expose a pad after the user
   * presses a button, "first connected" is effectively "first one touched".
   */
  private resolveActive() {
    const pads = navigator.getGamepads();
    if (this.override !== null && pads[this.override]) {
      this.setActive(this.override);
      return;
    }
    if (this.activeIndex !== null && pads[this.activeIndex]) return;
    const first = pads.find((p) => p != null) ?? null;
    this.setActive(first ? first.index : null);
  }

  private setActive(index: number | null) {
    if (index === this.activeIndex) return;
    this.activeIndex = index;
    this.previousButtonPressed = [];
    const pad = index === null ? null : navigator.getGamepads()[index];
    this.events.emit("onActiveGamepadChanged", pad ? { index: pad.index, id: pad.id } : null);
  }
}
