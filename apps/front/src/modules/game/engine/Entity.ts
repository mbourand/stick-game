import type { TickContext } from "./TickContext";

export interface Entity {
  update(tick: TickContext): void;
  render(ctx: CanvasRenderingContext2D): void;
  isAlive?(): boolean;
  destroy?(): void;
}
