import { JudgementConfigType, JUDGEMENTS_CONFIG, MAX_BONUS_VALUE, MAX_SCORE } from "@/modules/game/score/constants";
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
  private playedNotes = 0;

  private score: number;
  private maxScore: number;
  private bonus: number;

  constructor(noteCountToBeExpected: number) {
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.totalNotes = noteCountToBeExpected;
    this.maxScore = MAX_SCORE;
    this.bonus = MAX_BONUS_VALUE;
    this.playedNotes = 0;
  }

  public add(judgmentKind: JudgmentKind, options?: { updateBonus?: boolean }) {
    const { updateBonus = true } = options || {};

    this.hitTracker[judgmentKind] += 1;
    this.playedNotes += 1;

    if (judgmentKind === JudgmentKind.Miss) {
      this.combo = 0;
    } else {
      this.incrementCombo();
    }

    this.updateScore(JUDGEMENTS_CONFIG[judgmentKind], { updateBonus });
  }

  private updateScore({ hitValue, hitBonusValue, hitBonus }: JudgementConfigType, options?: { updateBonus?: boolean }) {
    if (this.totalNotes === 0) return;

    const { updateBonus = true } = options || {};
    if (updateBonus) {
      this.bonus = Math.max(0, Math.min(this.bonus + hitBonus, MAX_BONUS_VALUE));
    }
    const maxScorePerNote = this.maxScore / this.totalNotes;
    const maxJudgmentValue = JUDGEMENTS_CONFIG[JudgmentKind.Perfect].hitValue;

    const baseScore = maxScorePerNote * 0.5 * (hitValue / maxJudgmentValue);
    const bonusScore = maxScorePerNote * 0.5 * ((hitBonusValue * Math.sqrt(this.bonus)) / maxJudgmentValue);

    this.score += baseScore + bonusScore;
  }

  public addHoldNoteTick(holdTickCountInNote: number) {
    if (holdTickCountInNote === 0) return;

    this.updateScore({
      hitBonus: JUDGEMENTS_CONFIG[JudgmentKind.Perfect].hitBonus / holdTickCountInNote,
      hitBonusValue: JUDGEMENTS_CONFIG[JudgmentKind.Perfect].hitBonusValue / holdTickCountInNote,
      hitValue: JUDGEMENTS_CONFIG[JudgmentKind.Perfect].hitValue / holdTickCountInNote,
    });
    this.incrementCombo();
  }

  private incrementCombo() {
    this.combo += 1;
    this.maxCombo = Math.max(this.combo, this.maxCombo);
  }

  public getScore() {
    return Math.round(this.score);
  }

  public getCombo() {
    return this.combo;
  }

  public getMaxCombo() {
    return this.maxCombo;
  }

  public getAccuracy() {
    if (this.playedNotes === 0) return 0;

    const scoreWithoutCombo = Object.entries(this.hitTracker).reduce(
      (acc, [judgmentKind, count]) => acc + JUDGEMENTS_CONFIG[judgmentKind as unknown as JudgmentKind].hitValue * count,
      0,
    );
    const maxScoreWithoutCombo = this.playedNotes * JUDGEMENTS_CONFIG[JudgmentKind.Perfect].hitValue;
    return Math.round((scoreWithoutCombo / maxScoreWithoutCombo) * 10000) / 100;
  }

  public getJudgmentCount(kind: JudgmentKind) {
    return this.hitTracker[kind];
  }
}
