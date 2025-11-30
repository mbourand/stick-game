import z from "zod";
import { UserSchemas } from "./user.schemas";
import { makeDatabaseSchemas } from "./schema.factory";
import { ScoreModel } from "../generated/client/models";

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
}) satisfies z.ZodType<ScoreModel>;

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

const _RawRet = ScoreSchemas.raw();
const _SerializedRawRet = ScoreSchemas.serialized.raw();
const _PrivateRet = ScoreSchemas.private();
const _SerializedPrivateRet = ScoreSchemas.serialized.private();
const _PublicRet = ScoreSchemas.public();
const _SerializedPublicRet = ScoreSchemas.serialized.public();

export type RawScoreType = z.infer<typeof _RawRet>;
export type SerializedScoreType = z.infer<typeof _SerializedRawRet>;
export type PrivateScoreType = z.infer<typeof _PrivateRet>;
export type SerializedPrivateScoreType = z.infer<typeof _SerializedPrivateRet>;
export type PublicScoreType = z.infer<typeof _PublicRet>;
export type SerializedPublicScoreType = z.infer<typeof _SerializedPublicRet>;
