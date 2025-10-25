export enum JudgmentKind {
  Perfect = "perfect",
  Good = "good",
  Miss = "miss",
}

export class ScoreCounter {
  private combo: number;
  private maxCombo: number;

  constructor() {
    this.combo = 0;
    this.maxCombo = 0;
  }

  // Quand tu hit
  public addNormalHit(judgmentKind: JudgmentKind) {
    if (judgmentKind === JudgmentKind.Miss) {
      this.combo = 0;
      return;
    }

    this.incrementCombo();
  }

  // Après avoir hit, toutes les frames où la hold note est tenue
  public addHoldNoteTick() {
    this.incrementCombo();
  }

  private incrementCombo() {
    this.combo += 1;
    this.maxCombo = Math.max(this.combo, this.maxCombo);
  }
}
