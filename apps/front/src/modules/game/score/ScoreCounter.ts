import { JudgmentKind } from "../judge/constants";

export class ScoreCounter {
  private combo: number;
  private maxCombo: number;

  private hitTracker: Record<JudgmentKind, number> = {
    [JudgmentKind.Perfect]: 0,
    [JudgmentKind.Good]: 0,
    [JudgmentKind.Meh]: 0,
    [JudgmentKind.Miss]: 0,
  };
  private totalNotes: number;

  private score: number;

  constructor() {
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.totalNotes = 0;
  }

  public add(judgmentKind: JudgmentKind) {
    this.hitTracker[judgmentKind] += 1;
    this.totalNotes += 1;

    if (judgmentKind === JudgmentKind.Miss) {
      this.combo = 0;
      return;
    }

    this.score += judgmentKind * this.combo;
    this.incrementCombo();
  }

  public addHoldNoteTick() {
    this.score += JudgmentKind.Meh * this.combo;
    this.incrementCombo();
  }

  private incrementCombo() {
    this.combo += 1;
    this.maxCombo = Math.max(this.combo, this.maxCombo);
  }

  public getScore() {
    return this.score;
  }

  public getCombo() {
    return this.combo;
  }

  public getMaxCombo() {
    return this.maxCombo;
  }

  public getAccuracy() {
    if (this.totalNotes === 0) return 0;

    const scoreWithoutCombo = Object.entries(this.hitTracker).reduce(
      (acc, [judgmentKind, count]) => acc + (judgmentKind as unknown as JudgmentKind) * count,
      0,
    );
    const maxScoreWithoutCombo = this.totalNotes * JudgmentKind.Perfect;
    return Math.round((scoreWithoutCombo / maxScoreWithoutCombo) * 10000) / 100;
  }
}
