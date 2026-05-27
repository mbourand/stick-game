import type { ParsedMap } from "../../osu/convert/OsuConverter";
import type { Settings, SettingsListType } from "../../settings/Settings";
import type { Entity } from "../engine/Entity";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

export class BackgroundEntity implements Entity {
  private parsedMap: ParsedMap;
  private settings: Settings;
  private texture: HTMLCanvasElement | null = null;
  private offSettingChanged: () => void;

  constructor(parsedMap: ParsedMap, settings: Settings) {
    this.parsedMap = parsedMap;
    this.settings = settings;
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
    ctx.drawImage(this.texture, -GAME_CIRCLE_DISPLAYED_RADIUS, -GAME_CIRCLE_DISPLAYED_RADIUS);
  }

  public destroy(): void {
    this.offSettingChanged();
  }

  private async rebuildTexture(): Promise<void> {
    const settings: SettingsListType = this.settings.get();

    const image = new Image();
    image.src = this.parsedMap.backgroundUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = GAME_CIRCLE_DISPLAYED_RADIUS * 2;
    canvas.height = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    const imageMinSize = Math.min(image.width, image.height);
    const scale = (GAME_CIRCLE_DISPLAYED_RADIUS * 2) / imageMinSize;

    ctx.filter = `blur(${settings.backgroundBlurriness}px) brightness(${settings.backgroundBrightness})`;
    ctx.beginPath();
    ctx.arc(GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_DISPLAYED_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      image,
      this.parsedMap.backgroundOffsetX * scale,
      this.parsedMap.backgroundOffsetY * scale,
      image.width * scale,
      image.height * scale,
    );
    ctx.filter = "none";

    this.texture = canvas;
  }
}
