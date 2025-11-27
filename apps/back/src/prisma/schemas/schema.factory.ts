import z from "zod";
import { DatabaseSchemasReturnType } from "./schema.factory.types";

const relationSchema = <T extends z.ZodType>(schema: T) => z.lazy(() => schema).nullish();

type BaseSchema = z.ZodObject<z.ZodRawShape>;

type BasePrivacyKind = "raw" | "private" | "public";

type BaseDatabaseSchemas = {
  raw: (...args: any[]) => BaseSchema;
  private: (...args: any[]) => BaseSchema;
  public: (...args: any[]) => BaseSchema;
  serialized: {
    raw: (...args: any[]) => BaseSchema;
    private: (...args: any[]) => BaseSchema;
    public: (...args: any[]) => BaseSchema;
  };
  publicSerializedKeysOnly: (data: any) => any;
  publicDeserializedKeysOnly: (data: any) => any;
  privateSerializedKeysOnly: (data: any) => any;
  privateDeserializedKeysOnly: (data: any) => any;
  rawSerializedKeysOnly: (data: any) => any;
  rawDeserializedKeysOnly: (data: any) => any;
  serializePublic: (data: any, options?: { withRelations?: Record<string, "raw" | "public" | "private"> }) => any;
  deserializePublic: (data: any, options?: { withRelations?: Record<string, "raw" | "public" | "private"> }) => any;
  serializePrivate: (data: any, options?: { withRelations?: Record<string, "raw" | "public" | "private"> }) => any;
  deserializePrivate: (data: any, options?: { withRelations?: Record<string, "raw" | "public" | "private"> }) => any;
  unrecommended_serializeRaw: (
    data: any,
    options?: { withRelations?: Record<string, "raw" | "public" | "private"> },
  ) => any;
  deserializeRaw: (data: any, options?: { withRelations?: Record<string, "raw" | "public" | "private"> }) => any;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type IncludeRelations<
  Schema extends BaseSchema,
  Relations extends Record<string, BaseDatabaseSchemas>,
  RelationsToInclude extends Partial<Record<keyof Relations, "raw" | "private" | "public">>,
  SerializationKind extends "serialized" | "deserialized",
> = z.ZodObject<
  z.util.Extend<
    Schema["shape"],
    {
      [K in keyof Relations]: K extends keyof RelationsToInclude
        ? SerializationKind extends "serialized"
          ? RelationsToInclude[K] extends keyof Relations[K]["serialized"]
            ? z.ZodOptional<z.ZodNullable<z.ZodLazy<ReturnType<Relations[K]["serialized"][RelationsToInclude[K]]>>>>
            : "Error: K is not a key of Relations' serialized schemas"
          : RelationsToInclude[K] extends keyof Relations[K]
          ? z.ZodOptional<z.ZodNullable<z.ZodLazy<ReturnType<Relations[K][RelationsToInclude[K]]>>>>
          : "Error: K is not a key of Relations"
        : z.ZodOptional<z.ZodNever>;
    }
  >,
  Schema extends z.ZodObject<any, infer Conf> ? Conf : never
>;

export const makeDatabaseSchemas = <
  RawShape extends z.ZodRawShape,
  SerializedRawShape extends z.ZodRawShape,
  SensitiveKeys extends keyof RawShape & keyof SerializedRawShape,
  PrivateKeys extends keyof RawShape & keyof SerializedRawShape,
  Relations extends Record<string, BaseDatabaseSchemas>,
  SerializationFunctions extends Partial<{
    [K in keyof z.infer<z.ZodObject<RawShape>>]: {
      encode: (data: z.infer<z.ZodObject<RawShape>>[K]) => any;
      decode: (data: any) => z.infer<z.ZodObject<RawShape>>[K];
    };
  }>,
>({
  rawSchema,
  serializedRawSchema,
  sensitiveKeys,
  privateKeys,
  relations,
  serializationFunctions,
}: {
  rawSchema: z.ZodObject<RawShape>;
  serializedRawSchema: z.ZodObject<SerializedRawShape>;
  sensitiveKeys: SensitiveKeys[];
  privateKeys: PrivateKeys[];
  relations: Relations;
  serializationFunctions: SerializationFunctions;
}): DatabaseSchemasReturnType<RawShape, SerializedRawShape, SensitiveKeys, PrivateKeys, Relations> => {
  type BaseRelationsToInclude = Partial<Record<keyof Relations, "raw" | "public" | "private">>;

  const invalidateKeys = <T extends z.ZodRawShape, K extends keyof T>(schema: z.ZodObject<T>, keys: K[]) => {
    const omitExtension = {} as Record<K, z.ZodOptional<z.ZodNever>>;
    keys.forEach((key) => (omitExtension[key] = z.never().optional()));
    return schema.extend(omitExtension);
  };

  const publicSchema = invalidateKeys(rawSchema, [...sensitiveKeys, ...privateKeys]);
  const privateSchema = invalidateKeys(rawSchema, sensitiveKeys);
  const serializedPrivateSchema = invalidateKeys(serializedRawSchema, sensitiveKeys).strict();
  const serializedPublicSchema = invalidateKeys(serializedRawSchema, [...sensitiveKeys, ...privateKeys]).strict();

  type RawSchemaInferred = z.infer<typeof rawSchema>;
  type PublicSchemaInferred = z.infer<typeof publicSchema>;
  type PrivateSchemaInferred = z.infer<typeof privateSchema>;
  type SerializedRawSchemaInferred = z.infer<typeof serializedRawSchema>;
  type SerializedPublicSchemaInferred = z.infer<typeof serializedPublicSchema>;
  type SerializedPrivateSchemaInferred = z.infer<typeof serializedPrivateSchema>;

  const includeRelations = (
    schema: BaseSchema,
    isSerialized: "serialized" | "deserialized",
    relationsToInclude: BaseRelationsToInclude,
  ) => {
    return schema.extend(
      Object.fromEntries(
        Object.entries(relations).map(([key, relation]) => {
          if (!(key in relationsToInclude)) return [key, z.never().optional()];

          const kind = relationsToInclude[key];
          if (!kind) throw new Error("Relation kind must be specified");
          const schemaLocation = isSerialized === "serialized" ? relation["serialized"] : relation;
          return [key, relationSchema(schemaLocation[kind]())];
        }),
      ),
    );
  };

  type SchemaOfKind<
    PrivacyKind extends BasePrivacyKind,
    SerializationKind extends "serialized" | "deserialized",
  > = PrivacyKind extends "raw"
    ? SerializationKind extends "serialized"
      ? typeof serializedRawSchema
      : typeof rawSchema
    : PrivacyKind extends "private"
    ? SerializationKind extends "serialized"
      ? typeof serializedPrivateSchema
      : typeof privateSchema
    : PrivacyKind extends "public"
    ? SerializationKind extends "serialized"
      ? typeof serializedPublicSchema
      : typeof publicSchema
    : never;

  const kindConverterFor = <
    PrivacyKind extends BasePrivacyKind,
    SerializationKind extends "serialized" | "deserialized",
  >(
    kind: PrivacyKind,
    serializationKind: SerializationKind,
  ) => {
    return <RelationsToInclude extends BaseRelationsToInclude = {}>(
      data: any,
      options?: { withRelations?: RelationsToInclude },
    ): keyof RelationsToInclude extends never
      ? z.infer<SchemaOfKind<PrivacyKind, SerializationKind>>
      : z.infer<
          IncludeRelations<
            SchemaOfKind<PrivacyKind, SerializationKind>,
            Relations,
            RelationsToInclude,
            SerializationKind
          >
        > => {
      const schema: SchemaOfKind<PrivacyKind, SerializationKind> | null =
        kind === "raw"
          ? serializationKind === "serialized"
            ? (serializedRawSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
            : (rawSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
          : kind === "private"
          ? serializationKind === "serialized"
            ? (serializedPrivateSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
            : (privateSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
          : kind === "public"
          ? serializationKind === "serialized"
            ? (serializedPublicSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
            : (publicSchema as SchemaOfKind<PrivacyKind, SerializationKind>)
          : null;
      if (!schema) throw new Error("Invalid kind: " + kind);

      const baseResultWithoutRelations = schema.strip().parse(data);
      if (!options?.withRelations) return baseResultWithoutRelations as any;
      return includeRelations(schema, serializationKind, options.withRelations).strip().parse(data) as any;
    };
  };

  const privateSerializedKeysOnly = kindConverterFor("private", "serialized");
  const publicSerializedKeysOnly = kindConverterFor("public", "serialized");
  const privateDeserializedKeysOnly = kindConverterFor("private", "deserialized");
  const publicDeserializedKeysOnly = kindConverterFor("public", "deserialized");
  const rawSerializedKeysOnly = kindConverterFor("raw", "serialized");
  const rawDeserializedKeysOnly = kindConverterFor("raw", "deserialized");

  const applyTransformations = (
    data: Record<string, unknown>,
    side: "encode" | "decode",
    kind: BasePrivacyKind,
  ): any => {
    const serializedData: any = { ...data };
    for (const key in serializationFunctions) {
      if (key in data) {
        const func = serializationFunctions[key];
        if (func) serializedData[key] = func[side]((data as any)[key]);
      }
    }

    for (const key in relations) {
      if (key in data) {
        const relation = relations[key];
        if (kind === "public" && side === "encode") serializedData[key] = relation.serializePublic(data[key]);
        else if (kind === "public" && side === "decode") serializedData[key] = relation.deserializePublic(data[key]);
        else if (kind === "private" && side === "encode") serializedData[key] = relation.serializePrivate(data[key]);
        else if (kind === "private" && side === "decode") serializedData[key] = relation.deserializePrivate(data[key]);
        else if (kind === "raw" && side === "encode")
          serializedData[key] = relation.unrecommended_serializeRaw(data[key]);
        else if (kind === "raw" && side === "decode") serializedData[key] = relation.deserializeRaw(data[key]);
        else throw new Error("Cannot serialize relation with kind: " + kind);
      }
    }

    return serializedData;
  };

  type SerializerReturnType<Schema extends BaseSchema, RelationsToInclude extends BaseRelationsToInclude> = Prettify<
    keyof RelationsToInclude extends never
      ? z.infer<Schema>
      : IncludeRelations<Schema, Relations, RelationsToInclude, "serialized">
  >;

  const schemaGetterFor = <Schema extends BaseSchema, SerializationKind extends "serialized" | "deserialized">(
    schema: Schema,
    serializationKind: SerializationKind,
  ) => {
    return <RelationsToInclude extends BaseRelationsToInclude = {}>(options?: {
      withRelations?: RelationsToInclude;
    }) => {
      if (!options?.withRelations) return schema.strict();
      return includeRelations(schema, serializationKind, options.withRelations).strict();
    };
  };

  const serializePublic = <RelationsToInclude extends BaseRelationsToInclude = {}>(
    data: PublicSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof serializedPublicSchema, RelationsToInclude> =>
    applyTransformations(publicDeserializedKeysOnly(data, options), "encode", "public");

  const deserializePublic = <RelationsToInclude extends BaseRelationsToInclude = {}>(
    data: SerializedPublicSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof publicSchema, RelationsToInclude> =>
    applyTransformations(publicSerializedKeysOnly(data, options), "decode", "public");

  const serializePrivate = <RelationsToInclude extends BaseRelationsToInclude = {}>(
    data: PrivateSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof serializedPrivateSchema, RelationsToInclude> =>
    applyTransformations(privateDeserializedKeysOnly(data, options), "encode", "private");

  const deserializePrivate = <RelationsToInclude extends BaseRelationsToInclude = {}>(
    data: SerializedPrivateSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof privateSchema, RelationsToInclude> =>
    applyTransformations(privateSerializedKeysOnly(data, options), "decode", "private");

  const unrecommended_serializeRaw = <RelationsToInclude extends BaseRelationsToInclude = {}>(
    data: RawSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof serializedRawSchema, RelationsToInclude> =>
    applyTransformations(rawDeserializedKeysOnly(data, options), "encode", "raw");

  const deserializeRaw = <
    Data extends SerializedRawSchemaInferred,
    RelationsToInclude extends BaseRelationsToInclude = {},
  >(
    data: Data,
    options?: { withRelations?: RelationsToInclude },
  ): SerializerReturnType<typeof rawSchema, RelationsToInclude> =>
    applyTransformations(rawSerializedKeysOnly(data, options), "decode", "raw");

  return {
    raw: schemaGetterFor(rawSchema, "deserialized"),
    private: schemaGetterFor(privateSchema, "deserialized"),
    public: schemaGetterFor(publicSchema, "deserialized"),
    serialized: {
      raw: schemaGetterFor(serializedRawSchema, "serialized"),
      private: schemaGetterFor(serializedPrivateSchema, "serialized"),
      public: schemaGetterFor(serializedPublicSchema, "serialized"),
    },
    publicSerializedKeysOnly,
    publicDeserializedKeysOnly,
    rawSerializedKeysOnly,
    rawDeserializedKeysOnly,
    privateDeserializedKeysOnly,
    privateSerializedKeysOnly,
    serializePublic,
    deserializePublic,
    serializePrivate,
    deserializePrivate,
    unrecommended_serializeRaw,
    deserializeRaw,
  } as any;
};
