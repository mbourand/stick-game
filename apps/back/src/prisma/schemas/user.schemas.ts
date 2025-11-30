import z from "zod";
import { makeDatabaseSchemas } from "./schema.factory";
import { UserModel } from "../generated/client/models";

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
}) satisfies z.ZodType<UserModel>;

const SerializedRawSchema = RawSchema.extend({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const UserSchemas = makeDatabaseSchemas({
  rawSchema: RawSchema,
  serializedRawSchema: SerializedRawSchema,
  sensitiveKeys: ["hashedPassword"],
  privateKeys: ["email", "isEmailVerified"],
  relations: {},
  serializationFunctions: {
    createdAt: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
    updatedAt: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
  },
});

export type RawUserType = z.infer<ReturnType<typeof UserSchemas.raw>>;
export type SerializedUserType = z.infer<ReturnType<typeof UserSchemas.serialized.raw>>;
export type PrivateUserType = z.infer<ReturnType<typeof UserSchemas.private>>;
export type SerializedPrivateUserType = z.infer<ReturnType<typeof UserSchemas.serialized.private>>;
export type PublicUserType = z.infer<ReturnType<typeof UserSchemas.public>>;
export type SerializedPublicUserType = z.infer<ReturnType<typeof UserSchemas.serialized.public>>;
