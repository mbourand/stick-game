import z from "zod";
import { UserSchemas } from "./user.schemas";
import { makeDatabaseSchemas } from "./schema.factory";

const RawSchema = z.strictObject({
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
});

const SerializedRawSchema = RawSchema.extend({
  submissionTime: z.iso.datetime(),
});

export const ScoreSchemas = makeDatabaseSchemas({
  rawSchema: RawSchema,
  serializedRawSchema: SerializedRawSchema,
  sensitiveKeys: [],
  privateKeys: [],
  relations: { player: UserSchemas },
  serializationFunctions: {
    submissionTime: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
  },
});

export type RawScoreType = z.infer<typeof RawSchema>;
export type SerializedScoreType = z.infer<typeof SerializedRawSchema>;
export type PrivateScoreType = z.infer<ReturnType<typeof ScoreSchemas.private>>;
export type SerializedPrivateScoreType = z.infer<ReturnType<typeof ScoreSchemas.serialized.private>>;
export type PublicScoreType = z.infer<ReturnType<typeof ScoreSchemas.public>>;
export type SerializedPublicScoreType = z.infer<ReturnType<typeof ScoreSchemas.serialized.public>>;
