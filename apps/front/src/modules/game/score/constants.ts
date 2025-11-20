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
    hitBonus: 1,
  },
  [JudgmentKind.Good]: {
    hitValue: 75,
    hitBonusValue: 4,
    hitBonus: -33,
  },
  [JudgmentKind.Meh]: {
    hitValue: 20,
    hitBonusValue: 2,
    hitBonus: -66,
  },
  [JudgmentKind.Miss]: {
    hitValue: 0,
    hitBonusValue: 0,
    hitBonus: -Infinity,
  },
} as const satisfies Record<JudgmentKind, JudgementConfigType>;
