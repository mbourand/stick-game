import { Container } from "../Container";
import type { Entity } from "../Entity";
import type { TickContext } from "../TickContext";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_STROKE_WIDTH } from "../../utils/constants";

/**
 * The persistent ring at the heart of the game's visual identity. Owned by the
 * Engine and referenced by whichever scene is currently visible — scenes
 * never destroy it.
 *
 * All numeric properties (radius, x, y, alpha, ringAlpha, strokeWidth) are
 * tweenable by the animation system; scene transitions interpolate them to
 * resize/move/fade the ring without re-creating it.
 *
 * Inner-canvas content (audio visualizer, score HUD, stick dots, ...) lives in
 * `innerContent` so it inherits the layer's position and shares an
 * independently-tweenable alpha (`innerAlpha`) — fade the inside without
 * fading the ring, or vice versa.
 */
export class CircleLayer implements Entity {
  public x = 0;
  public y = 0;
  public alpha = 1;

  public radius: number = GAME_CIRCLE_DISPLAYED_RADIUS;
  public strokeWidth: number = GAME_CIRCLE_STROKE_WIDTH;
  public strokeStyle = "white";
  public ringAlpha = 1;

  public readonly innerContent = new Container();
  public innerAlpha = 1;

  public update(tick: TickContext): void {
    this.innerContent.update(tick);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;

    ctx.save();
    if (this.x !== 0 || this.y !== 0) ctx.translate(this.x, this.y);
    ctx.globalAlpha *= this.alpha;

    if (this.innerAlpha > 0) {
      ctx.save();
      ctx.globalAlpha *= this.innerAlpha;
      this.innerContent.render(ctx);
      ctx.restore();
    }

    if (this.ringAlpha > 0 && this.strokeWidth > 0 && this.radius > 0) {
      ctx.save();
      ctx.globalAlpha *= this.ringAlpha;
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.strokeWidth;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  public destroy(): void {
    this.innerContent.destroy();
  }
}
