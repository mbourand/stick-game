import type { Engine } from "../../engine/Engine";
import type { Store } from "../../engine/state/Store";
import { type ActiveMods, NO_MODS, RATE_MAX, RATE_MIN, RATE_STEP } from "../../mods/mods";
import { crossfade } from "../transitions";
import { Scene } from "../Scene";
import { ModsView } from "./ModsView";

/**
 * Overlay scene for choosing the mods applied to the next play. Like FilterScene,
 * it doesn't own the state — the ActiveMods store lives on BeatmapSelectionScene
 * so the selection survives across opens/closes of this overlay.
 */
export class ModsScene extends Scene {
  public readonly id = "mods";
  public override readonly UI = ModsView;

  constructor(
    engine: Engine,
    /** The selection scene's active mods — edited in place from here. */
    public readonly mods: Store<ActiveMods>,
  ) {
    super(engine);
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
    this.onActionRepeat("nav-left", () => this.stepRate(-1));
    this.onActionRepeat("nav-right", () => this.stepRate(1));
    this.onStickRepeat("x", (dir) => this.stepRate(dir));
  }

  /** Nudge the rate by one step, clamped to [RATE_MIN, RATE_MAX] and snapped to 2 decimals. */
  public stepRate(dir: -1 | 1): void {
    this.setRate(this.mods.get().rate + dir * RATE_STEP);
  }

  public setRate(rate: number): void {
    const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, rate));
    this.mods.set({ ...this.mods.get(), rate: Math.round(clamped * 100) / 100 });
  }

  public reset(): void {
    this.mods.set(NO_MODS);
  }

  public close(): void {
    void this.sceneManager.transitionPop(crossfade);
  }
}
