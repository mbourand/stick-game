import type { BeatmapClock } from "../engine/BeatmapClock";
import type { Entity } from "../engine/Entity";

export class SongProgressEntity implements Entity {
  private clock: BeatmapClock;
  private durationMs: number;

  constructor(clock: BeatmapClock, durationMs: number) {
    this.clock = clock;
    this.durationMs = durationMs;
  }

  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    const elapsed = Math.max(0, Math.min(this.durationMs, this.clock.now()));

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px Rostex";
    this.drawFixedWidthTime(ctx, `${formatTime(elapsed)}/${formatTime(this.durationMs)}`, 120);
  }

  private drawFixedWidthTime(ctx: CanvasRenderingContext2D, text: string, y: number): void {
    const cell = ctx.measureText("0").width;
    const widthOf = (ch: string) => (ch >= "0" && ch <= "9" ? cell : ctx.measureText(ch).width);

    let total = 0;
    for (const ch of text) total += widthOf(ch);

    let x = -total / 2;
    for (const ch of text) {
      const w = widthOf(ch);
      ctx.fillText(ch, x + w / 2, y);
      x += w;
    }
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
