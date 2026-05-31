import type { Settings } from "../../settings/Settings";
import { Container } from "../engine/Container";
import type { Entity } from "../engine/Entity";
import type { TickContext } from "../engine/TickContext";
import { BackgroundEntity } from "./BackgroundEntity";

type Layer = { container: Container; entity: BackgroundEntity };

export type BackgroundCrossfaderOptions = {
  /** Circular crop radius in screen px — matches BackgroundEntity.radius. */
  radius: number;
  /** Total crossfade duration in milliseconds. */
  fadeDurationMs: number;
};

/**
 * Manages two stacked BackgroundEntity layers and crossfades between them
 * whenever `setSource(url)` is called with a new URL.
 *
 * The crossfader is itself a Container — add it to any parent and it'll render
 * the current background underneath whatever else the parent holds.
 *
 * Invariants:
 *   - At most two background layers exist at any time.
 *   - If a new incoming layer is requested while one is already fading in,
 *     that mid-fade layer is snapped to fully opaque and promoted to the
 *     stable slot first — bounded memory even if the user changes focus
 *     faster than `fadeDurationMs`.
 */
export class BackgroundCrossfader extends Container implements Entity {
  private readonly settings: Settings;
  private readonly radius: number;
  private readonly fadeDurationMs: number;

  private currentUrl: string | null = null;
  private stable: Layer | null = null;
  private incoming: Layer | null = null;
  private incomingElapsedMs = 0;

  constructor(settings: Settings, opts: BackgroundCrossfaderOptions) {
    super();
    this.settings = settings;
    this.radius = opts.radius;
    this.fadeDurationMs = opts.fadeDurationMs;
  }

  /**
   * Set the background to `backgroundUrl`. No-op if it's already the current
   * source. Pass `null` to fade everything out / clear immediately.
   */
  public setSource(backgroundUrl: string | null): void {
    if (this.currentUrl === backgroundUrl) return;
    this.currentUrl = backgroundUrl;
    if (backgroundUrl === null) {
      this.clear();
      return;
    }
    this.pushIncoming(backgroundUrl);
  }

  public override update(tick: TickContext): void {
    super.update(tick);
    if (!this.incoming) return;
    this.incomingElapsedMs += tick.dt;
    const progress = Math.min(1, this.incomingElapsedMs / this.fadeDurationMs);
    this.incoming.container.alpha = progress;
    if (progress >= 1) {
      this.promoteIncoming();
    }
  }

  public override clear(): void {
    if (this.incoming) {
      this.remove(this.incoming.container);
      this.incoming = null;
    }
    if (this.stable) {
      this.remove(this.stable.container);
      this.stable = null;
    }
    this.incomingElapsedMs = 0;
  }

  private pushIncoming(backgroundUrl: string): void {
    if (this.incoming) {
      this.incoming.container.alpha = 1;
      this.promoteIncoming();
    }

    const entity = new BackgroundEntity(
      { backgroundUrl, backgroundOffsetX: 0, backgroundOffsetY: 0 },
      this.settings,
      { radius: this.radius, variant: "menu" },
    );
    const container = new Container({ alpha: 0 });
    container.add(entity);
    this.add(container); // newest layer rendered on top

    this.incoming = { container, entity };
    this.incomingElapsedMs = 0;
  }

  private promoteIncoming(): void {
    if (!this.incoming) return;
    if (this.stable) this.remove(this.stable.container);
    this.stable = this.incoming;
    this.incoming = null;
    this.incomingElapsedMs = 0;
  }
}
