import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import { Scene } from "../Scene";
import { PauseView } from "./PauseView";

/**
 * One menu row. `run` is fired when the entry is activated via `confirm`;
 * it's the caller's choice whether that runs a long flow, just pops the
 * scene, etc. — PauseScene doesn't pop itself, it only invokes the callback.
 */
export type PauseEntry = {
  id: string;
  label: string;
  run: () => void;
};

export type PauseSceneOptions = {
  /**
   * Fired by the `pause` / `back` buttons. Conventionally the same callback as
   * the first entry's `run`, but kept explicit so the back-button behavior
   * doesn't depend on the menu's row ordering.
   */
  onResume: () => void;
  entries: readonly PauseEntry[];
};

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;
  public override readonly isOverlay = true;

  public readonly entries: readonly PauseEntry[];
  private readonly onResume: () => void;

  // Default to index 0 (typically "Resume") so a quick A from the user
  // dismisses the pause immediately — the most common action by far.
  public readonly focused = new Store<number>(0);

  constructor(engine: Engine, { onResume, entries }: PauseSceneOptions) {
    super(engine);
    this.onResume = onResume;
    this.entries = entries;
  }

  public override onEntered() {
    // Audio suspend/resume is owned by GameplayScene — `openPauseMenu`
    // suspends before pushing pause, gameplay's onEntered resumes after
    // the pause-pop transition completes. That way audio gates correctly
    // with the visible fade-in / fade-out, instead of cutting at the start
    // of either transition.
    this.onAction("pause", this.onResume);
    this.onAction("back", this.onResume);
    this.onAction("confirm", () => this.entries[this.focused.get()]?.run());
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
    this.onStickRepeat("y", (dir) => this.moveFocus(dir));
  }

  public moveFocus(delta: -1 | 1): void {
    const next = Math.max(0, Math.min(this.entries.length - 1, this.focused.get() + delta));
    this.focused.set(next);
  }
}
