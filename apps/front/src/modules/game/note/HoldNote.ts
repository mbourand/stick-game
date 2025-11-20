import type { Gamepad } from "../../gamepad/Gamepad";
import type { EventManager } from "../events/EventManager";
import { NoteHoldTickEvent } from "../events/impl/NoteHoldTickEvent";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEvent";
import { NoteWasJudgedEvent } from "../events/impl/NoteWasJudgedEvent";
import { DEFAULT_JUDGE } from "../judge/Judge";
import { BaseNote, Note } from "./Note";
import { NoteColor } from "./NoteColor";
import { NoteJudge } from "./NoteJudge";

class HoldNoteTail extends Note {
  private wasTailJudgementEventEmitted = false;
  private parentNote: HoldNote;

  constructor(
    eventManager: EventManager,
    timeToReachEdge: number,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
    gamepad: Gamepad,
    parentNote: HoldNote,
  ) {
    super(eventManager, timeToReachEdge, circleRadius, color, angle, angleSpan, gamepad);
    this.parentNote = parentNote;
  }

  public override update(deltaTime: number): void {
    if (!this.isActive) return;
    this.elapsedTime += deltaTime;
    this.noteJudge.update();

    if (this.noteJudge.isJudgementComplete() && !this.wasTailJudgementEventEmitted) {
      this.eventManager.emit("onNoteWasJudged", NoteWasJudgedEvent(this.parentNote, true));
      this.wasTailJudgementEventEmitted = true;
    }
  }

  public wasJudgementEventEmitted(): boolean {
    return this.wasTailJudgementEventEmitted;
  }

  public override render(): void {}
}

export class HoldNote extends BaseNote {
  private eventManager: EventManager;
  private circleRadius: number;
  private color: NoteColor;
  private angle: number;
  private angleSpan: number;
  private elapsedTime: number;
  private isActive: boolean;

  private holdDuration: number;
  private holdTicksHitTimes: number[];
  private currentHoldTickIndex: number;

  private headNoteJudge: NoteJudge;
  private timeToReachEdge: number;
  private wasHeadJudgementEventEmitted: boolean;

  private tailNote: HoldNoteTail;

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
    gamepad: Gamepad,
    holdTicksHitTimes: number[],
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
    this.wasHeadJudgementEventEmitted = false;
    this.headNoteJudge = new NoteJudge(this, DEFAULT_JUDGE, gamepad);
    this.isActive = true;
    this.holdTicksHitTimes = holdTicksHitTimes;
    this.currentHoldTickIndex = 0;

    this.tailNote = new HoldNoteTail(
      this.eventManager,
      this.timeToReachEdge + this.holdDuration,
      this.circleRadius,
      this.color,
      this.angle,
      this.angleSpan,
      gamepad,
      this,
    );
  }

  public getLifeTime() {
    return this.timeToReachEdge + this.holdDuration + DEFAULT_JUDGE.getLargestWindow();
  }

  public getProgressionTowardsEdge() {
    return Math.min(this.elapsedTime / this.timeToReachEdge, 1);
  }

  public hasRemainingHoldTicks() {
    return this.currentHoldTickIndex < this.holdTicksHitTimes.length;
  }

  public getHoldTickCount(options?: { includeTail: boolean }) {
    return this.holdTicksHitTimes.length + (options?.includeTail ? 1 : 0);
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    this.elapsedTime += deltaTime;

    this.headNoteJudge.update();
    this.tailNote.update(deltaTime);

    if (this.hasRemainingHoldTicks() && this.elapsedTime >= this.holdTicksHitTimes[this.currentHoldTickIndex]) {
      this.eventManager.emit("onNoteHoldTick", NoteHoldTickEvent(this));
      this.currentHoldTickIndex += 1;
    }

    if (this.headNoteJudge.isJudgementComplete() && !this.wasHeadJudgementEventEmitted) {
      this.eventManager.emit("onNoteWasJudged", NoteWasJudgedEvent(this));
      this.wasHeadJudgementEventEmitted = true;
    }

    const reachedEndOfLife =
      this.elapsedTime >= this.getLifeTime() &&
      this.wasHeadJudgementEventEmitted &&
      this.tailNote.wasJudgementEventEmitted();
    if (reachedEndOfLife) {
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
      this.isActive = false;
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
    const tailProgress = Math.min(Math.max(tailElapsed / this.timeToReachEdge, 0), 1);
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

  public getJudgement() {
    return this.headNoteJudge.getJudgement();
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
}
