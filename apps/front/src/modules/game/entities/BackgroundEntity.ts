import type { ParsedMap } from "../../osu/convert/OsuConverter";
import type { Settings, SettingsListType } from "../../settings/Settings";
import type { Entity } from "../engine/Entity";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

export type BackgroundSource = Pick<
  ParsedMap,
  "backgroundUrl" | "backgroundOffsetX" | "backgroundOffsetY"
>;

/** Which settings the background reads its brightness/blur from. */
export type BackgroundVariant = "gameplay" | "menu";

const VARIANT_KEYS: Record<
  BackgroundVariant,
  { brightness: keyof SettingsListType; blur: keyof SettingsListType }
> = {
  gameplay: { brightness: "backgroundBrightness", blur: "backgroundBlurriness" },
  menu: { brightness: "menuBackgroundBrightness", blur: "menuBackgroundBlurriness" },
};

export type BackgroundEntityOptions = {
  /** Radius of the circular crop in screen px. Defaults to the gameplay circle. */
  radius?: number;
  /**
   * Optional live clip radius, read every frame. When the surrounding ring is
   * being resized (e.g. the gameplay→scores grow), this keeps the texture from
   * spilling past the ring while it animates. Falls back to the static crop.
   */
  clipRadius?: () => number;
  /** Which brightness/blur settings to honour. Defaults to the gameplay ones. */
  variant?: BackgroundVariant;
};

export class BackgroundEntity implements Entity {
  private source: BackgroundSource;
  private settings: Settings;
  private radius: number;
  private clipRadius?: () => number;
  private keys: { brightness: keyof SettingsListType; blur: keyof SettingsListType };
  private texture: HTMLCanvasElement | null = null;
  private offSettingChanged: () => void;

  constructor(source: BackgroundSource, settings: Settings, options: BackgroundEntityOptions = {}) {
    this.source = source;
    this.settings = settings;
    this.radius = options.radius ?? GAME_CIRCLE_DISPLAYED_RADIUS;
    this.clipRadius = options.clipRadius;
    this.keys = VARIANT_KEYS[options.variant ?? "gameplay"];
    void this.rebuildTexture();

    this.offSettingChanged = settings.events.on("onSettingChanged", (e) => {
      if (e.key === this.keys.brightness || e.key === this.keys.blur) {
        void this.rebuildTexture();
      }
    });
  }

  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.texture) return;

    const clip = this.clipRadius?.();
    if (clip !== undefined && clip < this.radius) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, clip), 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.texture, -this.radius, -this.radius);
      ctx.restore();
      return;
    }

    ctx.drawImage(this.texture, -this.radius, -this.radius);
  }

  public destroy(): void {
    this.offSettingChanged();
  }

  private async rebuildTexture(): Promise<void> {
    const settings: SettingsListType = this.settings.get();

    const image = new Image();
    image.src = this.source.backgroundUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = this.radius * 2;
    canvas.height = this.radius * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const imageMinSize = Math.min(image.width, image.height);
    const scale = (this.radius * 2) / imageMinSize;

    const blur = settings[this.keys.blur] as number;
    const brightness = settings[this.keys.brightness] as number;
    ctx.filter = `blur(${blur}px) brightness(${brightness})`;
    ctx.beginPath();
    ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      image,
      this.source.backgroundOffsetX * scale,
      this.source.backgroundOffsetY * scale,
      image.width * scale,
      image.height * scale,
    );
    ctx.filter = "none";

    this.texture = canvas;
  }
}
