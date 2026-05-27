import type { Entity } from "../engine/Entity";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

export class OuterRingEntity implements Entity {
  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, GAME_CIRCLE_DISPLAYED_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
}
