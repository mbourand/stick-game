import type { EventManager } from "../events/EventManager";
import { NoteHoldTickEvent } from "../events/impl/NoteHoldTickEventType";
import { NoteReachedEdgeEvent } from "../events/impl/NoteReachedEdgeEvent";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEventType";
import { JudgmentKind } from "../score/ScoreCounter";
import { Clock } from "../utils/Clock";
import { BaseNote } from "./Note";
import { NoteColor } from "./NoteColor";

export class HoldNote extends BaseNote {
  private eventManager: EventManager;
  private timeToReachEdge: number;
  private circleRadius: number;
  private color: NoteColor;
  private angle: number;
  private angleSpan: number;
  private holdDuration: number;
  private elapsedTime: number;
  private wasReachedEdgeEventEmitted: boolean;
  private bestJudgmentSoFar: JudgmentKind;
  private holdTickClock: Clock;

  private static BODY_COLOR: Record<NoteColor, string> = {
    [NoteColor.Red]: "rgba(255, 35, 0, 0.5)",
    [NoteColor.Blue]: "rgba(30, 100, 255, 0.5)",
  };

  constructor(
    eventManager: EventManager,
    timeToReachEdge: number,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
    holdDuration: number,
    beatLength: number,
  ) {
    super();
    this.eventManager = eventManager;
    this.timeToReachEdge = timeToReachEdge;
    this.circleRadius = circleRadius;
    this.color = color;
    this.angle = angle;
    this.angleSpan = angleSpan;
    this.holdDuration = holdDuration;
    this.elapsedTime = 0;
    this.wasReachedEdgeEventEmitted = false;
    this.bestJudgmentSoFar = JudgmentKind.Miss;
    this.holdTickClock = new Clock(beatLength / 2);
  }

  public getLifeTime(): number {
    return this.timeToReachEdge + this.holdDuration;
  }

  public hasReachedEdge() {
    return this.elapsedTime >= this.timeToReachEdge;
  }

  public getProgressionTowardsEdge(): number {
    return Math.min(this.elapsedTime / this.timeToReachEdge, 1);
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    const shouldCheckHoldTick = this.holdTickClock.update(this.elapsedTime);
    if (shouldCheckHoldTick && this.hasReachedEdge() && this.wasReachedEdgeEventEmitted) {
      this.eventManager.emit("onNoteHoldTick", NoteHoldTickEvent(this));
    }

    if (this.hasReachedEdge() && !this.wasReachedEdgeEventEmitted) {
      this.eventManager.emit("onNoteReachedEdge", NoteReachedEdgeEvent(this));
      this.wasReachedEdgeEventEmitted = true;
    }

    const reachedEndOfLife = this.elapsedTime >= this.getLifeTime();
    if (reachedEndOfLife) {
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
    }
  }

  public getStartAngle() {
    return (this.angle - this.angleSpan / 2) % (Math.PI * 2);
  }

  public getEndAngle() {
    return (this.angle + this.angleSpan / 2) % (Math.PI * 2);
  }

  private drawNoteHead(ctx: CanvasRenderingContext2D) {
    const progress = this.getProgressionTowardsEdge();
    const radius = this.circleRadius * progress;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, this.getStartAngle(), this.getEndAngle());
    ctx.stroke();
  }

  private drawHoldBody(ctx: CanvasRenderingContext2D) {
    const progress = this.getProgressionTowardsEdge();
    const bodyRadius = this.circleRadius * progress;

    const tailElapsed = this.elapsedTime - this.holdDuration;
    const tailProgress = Math.max(tailElapsed / this.timeToReachEdge, 0);
    const tailRadius = this.circleRadius * tailProgress;

    ctx.fillStyle = HoldNote.BODY_COLOR[this.color];
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius, this.getStartAngle(), this.getEndAngle());
    ctx.arc(0, 0, tailRadius, this.getEndAngle(), this.getStartAngle(), true);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, tailRadius, this.getStartAngle(), this.getEndAngle());
    ctx.stroke();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.drawHoldBody(ctx);
    this.drawNoteHead(ctx);
  }

  public getColor() {
    return this.color;
  }

  public registerNewHit(judgmentKind: JudgmentKind) {
    if (judgmentKind === JudgmentKind.Perfect) {
      this.bestJudgmentSoFar = JudgmentKind.Perfect;
    } else if (judgmentKind === JudgmentKind.Good && this.bestJudgmentSoFar !== JudgmentKind.Perfect) {
      this.bestJudgmentSoFar = JudgmentKind.Good;
    }
  }

  public getJudgement() {
    return this.bestJudgmentSoFar;
  }
}
