import { TweenScheduler } from "../animation/TweenScheduler";
import type { TickContext } from "../TickContext";
import { CircleLayer } from "./CircleLayer";

/**
 * State that lives across scene swaps.
 *
 *   - `circle` is the shared ring referenced by whichever scene is on top.
 *     Scenes attach it to their root container during onEntered and detach it
 *     during onDestroy (Container.detach — never destroy).
 *
 *   - `transitions` is the scheduler that drives scene-to-scene choreographies
 *     (Phase 3). It is ticked by the engine every frame, independently of any
 *     per-scene tweens, so transitions keep running even as scenes are popped.
 */
export class PersistentRoot {
  public readonly circle = new CircleLayer();
  public readonly transitions = new TweenScheduler();

  public update(tick: TickContext): void {
    this.transitions.update(tick.dt);
  }
}
