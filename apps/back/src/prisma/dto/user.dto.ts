import z from "zod";
import { UserModel } from "../generated/client/models";
import { DatabaseSchemasType } from "./types";

const RawSchema = z.strictObject({
  id: z.uuid(),
  username: z.string().min(3).max(32),
  email: z.email(),
  isEmailVerified: z.boolean(),
  hashedPassword: z.string(),
  totalScore: z.number().int().nonnegative(),
  totalSubmittedScores: z.number().int().nonnegative(),
  accuracySum: z.number().nonnegative(),
  performancePoints: z.number().nonnegative(),
  ssCount: z.number().int().nonnegative(),
  fullComboCount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const SerializedRawSchema = RawSchema.extend({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const PrivateSchema = RawSchema.omit({ hashedPassword: true });
const SerializedPrivateSchema = SerializedRawSchema.omit({ hashedPassword: true });
const PublicSchema = PrivateSchema.omit({ email: true, isEmailVerified: true });
const SerializedPublicSchema = SerializedPrivateSchema.omit({ email: true, isEmailVerified: true });

export type RawUserType = z.infer<typeof RawSchema>;
export type SerializedUserType = z.infer<typeof SerializedRawSchema>;
export type PrivateUserType = z.infer<typeof PrivateSchema>;
export type SerializedPrivateUserType = z.infer<typeof SerializedPrivateSchema>;
export type PublicUserType = z.infer<typeof PublicSchema>;
export type SerializedPublicUserType = z.infer<typeof SerializedPublicSchema>;

type SchemasType = DatabaseSchemasType<
  UserModel,
  "hashedPassword",
  "email" | "isEmailVerified",
  never,
  SerializedUserType,
  {},
  PrivateUserType,
  SerializedPrivateUserType,
  PublicUserType,
  SerializedPublicUserType
>;

const serializePublic = (user: PublicUserType | PrivateUserType | RawUserType): SerializedPublicUserType => {
  const publicUser = toPublic(user);
  return {
    ...publicUser,
    createdAt: publicUser.createdAt.toISOString(),
    updatedAt: publicUser.updatedAt.toISOString(),
  };
};

const serializePrivate = (user: PrivateUserType | RawUserType): SerializedPrivateUserType => {
  const privateUser = toPrivate(user);
  return {
    ...privateUser,
    createdAt: privateUser.createdAt.toISOString(),
    updatedAt: privateUser.updatedAt.toISOString(),
  };
};

const deserializePublic = (user: SerializedPublicUserType): PublicUserType => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
});

const deserializePrivate = (user: SerializedPrivateUserType): PrivateUserType => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
});

const toPrivate = (user: RawUserType | PrivateUserType): PrivateUserType => {
  return z.object(PrivateSchema.shape).parse(user);
};

const toPublic = (user: RawUserType | PrivateUserType | PublicUserType): PublicUserType => {
  return z.object(PublicSchema.shape).parse(user);
};

export const UserSchemas = {
  raw: RawSchema,
  private: PrivateSchema,
  public: PublicSchema,
  serialized: {
    raw: SerializedRawSchema,
    private: SerializedPrivateSchema,
    public: SerializedPublicSchema,
  },
  serializePrivate,
  serializePublic,
  deserializePrivate,
  deserializePublic,
  toPrivate,
  toPublic,
} satisfies SchemasType;
