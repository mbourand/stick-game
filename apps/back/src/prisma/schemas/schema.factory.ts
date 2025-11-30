import z from "zod";
import {
  BaseDatabaseSchemas,
  BasePrivacyKind,
  BaseRelationsToInclude,
  BaseSchema,
  BaseSerializationKind,
  DatabaseSchemasReturnType,
} from "./schema.factory.types";

const relationSchema = <T extends z.ZodType>(schema: T) => z.lazy(() => schema).nullish();

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
    schema: z.ZodObject<z.ZodRawShape>,
    isSerialized: "serialized" | "deserialized",
    relationsToInclude: BaseRelationsToInclude<Relations>,
    omitRelationsNotIncluded: boolean = false,
  ) => {
    return schema.extend(
      Object.fromEntries(
        Object.entries(relations).map(([key, relation]) => {
          if (!(key in relationsToInclude) && !omitRelationsNotIncluded) return [key, z.never().optional()];
          else if (!(key in relationsToInclude) && omitRelationsNotIncluded) return [key, undefined];

          const kind = relationsToInclude[key];
          if (!kind) throw new Error("Relation kind must be specified");
          const schemaLocation = isSerialized === "serialized" ? relation["serialized"] : relation;
          return [key, relationSchema(schemaLocation[kind]())];
        }),
      ),
    );
  };

  const kindConverterFor = (kind: BasePrivacyKind, serializationKind: BaseSerializationKind) => {
    return <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
      data: any,
      options?: { withRelations?: RelationsToInclude },
    ) => {
      const schema =
        kind === "raw"
          ? serializationKind === "serialized"
            ? serializedRawSchema
            : rawSchema
          : kind === "private"
          ? serializationKind === "serialized"
            ? serializedPrivateSchema
            : privateSchema
          : kind === "public"
          ? serializationKind === "serialized"
            ? serializedPublicSchema
            : publicSchema
          : null;
      if (!schema) throw new Error("Invalid kind: " + kind);

      const omitKeys = (schema: z.ZodObject<z.ZodRawShape>) => {
        let newSchema = schema;

        const shouldOmitSensitiveKeys = kind === "private" || kind === "public";
        if (shouldOmitSensitiveKeys)
          newSchema = newSchema.omit({ ...Object.fromEntries(sensitiveKeys.map((key) => [key, true])) });

        const shouldOmitPrivateKeys = kind === "public";
        if (shouldOmitPrivateKeys)
          newSchema = newSchema.omit({ ...Object.fromEntries(privateKeys.map((key) => [key, true])) });

        return newSchema;
      };

      const newSchema = omitKeys(schema);

      if (!options?.withRelations) return newSchema.strip().parse(data) as any;
      return includeRelations(newSchema, serializationKind, options.withRelations, true).strip().parse(data) as any;
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

  const schemaGetterFor = <Schema extends BaseSchema, SerializationKind extends "serialized" | "deserialized">(
    schema: Schema,
    serializationKind: SerializationKind,
  ) => {
    return <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(options?: {
      withRelations?: RelationsToInclude;
    }) => {
      if (!options?.withRelations) return schema.strict();
      return includeRelations(schema, serializationKind, options.withRelations).strict();
    };
  };

  const serializePublic = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: PublicSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(publicDeserializedKeysOnly(data, options), "encode", "public");

  const deserializePublic = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: SerializedPublicSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(publicSerializedKeysOnly(data, options), "decode", "public");

  const serializePrivate = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: PrivateSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(privateDeserializedKeysOnly(data, options), "encode", "private");

  const deserializePrivate = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: SerializedPrivateSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(privateSerializedKeysOnly(data, options), "decode", "private");

  const unrecommended_serializeRaw = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: RawSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(rawDeserializedKeysOnly(data, options), "encode", "raw");

  const deserializeRaw = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
    data: SerializedRawSchemaInferred,
    options?: { withRelations?: RelationsToInclude },
  ) => applyTransformations(rawSerializedKeysOnly(data, options), "decode", "raw");

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
