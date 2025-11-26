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
const PublicSchema = PrivateSchema.omit({ email: true });
const SerializedPublicSchema = SerializedPrivateSchema.omit({ email: true });

export type RawUserType = z.infer<typeof RawSchema>;
export type SerializedUserType = z.infer<typeof SerializedRawSchema>;
export type PrivateUserType = z.infer<typeof PrivateSchema>;
export type SerializedPrivateUserType = z.infer<typeof SerializedPrivateSchema>;
export type PublicUserType = z.infer<typeof PublicSchema>;
export type SerializedPublicUserType = z.infer<typeof SerializedPublicSchema>;

type SchemasType = DatabaseSchemasType<
  UserModel,
  "hashedPassword",
  "email",
  SerializedUserType,
  PrivateUserType,
  SerializedPrivateUserType,
  PublicUserType,
  SerializedPublicUserType
>;

const serializeUser = <T extends Pick<UserModel, "createdAt" | "updatedAt">>(user: T) => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

const deserializeUser = <T extends Pick<SerializedUserType, "createdAt" | "updatedAt">>(user: T) => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
});

export const UserSchemas: SchemasType = {
  raw: RawSchema,
  serializedRaw: SerializedRawSchema,
  private: PrivateSchema,
  serializedPrivate: SerializedPrivateSchema,
  public: PublicSchema,
  serializedPublic: SerializedPublicSchema,
  serializePrivateSchema: serializeUser,
  serializePublicSchema: serializeUser,
  deserializePrivateSchema: deserializeUser,
  deserializePublicSchema: deserializeUser,
};
