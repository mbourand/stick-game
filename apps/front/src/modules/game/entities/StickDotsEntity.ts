import type { CircleLayer } from "./CircleLayer";
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

/**
 * Stick positions are sampled in `update`, not `render` — that way the dots
 * freeze whenever the owning scene stops being ticked (e.g. when it's
 * inactive under a modal/overlay scene). If we read in render() the dots
 * would keep following the stick even while the scene's logic is paused.
 */
export class StickDotsEntity implements Entity {
  private inputSystem: InputSystem;
  private circle: CircleLayer;
  private leftStick = { x: 0, y: 0 };
  private rightStick = { x: 0, y: 0 };

  constructor(inputSystem: InputSystem, circle: CircleLayer) {
    this.inputSystem = inputSystem;
    this.circle = circle;
  }

  public update(): void {
    this.leftStick = this.inputSystem.getStick("left");
    this.rightStick = this.inputSystem.getStick("right");
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Both lines first, then both dots — otherwise the second side's line is
    // drawn over the first side's dot.
    this.drawLine(ctx, "left", this.leftStick);
    this.drawLine(ctx, "right", this.rightStick);
    this.drawDot(ctx, "left", this.leftStick);
    this.drawDot(ctx, "right", this.rightStick);
  }

  private drawLine(ctx: CanvasRenderingContext2D, side: Side, stick: { x: number; y: number }) {
    const radius = this.circle.radius;
    ctx.strokeStyle = SIDE_LINE_COLOR[side];
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(stick.x * radius, stick.y * radius);
    ctx.stroke();
  }

  private drawDot(ctx: CanvasRenderingContext2D, side: Side, stick: { x: number; y: number }) {
    const radius = this.circle.radius;
    ctx.fillStyle = SIDE_DOT_COLOR[side];
    ctx.beginPath();
    ctx.arc(stick.x * radius, stick.y * radius, 15, 0, Math.PI * 2);
    ctx.fill();
  }
}
