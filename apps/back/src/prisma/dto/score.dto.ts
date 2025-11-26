import z from "zod";
import { ScoreModel } from "../generated/client/models";

export const UnsafeScoreSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  playerName: z.string().min(1).max(32).nullable(),
  playerId: z.uuid().nullable(),
  beatmapId: z.string().min(1).max(32),
  score: z.number().int().nonnegative(),
  maxCombo: z.number().int().nonnegative(),
  accuracy: z.number().nonnegative(),
  missCount: z.number().int().nonnegative(),
  mehCount: z.number().int().nonnegative(),
  goodCount: z.number().int().nonnegative(),
  greatCount: z.number().int().nonnegative(),
  perfectCount: z.number().int().nonnegative(),
  submissionTime: z.date(),
  scoreVersion: z.number().int().nonnegative(),
}) satisfies z.ZodType<ScoreModel>;

export const SerializedScoreSchema = ScoreSchema.extend({
  submissionTime: z.iso.datetime(),
});

export type SerializedScoreType = z.infer<typeof SerializedScoreSchema>;

export const serializeScore = (score: ScoreModel): SerializedScoreType => ({
  ...score,
  submissionTime: score.submissionTime.toISOString(),
});

export const deserializeScore = (score: SerializedScoreType): ScoreModel => ({
  ...score,
  submissionTime: new Date(score.submissionTime),
});
