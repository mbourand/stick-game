import type { Settings, SettingsListType } from "../../settings/Settings";
import { Container } from "../engine/Container";
import type { Entity } from "../engine/Entity";
import type { TickContext } from "../engine/TickContext";
import { BackgroundEntity } from "./BackgroundEntity";

/** Which brightness/blur settings a background honours. */
export type BackgroundVariant = "gameplay" | "menu";

const VARIANT_KEYS: Record<
  BackgroundVariant,
  { brightness: keyof SettingsListType; blur: keyof SettingsListType }
> = {
  gameplay: { brightness: "backgroundBrightness", blur: "backgroundBlurriness" },
  menu: { brightness: "menuBackgroundBrightness", blur: "menuBackgroundBlurriness" },
};

/** Debounce after a settings change before re-baking, so a slider drag doesn't bake every step. */
const SETTINGS_REBAKE_DEBOUNCE_MS = 60;

type Layer = { container: Container; entity: BackgroundEntity };

export type BackgroundCrossfaderOptions = {
  /** Total crossfade duration in milliseconds. */
  fadeDurationMs: number;
  /**
   * Optional live clip radius, forwarded to every background layer. Lets the
   * crop follow a resizing ring (e.g. the shared menu↔selection ring) even
   * though each texture itself is built once at its baked `radius`.
   */
  clipRadius?: () => number;
  /**
   * Floor for the baked texture radius. Scenes whose ring is smaller than this
   * bake at this size and just clip down, so they all share one image scale —
   * a ring resize between them reveals more/less of the image without rescaling.
   */
  baseRadius: number;
};

/** Per-source options — each image carries its own treatment + resting size. */
export type BackgroundSourceOptions = {
  /** The scene's resting ring radius (floored to `baseRadius` when baking). */
  radius: number;
  /** Brightness/blur treatment to bake in. Defaults to the menu treatment. */
  variant?: BackgroundVariant;
  /** Background offset baked into the texture (defaults to centred). */
  offsetX?: number;
  offsetY?: number;
};

type ActiveSource = {
  url: string;
  variant: BackgroundVariant;
  radius: number;
  offsetX: number;
  offsetY: number;
};

/**
 * The single, persistent background. Holds two stacked BackgroundEntity layers
 * and crossfades between them whenever the active image *or its treatment*
 * (brightness/blur/size) changes — covering map/song switches and gradual
 * blur/brightness changes through one mechanism. Scene transitions never touch
 * its alpha; only a genuine content/treatment change fades.
 *
 * It is the settings-aware orchestrator: callers hand it a `variant`, it
 * resolves that variant's brightness/blur from `Settings`, bakes a layer, and
 * re-bakes (→ crossfade) when those settings change. `BackgroundEntity` itself
 * stays a dumb baked disc.
 *
 * The crossfader is itself a Container — add it to any parent and it renders the
 * current background underneath whatever else the parent holds.
 *
 * Invariants:
 *   - At most two background layers exist at any time.
 *   - If a new incoming layer is requested mid-fade, that layer is snapped to
 *     fully opaque and promoted first — bounded memory under rapid changes.
 */
export class BackgroundCrossfader extends Container implements Entity {
  private readonly settings: Settings;
  private readonly fadeDurationMs: number;
  private readonly clipRadius?: () => number;
  private readonly baseRadius: number;

  /** The current source request (image + variant + size), independent of the resolved treatment. */
  private active: ActiveSource | null = null;
  /** Identity of what's baked (url + resolved treatment); a change triggers a crossfade. */
  private currentKey: string | null = null;
  private stable: Layer | null = null;
  private incoming: Layer | null = null;
  private incomingElapsedMs = 0;
  /** Dedupe the double-tick during transitions (the layer sits in two scene roots). */
  private lastUpdatedFrame = -1;

  private settingsDebounce: ReturnType<typeof setTimeout> | null = null;
  private readonly offSettingChanged: () => void;

  /**
   * Drawn-this-frame guard. The shared layer sits in *several* scene roots at
   * once (both sides of a transition, an overlay + the scene beneath it). It is
   * opaque, so a second scene re-drawing it would paint over the first scene's
   * foreground (e.g. gameplay's fading HUD). We draw it only on the first
   * render of each frame — at the very back — and skip the rest. Reset once per
   * frame from a frame callback (see BackgroundLayer), so it works even for an
   * overlaid scene that renders without being updated.
   */
  private renderedThisFrame = false;

  constructor(settings: Settings, opts: BackgroundCrossfaderOptions) {
    super();
    this.settings = settings;
    this.fadeDurationMs = opts.fadeDurationMs;
    this.clipRadius = opts.clipRadius;
    this.baseRadius = opts.baseRadius;
    // A change to the active variant's brightness/blur re-bakes (→ crossfade),
    // so a Settings slider eases the treatment in instead of snapping. Debounced
    // so a fast drag doesn't bake on every step.
    this.offSettingChanged = settings.events.on("onSettingChanged", (e) => {
      const active = this.active;
      if (!active) return;
      const keys = VARIANT_KEYS[active.variant];
      if (e.key !== keys.brightness && e.key !== keys.blur) return;
      if (this.settingsDebounce !== null) clearTimeout(this.settingsDebounce);
      this.settingsDebounce = setTimeout(() => {
        this.settingsDebounce = null;
        this.applyActive();
      }, SETTINGS_REBAKE_DEBOUNCE_MS);
    });
  }

  /**
   * Show `backgroundUrl` with `opts`. Resolves the variant's treatment from
   * settings and crossfades if the resulting image/treatment/size differs from
   * what's shown. Use `clear()` to fade everything out.
   */
  public setSource(backgroundUrl: string, opts: BackgroundSourceOptions): void {
    this.active = {
      url: backgroundUrl,
      variant: opts.variant ?? "menu",
      radius: opts.radius,
      offsetX: opts.offsetX ?? 0,
      offsetY: opts.offsetY ?? 0,
    };
    this.applyActive();
  }

  /** Bake + crossfade to the active source at its current settings treatment, if anything changed. */
  private applyActive(): void {
    const active = this.active;
    if (!active) return;
    const keys = VARIANT_KEYS[active.variant];
    const snapshot = this.settings.get();
    const brightness = snapshot[keys.brightness] as number;
    const blur = snapshot[keys.blur] as number;
    const bakedRadius = Math.max(this.baseRadius, active.radius);
    const key = `${active.url}|${brightness}|${blur}|${bakedRadius}|${active.offsetX}|${active.offsetY}`;
    if (this.currentKey === key) return;
    this.currentKey = key;
    this.pushIncoming(active, bakedRadius, brightness, blur);
  }

  public override update(tick: TickContext): void {
    // During a transition the layer sits in two scene roots and is ticked twice
    // per frame; advance the crossfade only once so it keeps its real duration.
    if (tick.frame === this.lastUpdatedFrame) return;
    this.lastUpdatedFrame = tick.frame;

    super.update(tick);
    if (!this.incoming) return;
    this.incomingElapsedMs += tick.dt;
    const progress = Math.min(1, this.incomingElapsedMs / this.fadeDurationMs);
    this.incoming.container.alpha = progress;
    if (progress >= 1) {
      this.promoteIncoming();
    }
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    // Only the first scene to render this frame draws the shared background;
    // later roots holding the same instance skip it so they don't paint over
    // the foreground rendered between them (see `renderedThisFrame`).
    if (this.renderedThisFrame) return;
    this.renderedThisFrame = true;
    super.render(ctx);
  }

  /** Re-arm the per-frame draw guard. Called once per frame from a frame callback. */
  public resetRenderGuard(): void {
    this.renderedThisFrame = false;
  }

  public override clear(): void {
    this.currentKey = null;
    this.active = null;
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

  public override destroy(): void {
    if (this.settingsDebounce !== null) clearTimeout(this.settingsDebounce);
    this.offSettingChanged();
    super.destroy();
  }

  private pushIncoming(active: ActiveSource, radius: number, brightness: number, blur: number): void {
    if (this.incoming) {
      this.incoming.container.alpha = 1;
      this.promoteIncoming();
    }

    const entity = new BackgroundEntity(
      { backgroundUrl: active.url, backgroundOffsetX: active.offsetX, backgroundOffsetY: active.offsetY },
      { radius, brightness, blur, clipRadius: this.clipRadius },
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
