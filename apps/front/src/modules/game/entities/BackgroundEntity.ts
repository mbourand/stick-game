import type { ParsedMap } from "../../osu/convert/OsuConverter";
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
  /** Brightness multiplier baked into the texture (1 = unchanged). */
  brightness?: number;
  /** Blur radius in px baked into the texture (0 = sharp). */
  blur?: number;
};

/**
 * A pure, static background disc: bakes one image (cover-scaled, centred,
 * brightness + blur applied) into a texture and renders it clipped to the live
 * ring. It is intentionally dumb — it has no knowledge of settings or scene
 * "variants". The treatment (brightness/blur) is handed in already resolved;
 * any change to it produces a *new* entity (see BackgroundCrossfader), so
 * transitions can crossfade between treatments rather than re-bake in place.
 */
export class BackgroundEntity implements Entity {
  private source: BackgroundSource;
  private radius: number;
  private clipRadius?: () => number;
  private brightness: number;
  private blur: number;
  private texture: HTMLCanvasElement | null = null;

  constructor(source: BackgroundSource, options: BackgroundEntityOptions = {}) {
    this.source = source;
    this.radius = options.radius ?? GAME_CIRCLE_DISPLAYED_RADIUS;
    this.clipRadius = options.clipRadius;
    this.brightness = options.brightness ?? 1;
    this.blur = options.blur ?? 0;
    void this.rebuildTexture();
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

  public destroy(): void {}

  private async rebuildTexture(): Promise<void> {
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
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    // Center the cover-scaled image in the square texture — the overflow on the
    // larger axis is split evenly both sides — then apply the map's offset nudge.
    // Without this the image is top-left anchored, so a landscape/portrait
    // background shows an edge in the circle instead of its center.
    const drawX = (this.radius * 2 - drawWidth) / 2 + this.source.backgroundOffsetX * scale;
    const drawY = (this.radius * 2 - drawHeight) / 2 + this.source.backgroundOffsetY * scale;

    ctx.filter = `blur(${this.blur}px) brightness(${this.brightness})`;
    ctx.beginPath();
    ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = "none";

    this.texture = canvas;
  }
}
