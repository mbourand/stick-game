import type { CircleLayer } from "../engine/layers/CircleLayer";
import type { Entity } from "../engine/Entity";
import type { InputSystem } from "../input/InputSystem";

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
  private circle: CircleLayer;

  constructor(inputSystem: InputSystem, circle: CircleLayer) {
    this.inputSystem = inputSystem;
    this.circle = circle;
  }

  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    this.drawSide(ctx, "left");
    this.drawSide(ctx, "right");
  }

  private drawSide(ctx: CanvasRenderingContext2D, side: Side) {
    const stick = this.inputSystem.getStick(side);
    const radius = this.circle.radius;
    const tipX = stick.x * radius;
    const tipY = stick.y * radius;

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
