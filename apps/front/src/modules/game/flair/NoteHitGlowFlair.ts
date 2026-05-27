import type { Entity } from "../engine/Entity";
import type { TickContext } from "../engine/TickContext";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_STROKE_WIDTH } from "../utils/constants";

export class NoteHitGlowFlair implements Entity {
  private startAngle: number;
  private endAngle: number;
  private duration: number;
  private color: string;
  private elapsedTime: number;

  constructor(startAngle: number, endAngle: number, duration: number, color: string) {
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.duration = duration;
    this.color = color;
    this.elapsedTime = 0;
  }

  public isAlive(): boolean {
    return this.elapsedTime < this.duration;
  }

  public update(tick: TickContext) {
    this.elapsedTime += tick.dt;
  }

  public render(ctx: CanvasRenderingContext2D) {
    const progress = Math.min(this.elapsedTime / this.duration, 1);
    const alpha = 0.5 - progress * 0.5;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, GAME_CIRCLE_DISPLAYED_RADIUS + GAME_CIRCLE_STROKE_WIDTH / 2 + 200, this.startAngle, this.endAngle);
    ctx.arc(0, 0, GAME_CIRCLE_DISPLAYED_RADIUS + GAME_CIRCLE_STROKE_WIDTH / 2, this.endAngle, this.startAngle, true);
    ctx.closePath();
    const gradient = ctx.createRadialGradient(
      0,
      0,
      GAME_CIRCLE_DISPLAYED_RADIUS + GAME_CIRCLE_STROKE_WIDTH / 2,
      0,
      0,
      GAME_CIRCLE_DISPLAYED_RADIUS + GAME_CIRCLE_STROKE_WIDTH / 2 + 200,
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
