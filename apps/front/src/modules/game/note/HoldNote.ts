import type { EventEmitter } from "../../utils/EventEmitter";
import type { BeatmapClock } from "../engine/BeatmapClock";
import type { TickContext } from "../engine/TickContext";
import type { GameplayEvents } from "../events/gameplayEvents";
import { NoteHoldTickEvent } from "../events/impl/NoteHoldTickEvent";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEvent";
import { NoteWasJudgedEvent } from "../events/impl/NoteWasJudgedEvent";
import type { InputSystem } from "../input/InputSystem";
import { DEFAULT_JUDGE } from "../judge/Judge";
import { BaseNote, Note } from "./Note";
import { NoteColor } from "./NoteColor";
import { NoteJudge } from "./NoteJudge";

class HoldNoteTail extends Note {
  private wasTailJudgementEventEmitted = false;
  private parentNote: HoldNote;

  constructor(
    eventManager: EventEmitter<GameplayEvents>,
    hitTime: number,
    scrollDuration: number,
    clock: BeatmapClock,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
    inputSystem: InputSystem,
    parentNote: HoldNote,
  ) {
    super(eventManager, hitTime, scrollDuration, clock, circleRadius, color, angle, angleSpan, inputSystem);
    this.parentNote = parentNote;
  }

  public override update(_tick: TickContext): void {
    if (!this.isActive) return;
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
  private eventManager: EventEmitter<GameplayEvents>;
  private clock: BeatmapClock;
  private circleRadius: number;
  private color: NoteColor;
  private angle: number;
  private angleSpan: number;
  private isActive: boolean;

  private hitTime: number;
  private scrollDuration: number;
  private holdDuration: number;
  private holdTicksHitTimes: number[];
  private currentHoldTickIndex: number;

  private headNoteJudge: NoteJudge;
  private wasHeadJudgementEventEmitted: boolean;

  private tailNote: HoldNoteTail;

  private static BODY_COLOR: Record<NoteColor, string> = {
    [NoteColor.Red]: "rgba(255, 35, 0, 0.5)",
    [NoteColor.Blue]: "rgba(30, 100, 255, 0.5)",
  };

  constructor(
    eventManager: EventEmitter<GameplayEvents>,
    hitTime: number,
    scrollDuration: number,
    clock: BeatmapClock,
    circleRadius: number,
    color: NoteColor,
    angle: number,
    angleSpan: number,
    holdDuration: number,
    inputSystem: InputSystem,
    holdTicksHitTimes: number[],
  ) {
    super();
    this.eventManager = eventManager;
    this.hitTime = hitTime;
    this.scrollDuration = scrollDuration;
    this.clock = clock;
    this.circleRadius = circleRadius;
    this.color = color;
    this.angle = angle;
    this.angleSpan = angleSpan;
    this.holdDuration = holdDuration;
    this.wasHeadJudgementEventEmitted = false;
    this.headNoteJudge = new NoteJudge(this, DEFAULT_JUDGE, inputSystem);
    this.isActive = true;
    this.holdTicksHitTimes = holdTicksHitTimes;
    this.currentHoldTickIndex = 0;

    this.tailNote = new HoldNoteTail(
      this.eventManager,
      this.hitTime + this.holdDuration,
      this.scrollDuration,
      this.clock,
      this.circleRadius,
      this.color,
      this.angle,
      this.angleSpan,
      inputSystem,
      this,
    );
  }

  private getEndOfLifeTime() {
    return this.hitTime + this.holdDuration + DEFAULT_JUDGE.getLargestWindow();
  }

  private getHeadProgress() {
    const remaining = this.hitTime - this.clock.now();
    return Math.min(Math.max(1 - remaining / this.scrollDuration, 0), 1);
  }

  private getTailProgress() {
    const remaining = this.hitTime + this.holdDuration - this.clock.now();
    return Math.min(Math.max(1 - remaining / this.scrollDuration, 0), 1);
  }

  public hasRemainingHoldTicks() {
    return this.currentHoldTickIndex < this.holdTicksHitTimes.length;
  }

  public getHoldTickCount(options?: { includeTail: boolean }) {
    return this.holdTicksHitTimes.length + (options?.includeTail ? 1 : 0);
  }

  public update(tick: TickContext): void {
    if (!this.isActive) return;

    const now = this.clock.now();

    this.headNoteJudge.update();
    this.tailNote.update(tick);

    while (this.hasRemainingHoldTicks() && now >= this.holdTicksHitTimes[this.currentHoldTickIndex]) {
      this.eventManager.emit("onNoteHoldTick", NoteHoldTickEvent(this));
      this.currentHoldTickIndex += 1;
    }

    if (this.headNoteJudge.isJudgementComplete() && !this.wasHeadJudgementEventEmitted) {
      this.eventManager.emit("onNoteWasJudged", NoteWasJudgedEvent(this));
      this.wasHeadJudgementEventEmitted = true;
    }

    const reachedEndOfLife =
      now >= this.getEndOfLifeTime() &&
      this.wasHeadJudgementEventEmitted &&
      this.tailNote.wasJudgementEventEmitted();
    if (reachedEndOfLife) {
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
      this.isActive = false;
    }
  }

  public isAlive(): boolean {
    return this.isActive;
  }

  public getStartAngle() {
    return (this.angle - this.angleSpan / 2) % (Math.PI * 2);
  }

  public getEndAngle() {
    return (this.angle + this.angleSpan / 2) % (Math.PI * 2);
  }

  private drawNoteHead(ctx: CanvasRenderingContext2D) {
    const radius = this.circleRadius * this.getHeadProgress();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, this.getStartAngle(), this.getEndAngle());
    ctx.stroke();
  }

  private drawHoldBody(ctx: CanvasRenderingContext2D) {
    const bodyRadius = this.circleRadius * this.getHeadProgress();
    const tailRadius = this.circleRadius * this.getTailProgress();

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
    return Math.max(this.hitTime - this.clock.now(), 0);
  }

  public getTimeSinceHittingEdge(): number {
    return Math.max(this.clock.now() - this.hitTime, 0);
  }

  public getDistanceFromPerfectTiming(): number {
    return Math.abs(this.clock.now() - this.hitTime);
  }
}
