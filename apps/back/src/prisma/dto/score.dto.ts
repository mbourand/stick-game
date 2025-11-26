import z from "zod";
import { DatabaseSchemasType } from "./types";
import { UserSchemas } from "./user.dto";
import { relationSchema } from "./utils.schemas";

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
  player: relationSchema(UserSchemas.raw),
});

const SerializedRawSchema = RawSchema.extend({
  submissionTime: z.iso.datetime(),
  player: relationSchema(UserSchemas.serialized.raw),
});

const PrivateScoreSchema = RawSchema.extend({ player: relationSchema(UserSchemas.private) });
const SerializedPrivateScoreSchema = SerializedRawSchema.extend({
  player: relationSchema(UserSchemas.serialized.private),
});
const PublicScoreSchema = PrivateScoreSchema.extend({ player: relationSchema(UserSchemas.public) });
const SerializedPublicScoreSchema = SerializedPrivateScoreSchema.extend({
  player: relationSchema(UserSchemas.serialized.public),
});

export type RawScoreType = z.infer<typeof RawSchema>;
export type SerializedScoreType = z.infer<typeof SerializedRawSchema>;
export type PrivateScoreType = z.infer<typeof PrivateScoreSchema>;
export type SerializedPrivateScoreType = z.infer<typeof SerializedPrivateScoreSchema>;
export type PublicScoreType = z.infer<typeof PublicScoreSchema>;
export type SerializedPublicScoreType = z.infer<typeof SerializedPublicScoreSchema>;

const serializePublic = (score: RawScoreType | PrivateScoreType | PublicScoreType): SerializedPublicScoreType => {
  const publicScore = toPublic(score);
  return {
    ...publicScore,
    submissionTime: publicScore.submissionTime.toISOString(),
    player: publicScore.player && UserSchemas.serializePublic(publicScore.player),
  };
};

const serializePrivate = (score: PrivateScoreType): SerializedPrivateScoreType => {
  return {
    ...score,
    submissionTime: score.submissionTime.toISOString(),
    player: score.player && UserSchemas.serializePrivate(score.player),
  };
};

const deserializePublic = (score: SerializedPublicScoreType): PublicScoreType => {
  return {
    ...score,
    submissionTime: new Date(score.submissionTime),
    player: score.player && UserSchemas.deserializePublic(score.player),
  };
};

const deserializePrivate = (score: SerializedPrivateScoreType): PrivateScoreType => {
  return {
    ...score,
    submissionTime: new Date(score.submissionTime),
    player: score.player && UserSchemas.deserializePrivate(score.player),
  };
};

const toPrivate = (score: RawScoreType | PrivateScoreType): PrivateScoreType => {
  const base = PrivateScoreSchema.omit({ player: true }).strip().parse(score);
  return {
    ...base,
    player: score.player && UserSchemas.toPrivate(score.player),
  };
};

const toPublic = (score: RawScoreType | PrivateScoreType | PublicScoreType): PublicScoreType => {
  const base = z.object(PublicScoreSchema.shape).omit({ player: true }).parse(score);
  return {
    ...base,
    player: score.player && UserSchemas.toPublic(score.player),
  };
};

type SchemasType = DatabaseSchemasType<
  RawScoreType,
  never,
  never,
  "player",
  SerializedScoreType,
  { player: typeof UserSchemas },
  PrivateScoreType,
  SerializedPrivateScoreType,
  PublicScoreType,
  SerializedPublicScoreType
>;

export const ScoreSchemas = {
  raw: RawSchema,
  private: PrivateScoreSchema,
  public: PublicScoreSchema,
  serialized: {
    raw: SerializedRawSchema,
    private: SerializedPrivateScoreSchema,
    public: SerializedPublicScoreSchema,
  },
  serializePrivate,
  deserializePrivate,
  serializePublic,
  deserializePublic,
  toPrivate,
  toPublic,
} satisfies SchemasType;
