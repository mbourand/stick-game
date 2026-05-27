import type { Entity } from "../engine/Entity";
import type { ScoreCounter } from "../score/ScoreCounter";

export class ScoreHUDEntity implements Entity {
  private scoreCounter: ScoreCounter;

  constructor(scoreCounter: ScoreCounter) {
    this.scoreCounter = scoreCounter;
  }

  public update(): void {}

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "64px Rostex";
    ctx.fillText(this.scoreCounter.getCombo().toString(), 0, 0);

    ctx.font = "22px Rostex";
    ctx.fillText(this.scoreCounter.getScore().toString().padStart(6, "0"), 0, 48);
    ctx.fillText(this.scoreCounter.getAccuracy() + "%", 0, 96);
  }
}
