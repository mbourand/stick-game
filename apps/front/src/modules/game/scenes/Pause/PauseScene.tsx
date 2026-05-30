import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import { Scene } from "../Scene";
import { PauseView } from "./PauseView";

/**
 * One menu row. `run` decides what happens when activated — typically a
 * `transitionPop(...)` to remove this scene cleanly, possibly followed by
 * navigation. The pause scene doesn't pop itself: the caller knows whether
 * "resume" means a plain pop or part of a longer flow (retry / exit).
 */
export type PauseEntry = {
  id: string;
  label: string;
  run: () => void;
};

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;
  public override readonly isOverlay = true;

  public readonly entries: readonly PauseEntry[];
  // Default to index 0 (typically "Resume") so a quick A from the user
  // dismisses the pause immediately — the most common action by far.
  public readonly focused = new Store<number>(0);

  constructor(engine: Engine, entries: readonly PauseEntry[]) {
    super(engine);
    this.entries = entries;
  }

  public override onEntered() {
    // Audio suspend/resume is owned by GameplayScene — `openPauseMenu`
    // suspends before pushing pause, gameplay's onEntered resumes after
    // the pause-pop transition completes. That way audio gates correctly
    // with the visible fade-in / fade-out, instead of cutting at the start
    // of either transition.
    const resume = () => this.entries[0]?.run();
    this.onAction("pause", resume);
    this.onAction("back", resume);
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
