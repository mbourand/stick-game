import type { Gamepad } from "../../gamepad/Gamepad";
import type { EventManager } from "../events/EventManager";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEvent";
import { NoteWasJudgedEvent } from "../events/impl/NoteWasJudgedEvent";
import { DEFAULT_JUDGE } from "../judge/Judge";
import { NoteColor } from "./NoteColor";
import { NoteJudge } from "./NoteJudge";

export abstract class BaseNote {
  public abstract update(deltaTime: number): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
}

export class Note extends BaseNote {
  protected timeToReachEdge: number;
  protected elapsedTime: number;
  protected circleRadius: number;
  protected color: NoteColor;
  protected angle: number;
  protected angleSpan: number;
  protected eventManager: EventManager;
  protected noteJudge: NoteJudge;
  protected isActive: boolean;

  constructor(
    eventManager: EventManager,
    timeToReachEdge: number,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
    gamepad: Gamepad,
  ) {
    super();
    this.eventManager = eventManager;
    this.timeToReachEdge = timeToReachEdge;
    this.circleRadius = circleRadius;
    this.elapsedTime = 0;
    this.color = color;
    this.angle = angle;
    this.angleSpan = angleSpan;
    this.noteJudge = new NoteJudge(this, DEFAULT_JUDGE, gamepad);
    this.isActive = true;
  }

  private getProgress(): number {
    return Math.min(this.elapsedTime / this.timeToReachEdge, 1);
  }

  public update(deltaTime: number) {
    if (!this.isActive) return;

    this.elapsedTime += deltaTime;

    this.noteJudge.update();

    if (this.noteJudge.isJudgementComplete()) {
      this.eventManager.emit("onNoteWasJudged", NoteWasJudgedEvent(this));
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
      this.isActive = false;
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

  public getTimeBeforeReachingEdge(): number {
    return Math.max(this.timeToReachEdge - this.elapsedTime, 0);
  }

  public getTimeSinceHittingEdge(): number {
    return Math.max(this.elapsedTime - this.timeToReachEdge, 0);
  }

  public getDistanceFromPerfectTiming(): number {
    return Math.abs(this.elapsedTime - this.timeToReachEdge);
  }

  public getJudgement(): number {
    return this.noteJudge.getJudgement();
  }
}
