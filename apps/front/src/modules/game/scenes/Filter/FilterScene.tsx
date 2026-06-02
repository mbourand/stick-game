import type { Engine } from "../../engine/Engine";
import type { Store } from "../../engine/state/Store";
import { crossfade } from "../transitions";
import { Scene } from "../Scene";
import { FilterView } from "./FilterView";
import type { DifficultyFilter } from "./filterTypes";

/**
 * Overlay scene for editing the BeatmapSelection's difficulty filter.
 * Doesn't own the filter state — that lives on BeatmapSelectionScene so
 * the value survives across opens/closes of this overlay.
 */
export class FilterScene extends Scene {
  public readonly id = "filter";
  public override readonly UI = FilterView;

  constructor(
    engine: Engine,
    /** The selection scene's difficulty filter — edited in place from here. */
    public readonly difficultyFilter: Store<DifficultyFilter | null>,
  ) {
    super(engine);
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
  }

  public close(): void {
    void this.sceneManager.transitionPop(crossfade);
  }
}
