import { GAME_CIRCLE_RADIUS } from "../utils/constants";

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

  public reverseEaseInOut(progress: number) {
    return (
      (Math.pow(progress, 3) - 2 * Math.pow(progress, 2) + progress) * 3 +
      (-2 * Math.pow(progress, 3) + 3 * Math.pow(progress, 2)) * 3 +
      (Math.pow(progress, 3) - Math.pow(progress, 2)) * 3
    );
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (this.isFinished()) return;

    const progress = Math.min(this.elapsedTime / this.duration, 1) * Math.PI;

    const amplitude = 10;
    const currentAmplitude = amplitude * Math.sin(progress);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = currentAmplitude;
    ctx.beginPath();
    ctx.arc(0, 0, GAME_CIRCLE_RADIUS + currentAmplitude, this.startAngle, this.endAngle);
    ctx.stroke();
  }
}
