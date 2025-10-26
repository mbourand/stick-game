import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../utils/constants";

export class NoteHitFlair {
  private startAngle: number;
  private endAngle: number;
  private elapsedTime: number;
  private duration: number;
  private color: string;

  constructor(startAngle: number, endAngle: number, duration: number, color: string) {
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.duration = duration;
    this.elapsedTime = 0;
    this.color = color;
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;
  }

  public isFinished(): boolean {
    return this.elapsedTime >= this.duration;
  }

  public jumpEasing(progress: number) {
    return Math.min(Math.max(-Math.abs(Math.pow(2 * progress - 1, 3)) + 1, 0), 1);
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isFinished()) return;

    const progress = Math.min(this.elapsedTime / this.duration, 1) * Math.PI;

    const amplitude = 10;
    const currentAmplitude = amplitude * this.jumpEasing(progress);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = currentAmplitude;
    ctx.beginPath();
    ctx.arc(0, 0, GAME_CIRCLE_DISPLAYED_RADIUS - currentAmplitude, this.startAngle, this.endAngle);
    ctx.stroke();
  }
}
