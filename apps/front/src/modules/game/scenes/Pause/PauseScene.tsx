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

const STICK_ACTIVE_THRESHOLD = 0.5;
/** Y bands for stick navigation: above this magnitude on y picks the top/bottom button. */
const STICK_BAND_THRESHOLD = 0.4;

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;

  // Default to "resume" so a quick A from the user dismisses the pause
  // immediately — the most common action by far.
  public readonly focused = new Store<PauseAction>("resume");

  private readonly callbacks: PauseCallbacks;

  constructor(engine: Engine, callbacks: PauseCallbacks) {
    super(engine);
    this.callbacks = callbacks;
  }

  public override onEntered() {
    this.onAction("pause", () => this.callbacks.onResume());
    this.onAction("back", () => this.callbacks.onResume());
    this.onAction("confirm", () => this.activate(this.focused.get()));
  }

  public override update(_tick: TickContext): void {
    const left = this.getStick("left");
    const right = this.getStick("right");
    const target = this.pickByStick(left) ?? this.pickByStick(right);
    if (target !== null) this.focused.set(target);
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

  private pickByStick(stick: { x: number; y: number }): PauseAction | null {
    const magnitude = Math.sqrt(stick.x * stick.x + stick.y * stick.y);
    if (magnitude < STICK_ACTIVE_THRESHOLD) return null;
    if (stick.y < -STICK_BAND_THRESHOLD) return "resume";
    if (stick.y > STICK_BAND_THRESHOLD) return "exit";
    return "retry";
  }
}
