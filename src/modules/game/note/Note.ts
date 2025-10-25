import type { EventManager } from "../events/EventManager";
import { NoteReachedEdgeEvent } from "../events/impl/NoteReachedEdgeEvent";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEventType";
import { JudgmentKind } from "../score/ScoreCounter";
import type { NoteColor } from "./NoteColor";

export abstract class BaseNote {
  public abstract update(deltaTime: number): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
}

export class Note extends BaseNote {
  private timeToReachEdge: number;
  private elapsedTime: number;
  private circleRadius: number;
  private color: NoteColor;
  private angle: number;
  private angleSpan: number;
  private eventManager: EventManager;
  private bestJudgmentSoFar: JudgmentKind;

  constructor(
    eventManager: EventManager,
    timeToReachEdge: number,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
  ) {
    super();
    this.eventManager = eventManager;
    this.timeToReachEdge = timeToReachEdge;
    this.circleRadius = circleRadius;
    this.elapsedTime = 0;
    this.color = color;
    this.angle = angle;
    this.angleSpan = angleSpan;
    this.bestJudgmentSoFar = JudgmentKind.Miss;
  }

  private getProgress(): number {
    return Math.min(this.elapsedTime / this.timeToReachEdge, 1);
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    const progress = this.getProgress();
    if (progress === 1) {
      this.eventManager.emit("onNoteReachedEdge", NoteReachedEdgeEvent(this));
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const progress = this.getProgress();
    const radius = this.circleRadius * progress;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, this.getStartAngle(), this.getEndAngle());
    ctx.stroke();
  }

  public getColor() {
    return this.color;
  }

  public getStartAngle() {
    return (this.angle - this.angleSpan / 2) % (Math.PI * 2);
  }

  public getEndAngle() {
    return (this.angle + this.angleSpan / 2) % (Math.PI * 2);
  }

  public registerNewHit(judgmentKind: JudgmentKind) {
    if (judgmentKind === JudgmentKind.Perfect) {
      this.bestJudgmentSoFar = JudgmentKind.Perfect;
    } else if (judgmentKind === JudgmentKind.Good && this.bestJudgmentSoFar !== JudgmentKind.Perfect) {
      this.bestJudgmentSoFar = JudgmentKind.Good;
    }
  }
}
