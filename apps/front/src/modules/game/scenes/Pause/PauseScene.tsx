import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TickContext } from "../../engine/TickContext";
import { Scene } from "../Scene";
import { PauseView } from "./PauseView";

export type PauseAction = "resume" | "retry" | "exit";

export const PAUSE_ACTIONS: { id: PauseAction; label: string }[] = [
  { id: "resume", label: "Resume" },
  { id: "retry", label: "Retry" },
  { id: "exit", label: "Exit to selection" },
];

export type PauseCallbacks = {
  onResume: () => void;
  onRetry: () => void;
  onExit: () => void;
};

/**
 * Edge-triggered list navigation: a push past `ENGAGE` moves the focus one
 * step, then the stick has to return below `RELEASE` before another move
 * registers. Hysteresis between the two keeps a stick parked near the
 * threshold from firing repeatedly.
 */
const STICK_ENGAGE_THRESHOLD = 0.3;
const STICK_RELEASE_THRESHOLD = 0.2;

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;

  // Default to "resume" so a quick A from the user dismisses the pause
  // immediately — the most common action by far.
  public readonly focused = new Store<PauseAction>("resume");

  private readonly callbacks: PauseCallbacks;
  /** Edge state for the engage/release nav: true while the stick is held past ENGAGE. */
  private stickEngaged = false;

  constructor(engine: Engine, callbacks: PauseCallbacks) {
    super(engine);
    this.callbacks = callbacks;
  }

  public override onEntered() {
    this.onAction("pause", () => this.callbacks.onResume());
    this.onAction("back", () => this.callbacks.onResume());
    this.onAction("confirm", () => this.activate(this.focused.get()));
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
  }

  public override update(_tick: TickContext): void {
    const left = this.getStick("left");
    const right = this.getStick("right");
    // Dominant stick by absolute y — either stick navigates.
    const y = Math.abs(left.y) >= Math.abs(right.y) ? left.y : right.y;

    if (this.stickEngaged) {
      if (Math.abs(y) < STICK_RELEASE_THRESHOLD) this.stickEngaged = false;
      return;
    }
    if (y < -STICK_ENGAGE_THRESHOLD) {
      this.moveFocus(-1);
      this.stickEngaged = true;
    } else if (y > STICK_ENGAGE_THRESHOLD) {
      this.moveFocus(+1);
      this.stickEngaged = true;
    }
  }

  /**
   * Each callback is responsible for its own pause-removal — typically a
   * `transitionPop(pauseExit)` so the overlay fades out cleanly rather than
   * snapping. We don't remove ourselves synchronously here.
   */
  public activate(action: PauseAction): void {
    if (action === "resume") this.callbacks.onResume();
    else if (action === "retry") this.callbacks.onRetry();
    else this.callbacks.onExit();
  }

  private moveFocus(delta: -1 | 1): void {
    const current = this.focused.get();
    const idx = PAUSE_ACTIONS.findIndex((a) => a.id === current);
    if (idx === -1) return;
    const nextIdx = Math.max(0, Math.min(PAUSE_ACTIONS.length - 1, idx + delta));
    if (nextIdx !== idx) this.focused.set(PAUSE_ACTIONS[nextIdx].id);
  }
}
