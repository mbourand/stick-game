import { JudgmentKind } from "./constants";

export class Judge {
  private perfectWindow: number;
  private goodWindow: number;
  private mehWindow: number;

  constructor(perfectWindow: number, goodWindow: number, mehWindow: number) {
    this.perfectWindow = perfectWindow;
    this.goodWindow = goodWindow;
    this.mehWindow = mehWindow;
  }

  public judge(timingOffset: number): JudgmentKind {
    const absOffset = Math.abs(timingOffset);
    if (absOffset <= this.perfectWindow) {
      return JudgmentKind.Perfect;
    } else if (absOffset <= this.goodWindow) {
      return JudgmentKind.Good;
    } else if (absOffset <= this.mehWindow) {
      return JudgmentKind.Meh;
    }

    return JudgmentKind.Miss;
  }

  public getPerfectWindow() {
    return this.perfectWindow;
  }

  public getGoodWindow() {
    return this.goodWindow;
  }

  public getMehWindow() {
    return this.mehWindow;
  }

  public getLargestWindow() {
    return Math.max(this.perfectWindow, this.goodWindow, this.mehWindow);
  }
}

export const DEFAULT_JUDGE = new Judge(30, 60, 100);
