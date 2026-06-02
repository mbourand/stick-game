import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import { crossfade } from "../transitions";
import { Scene } from "../Scene";
import { DownloaderView } from "./DownloaderView";

/**
 * Snapshot the view pushes to the scene so it can navigate + confirm without
 * caring about the underlying React Query / dexie wiring.
 */
export type DownloaderListContext = {
  count: number;
  onConfirm: (index: number) => void;
};

const DEFAULT_LIST_CONTEXT: DownloaderListContext = {
  count: 0,
  onConfirm: () => {},
};

/**
 * Overlay scene for searching + downloading beatmapsets. Owns the focused
 * row + back/nav/confirm wiring; the view owns the data layer (search query,
 * React Query results, the actual download).
 */
export class DownloaderScene extends Scene {
  public readonly id = "downloader";
  public override readonly UI = DownloaderView;

  public readonly focused = new Store<number>(0);

  private listContext: DownloaderListContext = DEFAULT_LIST_CONTEXT;

  constructor(engine: Engine) {
    super(engine);
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
    this.onAction("confirm", () => this.confirmFocused());
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
  }

  public close(): void {
    void this.sceneManager.transitionPop(crossfade);
  }

  public confirmFocused(): void {
    this.listContext.onConfirm(this.focused.get());
  }

  public moveFocus(delta: -1 | 1): void {
    const count = this.listContext.count;
    if (count === 0) return;
    const next = Math.max(0, Math.min(count - 1, this.focused.get() + delta));
    if (next !== this.focused.get()) this.focused.set(next);
  }

  /** Called by the view whenever the result set changes (count + how to confirm). */
  public setListContext(ctx: DownloaderListContext): void {
    const prevCount = this.listContext.count;
    this.listContext = ctx;
    if (ctx.count !== prevCount) {
      // Clamp focus if the new list is shorter than where we were.
      this.focused.set(Math.min(this.focused.get(), Math.max(0, ctx.count - 1)));
    }
  }

  public resetListContext(): void {
    this.listContext = DEFAULT_LIST_CONTEXT;
  }
}
