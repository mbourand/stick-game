import type { Gamepad } from "../../gamepad/Gamepad";
import { isHittingNote } from "../judge/hit-check";
import { JudgmentKind } from "../judge/constants";
import type { Judge } from "../judge/Judge";
import type { HoldNote } from "./HoldNote";
import type { Note } from "./Note";
import { NoteColor } from "./NoteColor";

export class NoteJudge {
  private note: Note | HoldNote;
  private judge: Judge;
  private bestJudgmentSoFar: JudgmentKind;
  private bestHitTimingOffset: number;
  private hasCompletedJudgement: boolean;
  private gamepad: Gamepad;

  constructor(note: Note | HoldNote, judge: Judge, gamepad: Gamepad) {
    this.note = note;
    this.judge = judge;
    this.bestJudgmentSoFar = JudgmentKind.Miss;
    this.hasCompletedJudgement = false;
    this.gamepad = gamepad;
    this.bestHitTimingOffset = Infinity;
  }

  public update() {
    const isBestHitUnbeatable = this.bestHitTimingOffset < this.note.getTimeSinceHittingEdge();
    const isAlreadyPerfectHit = this.bestJudgmentSoFar === JudgmentKind.Perfect;
    const hasPassedPerfectTimingFrame = this.note.getTimeSinceHittingEdge() > 0;
    // Early exit if you cant beat your best hit anymore or early exit on the perfect hit frame if you already have a perfect hit
    if (isBestHitUnbeatable || (isAlreadyPerfectHit && hasPassedPerfectTimingFrame)) {
      this.hasCompletedJudgement = true;
      return;
    }

    if (this.hasCompletedJudgement) return;

    const hasPassedHitWindow = this.note.getTimeSinceHittingEdge() > this.judge.getLargestWindow();
    if (hasPassedHitWindow) {
      this.hasCompletedJudgement = true;
      return;
    }

    const isBeforeHitWindow = this.note.getTimeBeforeReachingEdge() > this.judge.getLargestWindow();
    if (isBeforeHitWindow) return;

    const stickSide = this.note.getColor() === NoteColor.Red ? "left" : "right";
    const stickDotPosition = this.gamepad.getClampedStickPosition(stickSide);
    if (!isHittingNote(stickDotPosition, this.note)) return;

    this.updateJudgement();
  }

  private updateJudgement() {
    const timingOffset = this.note.getDistanceFromPerfectTiming();
    const judgmentKind = this.judge.judge(timingOffset);
    this.bestHitTimingOffset = Math.min(this.bestHitTimingOffset, timingOffset);
    this.bestJudgmentSoFar = Math.max(this.bestJudgmentSoFar, judgmentKind);
  }

  public getJudgement(): JudgmentKind {
    return this.bestJudgmentSoFar;
  }

  public isJudgementComplete(): boolean {
    return this.hasCompletedJudgement;
  }
}
