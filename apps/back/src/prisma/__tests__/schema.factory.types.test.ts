import z from "zod";
import { makeDatabaseSchemas } from "../schemas/schema.factory";

type Expect<T extends true> = T;
type Not<T extends false> = T extends true ? false : true;

type ShapesMatch<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

type TypesMatch<T, U> = ShapesMatch<T, U> extends true
  ? ShapesMatch<keyof T, keyof U> extends true
    ? true
    : false
  : false;

const BaseSchema = z.object({
  username: z.string(),
  email: z.string(),
  password: z.string().min(8),
  birthDate: z.date(),
  createdAt: z.date(),
});

const SerializedSchema = BaseSchema.extend({
  createdAt: z.iso.datetime(),
  birthDate: z.iso.datetime(),
});

const DatabaseSchema = makeDatabaseSchemas({
  rawSchema: BaseSchema,
  serializedRawSchema: SerializedSchema,
  sensitiveKeys: ["password"],
  privateKeys: ["email", "birthDate"],
  relations: {},
  serializationFunctions: {
    createdAt: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
    birthDate: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
  },
});

const DatabaseSchemaWithRelation = makeDatabaseSchemas({
  rawSchema: BaseSchema,
  serializedRawSchema: SerializedSchema,
  sensitiveKeys: ["password"],
  privateKeys: ["email", "birthDate"],
  relations: { friend: DatabaseSchema },
  serializationFunctions: {
    createdAt: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
    birthDate: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
  },
});

/**
 * =========================================================
 * SCHEMA TESTS
 * =========================================================
 */

const rawSchema = DatabaseSchema.raw();
type Should_Give_Every_Key_In_Raw_Schema = Expect<
  TypesMatch<
    z.infer<typeof rawSchema>,
    { username: string; email: string; password: string; createdAt: Date; birthDate: Date }
  >
>;

const privateSchema = DatabaseSchema.private();
type Should_Remove_Sensitive_Keys_In_Private_Schema = Expect<
  TypesMatch<
    z.infer<typeof privateSchema>,
    { username: string; email: string; password?: never; createdAt: Date; birthDate: Date }
  >
>;

const publicSchema = DatabaseSchema.public();
type Should_Remove_Private_And_Sensitive_Keys_In_Public_Schema = Expect<
  TypesMatch<
    z.infer<typeof publicSchema>,
    { username: string; email?: never; password?: never; createdAt: Date; birthDate?: never }
  >
>;

const serializedRawSchema = DatabaseSchema.serialized.raw();
type Should_Serialize_All_Fields_In_Serialized_Raw_Schema = Expect<
  TypesMatch<
    z.infer<typeof serializedRawSchema>,
    { username: string; email: string; password: string; createdAt: string; birthDate: string }
  >
>;

const serializedPrivateSchema = DatabaseSchema.serialized.private();
type Should_Serialize_And_Remove_Sensitive_Keys_In_Serialized_Private_Schema = Expect<
  TypesMatch<
    z.infer<typeof serializedPrivateSchema>,
    { username: string; email: string; password?: never; createdAt: string; birthDate: string }
  >
>;

const serializedPublicSchema = DatabaseSchema.serialized.public();
type Should_Serialize_And_Remove_Private_And_Sensitive_Keys_In_Serialized_Public_Schema = Expect<
  TypesMatch<
    z.infer<typeof serializedPublicSchema>,
    { username: string; email?: never; password?: never; createdAt: string; birthDate?: never }
  >
>;

const resultForNonRequestedRelation = DatabaseSchemaWithRelation.public();
type Should_Not_Include_Relation_If_Not_Requested = Expect<
  TypesMatch<
    z.infer<typeof resultForNonRequestedRelation>,
    { username: string; email?: never; password?: never; createdAt: Date; birthDate?: never; friend?: never }
  >
>;

const resultForRequestedRawRelation = DatabaseSchemaWithRelation.public({ withRelations: { friend: "raw" } });
type Should_Include_Raw_Relation_If_Requested = Expect<
  TypesMatch<
    z.infer<typeof resultForRequestedRawRelation>,
    {
      username: string;
      email?: never;
      password?: never;
      createdAt: Date;
      birthDate?: never;
      friend: {
        username: string;
        email: string;
        password: string;
        createdAt: Date;
        birthDate: Date;
      };
    }
  >
>;

const resultForRequestedPrivateRelation = DatabaseSchemaWithRelation.public({ withRelations: { friend: "private" } });
type Should_Include_Private_Relation_If_Requested = Expect<
  TypesMatch<
    z.infer<typeof resultForRequestedPrivateRelation>,
    {
      username: string;
      email?: never;
      password?: never;
      createdAt: Date;
      birthDate?: never;
      friend: {
        username: string;
        email: string;
        password?: never;
        createdAt: Date;
        birthDate: Date;
      };
    }
  >
>;

const resultForRequestedPublicRelation = DatabaseSchemaWithRelation.public({ withRelations: { friend: "public" } });
type Should_Include_Public_Relation_If_Requested = Expect<
  TypesMatch<
    z.infer<typeof resultForRequestedPublicRelation>,
    {
      username: string;
      email?: never;
      password?: never;
      createdAt: Date;
      birthDate?: never;
      friend: {
        username: string;
        email?: never;
        password?: never;
        createdAt: Date;
        birthDate?: never;
      };
    }
  >
>;

/**
 * ========================================================
 * CONVERSION TESTS
 * ========================================================
 */

const rawDeserializedKeysOnly = DatabaseSchemaWithRelation.rawDeserializedKeysOnly({});
type Should_Return_All_Keys_When_Converting_To_Raw = Expect<
  TypesMatch<
    typeof rawDeserializedKeysOnly,
    {
      username: string;
      email: string;
      password: string;
      createdAt: Date;
      birthDate: Date;
      friend?: never;
    }
  >
>;

const rawDeserializedWithRelation = DatabaseSchemaWithRelation.rawDeserializedKeysOnly(
  {},
  { withRelations: { friend: "raw" } },
);
type Should_Return_Relation_With_All_Keys_When_Converting_To_Raw = Expect<
  TypesMatch<
    typeof rawDeserializedWithRelation,
    {
      username: string;
      email: string;
      password: string;
      createdAt: Date;
      birthDate: Date;
      friend: {
        username: string;
        email: string;
        password: string;
        createdAt: Date;
        birthDate: Date;
      };
    }
  >
>;

const rawSerializedKeysOnly = DatabaseSchemaWithRelation.rawSerializedKeysOnly({});
type Should_Return_All_Serialized_Keys_When_Converting_To_Raw = Expect<
  TypesMatch<
    typeof rawSerializedKeysOnly,
    {
      username: string;
      email: string;
      password: string;
      createdAt: string;
      birthDate: string;
      friend?: never;
    }
  >
>;

const rawSerializedWithRelation = DatabaseSchemaWithRelation.rawSerializedKeysOnly(
  {},
  { withRelations: { friend: "raw" } },
);
type Should_Return_Relation_With_All_Serialized_Keys_When_Converting_To_Raw = Expect<
  TypesMatch<
    typeof rawSerializedWithRelation,
    {
      username: string;
      email: string;
      password: string;
      createdAt: string;
      birthDate: string;
      friend: {
        username: string;
        email: string;
        password: string;
        createdAt: string;
        birthDate: string;
      };
    }
  >
>;

const privateDeserializedWithRelation = DatabaseSchemaWithRelation.privateDeserializedKeysOnly(
  {},
  { withRelations: { friend: "private" } },
);
type Should_Return_Relation_With_Private_Keys_When_Converting_To_Private = Expect<
  TypesMatch<
    typeof privateDeserializedWithRelation,
    {
      username: string;
      email: string;
      password?: never;
      createdAt: Date;
      birthDate: Date;
      friend: {
        username: string;
        email: string;
        password?: never;
        createdAt: Date;
        birthDate: Date;
      };
    }
  >
>;

const privateSerializedWithRelation = DatabaseSchemaWithRelation.privateSerializedKeysOnly(
  {},
  { withRelations: { friend: "private" } },
);
type Should_Return_Relation_With_Private_Serialized_Keys_When_Converting_To_Private = Expect<
  TypesMatch<
    typeof privateSerializedWithRelation,
    {
      username: string;
      email: string;
      password?: never;
      createdAt: string;
      birthDate: string;
      friend: {
        username: string;
        email: string;
        password?: never;
        createdAt: string;
        birthDate: string;
      };
    }
  >
>;

const publicDeserializedWithRelation = DatabaseSchemaWithRelation.publicDeserializedKeysOnly(
  {},
  { withRelations: { friend: "public" } },
);
type Should_Return_Relation_With_Public_Keys_When_Converting_To_Public = Expect<
  TypesMatch<
    typeof publicDeserializedWithRelation,
    {
      username: string;
      email?: never;
      password?: never;
      createdAt: Date;
      birthDate?: never;
      friend: {
        username: string;
        email?: never;
        password?: never;
        createdAt: Date;
        birthDate?: never;
      };
    }
  >
>;

const publicSerializedWithRelation = DatabaseSchemaWithRelation.publicSerializedKeysOnly(
  {},
  { withRelations: { friend: "public" } },
);
type Should_Return_Relation_With_Public_Serialized_Keys_When_Converting_To_Public = Expect<
  TypesMatch<
    typeof publicSerializedWithRelation,
    {
      username: string;
      email?: never;
      password?: never;
      createdAt: string;
      birthDate?: never;
      friend: {
        username: string;
        email?: never;
        password?: never;
        createdAt: string;
        birthDate?: never;
      };
    }
  >
>;
