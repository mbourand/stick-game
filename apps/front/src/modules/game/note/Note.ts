import type { EventEmitter } from "../../utils/EventEmitter";
import type { BeatmapClock } from "../engine/BeatmapClock";
import type { Entity } from "../engine/Entity";
import type { TickContext } from "../engine/TickContext";
import type { GameplayEvents } from "../events/gameplayEvents";
import { NoteReachedEndOfLifeEvent } from "../events/impl/NoteReachedEndOfLifeEvent";
import { NoteWasJudgedEvent } from "../events/impl/NoteWasJudgedEvent";
import type { InputSystem } from "../input/InputSystem";
import { DEFAULT_JUDGE } from "../judge/Judge";
import { NoteColor } from "./NoteColor";
import { NoteJudge } from "./NoteJudge";

export abstract class BaseNote implements Entity {
  public abstract update(tick: TickContext): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
  public abstract isAlive(): boolean;
}

export class Note extends BaseNote {
  protected hitTime: number;
  protected scrollDuration: number;
  protected clock: BeatmapClock;
  protected circleRadius: number;
  protected color: NoteColor;
  protected angle: number;
  protected angleSpan: number;
  protected eventManager: EventEmitter<GameplayEvents>;
  protected noteJudge: NoteJudge;
  protected isActive: boolean;

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
    this.noteJudge = new NoteJudge(this, DEFAULT_JUDGE, inputSystem);
    this.isActive = true;
  }

  protected getProgress(): number {
    const remaining = this.hitTime - this.clock.now();
    return Math.min(Math.max(1 - remaining / this.scrollDuration, 0), 1);
  }

  public update(_tick: TickContext) {
    if (!this.isActive) return;

    this.noteJudge.update();

    if (this.noteJudge.isJudgementComplete()) {
      this.eventManager.emit("onNoteWasJudged", NoteWasJudgedEvent(this));
      this.eventManager.emit("onNoteReachedEndOfLife", NoteReachedEndOfLifeEvent(this));
      this.isActive = false;
    }
  }

  public isAlive(): boolean {
    return this.isActive;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const radius = this.circleRadius * this.getProgress();
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
    return Math.max(this.hitTime - this.clock.now(), 0);
  }

  public getTimeSinceHittingEdge(): number {
    return Math.max(this.clock.now() - this.hitTime, 0);
  }

  public getDistanceFromPerfectTiming(): number {
    return Math.abs(this.clock.now() - this.hitTime);
  }

  public getJudgement(): number {
    return this.noteJudge.getJudgement();
  }
}
