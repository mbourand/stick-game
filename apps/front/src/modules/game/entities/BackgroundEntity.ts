import type { ParsedMap } from "../../osu/convert/OsuConverter";
import type { Settings, SettingsListType } from "../../settings/Settings";
import type { Entity } from "../engine/Entity";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

export type BackgroundSource = Pick<
  ParsedMap,
  "backgroundUrl" | "backgroundOffsetX" | "backgroundOffsetY"
>;

export type BackgroundEntityOptions = {
  /** Radius of the circular crop in screen px. Defaults to the gameplay circle. */
  radius?: number;
  /**
   * Optional live clip radius, read every frame. When the surrounding ring is
   * being resized (e.g. the gameplay→scores grow), this keeps the texture from
   * spilling past the ring while it animates. Falls back to the static crop.
   */
  clipRadius?: () => number;
};

export class BackgroundEntity implements Entity {
  private source: BackgroundSource;
  private settings: Settings;
  private radius: number;
  private clipRadius?: () => number;
  private texture: HTMLCanvasElement | null = null;
  private offSettingChanged: () => void;

  constructor(source: BackgroundSource, settings: Settings, options: BackgroundEntityOptions = {}) {
    this.source = source;
    this.settings = settings;
    this.radius = options.radius ?? GAME_CIRCLE_DISPLAYED_RADIUS;
    this.clipRadius = options.clipRadius;
    void this.rebuildTexture();

    this.offSettingChanged = settings.events.on("onSettingChanged", (e) => {
      if (e.key === "backgroundBlurriness" || e.key === "backgroundBrightness") {
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

    ctx.filter = `blur(${settings.backgroundBlurriness}px) brightness(${settings.backgroundBrightness})`;
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
