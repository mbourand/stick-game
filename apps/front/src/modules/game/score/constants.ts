import { JudgmentKind } from "@/modules/game/judge/constants";

export const MAX_SCORE = 1_000_000;
export const MAX_BONUS_VALUE = 100;

export type JudgementConfigType = {
  hitValue: number;
  hitBonusValue: number;
  hitBonus: number;
};

export const JUDGEMENTS_CONFIG = {
  [JudgmentKind.Perfect]: {
    hitValue: 300,
    // Mandatory for SS scores to give exactly MAX_SCORE
    hitBonusValue: 300 / Math.sqrt(MAX_BONUS_VALUE),
    hitBonus: 2.0,
  },
  [JudgmentKind.Good]: {
    hitValue: 100,
    hitBonusValue: 8,
    hitBonus: -24,
  },
  [JudgmentKind.Meh]: {
    hitValue: 50,
    hitBonusValue: 4,
    hitBonus: -44,
  },
  [JudgmentKind.Miss]: {
    hitValue: 0,
    hitBonusValue: 0,
    hitBonus: -Infinity,
  },
} as const satisfies Record<JudgmentKind, JudgementConfigType>;
