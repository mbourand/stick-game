import type { Entity } from "../engine/Entity";
import type { InputSystem } from "../input/InputSystem";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

type Side = "left" | "right";

const SIDE_LINE_COLOR: Record<Side, string> = {
  left: "rgba(255, 0, 0, 0.5)",
  right: "rgba(0, 0, 255, 0.5)",
};

const SIDE_DOT_COLOR: Record<Side, string> = {
  left: "red",
  right: "blue",
};

export class StickDotsEntity implements Entity {
  private inputSystem: InputSystem;

  constructor(inputSystem: InputSystem) {
    this.inputSystem = inputSystem;
  }

  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    this.drawSide(ctx, "left");
    this.drawSide(ctx, "right");
  }

  private drawSide(ctx: CanvasRenderingContext2D, side: Side) {
    const stick = this.inputSystem.getStick(side);
    const tipX = stick.x * GAME_CIRCLE_DISPLAYED_RADIUS;
    const tipY = stick.y * GAME_CIRCLE_DISPLAYED_RADIUS;

    ctx.strokeStyle = SIDE_LINE_COLOR[side];
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = SIDE_DOT_COLOR[side];
    ctx.beginPath();
    ctx.arc(tipX, tipY, 15, 0, Math.PI * 2);
    ctx.fill();
  }
}
