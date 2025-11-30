import z from "zod";

/**
 * ===========================================================
 * BASE TYPES
 * ===========================================================
 */

export type BaseSchema = z.ZodObject<z.ZodRawShape>;

export type BasePrivacyKind = "raw" | "private" | "public";
export type BaseSerializationKind = "serialized" | "deserialized";

export type BaseRelationsToInclude<Relations extends Record<string, BaseDatabaseSchemas>> = Partial<
  Record<keyof Relations, BasePrivacyKind>
>;

export type BaseDatabaseSchemas = {
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
  serializePublic: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
  deserializePublic: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
  serializePrivate: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
  deserializePrivate: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
  unrecommended_serializeRaw: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
  deserializeRaw: (data: any, options?: { withRelations?: Record<string, BasePrivacyKind> }) => any;
};

/**
 * ===========================================================
 * UTILS TYPES
 * ===========================================================
 */

type InvalidateKeys<Shape extends z.ZodRawShape, KeysToInvalidate extends keyof Shape> = z.util.Extend<
  Shape,
  { [K in KeysToInvalidate]: z.ZodOptional<z.ZodNever> }
>;

type IncludeRelations<
  Schema extends BaseSchema,
  Relations extends Record<string, BaseDatabaseSchemas>,
  RelationsToInclude extends Partial<Record<keyof Relations, BasePrivacyKind>>,
  SerializationKind extends BaseSerializationKind,
> = z.ZodObject<
  z.util.Extend<
    Schema["shape"],
    {
      [K in keyof Relations]-?: K extends keyof RelationsToInclude
        ? SerializationKind extends "serialized"
          ? RelationsToInclude[K] extends keyof Relations[K]["serialized"]
            ? z.ZodLazy<ReturnType<Relations[K]["serialized"][RelationsToInclude[K]]>>
            : "Error: K is not a key of Relations' serialized schemas"
          : RelationsToInclude[K] extends keyof Relations[K]
          ? z.ZodLazy<ReturnType<Relations[K][RelationsToInclude[K]]>>
          : `Error: K is not a key of Relations value`
        : z.ZodOptional<z.ZodNever>;
    }
  >,
  Schema extends z.ZodObject<any, infer Conf> ? Conf : never
>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * =========================================================
 * GENERATOR TYPES
 * =========================================================
 */

type SchemaGetterFor<
  Schema extends BaseSchema,
  SerializationKind extends BaseSerializationKind,
  Relations extends Record<string, BaseDatabaseSchemas>,
> = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(options?: {
  withRelations?: RelationsToInclude;
}) => Prettify<IncludeRelations<Schema, Relations, RelationsToInclude, SerializationKind>>;

type KindConverterFor<
  From,
  To extends BaseSchema,
  Relations extends Record<string, BaseDatabaseSchemas>,
  SerializationKind extends BaseSerializationKind,
> = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
  data: From,
  options?: { withRelations?: RelationsToInclude },
) => Prettify<z.infer<IncludeRelations<To, Relations, RelationsToInclude, SerializationKind>>>;

type SerializerFor<
  From,
  Schema extends BaseSchema,
  Relations extends Record<string, BaseDatabaseSchemas>,
  SerializationKind extends BaseSerializationKind,
> = <RelationsToInclude extends BaseRelationsToInclude<Relations> = {}>(
  data: From,
  options?: { withRelations?: RelationsToInclude },
) => Prettify<z.infer<IncludeRelations<Schema, Relations, RelationsToInclude, SerializationKind>>>;

/**
 * ===========================================================
 * MAIN TYPE
 * ===========================================================
 */

export type DatabaseSchemasReturnType<
  RawShape extends z.ZodRawShape,
  SerializedRawShape extends z.ZodRawShape,
  SensitiveKeys extends keyof RawShape & keyof SerializedRawShape,
  PrivateKeys extends keyof RawShape & keyof SerializedRawShape,
  Relations extends Record<string, BaseDatabaseSchemas>,
> = {
  raw: SchemaGetterFor<z.ZodObject<RawShape>, "deserialized", Relations>;
  private: SchemaGetterFor<z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys>>, "deserialized", Relations>;
  public: SchemaGetterFor<
    z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys | PrivateKeys>>,
    "deserialized",
    Relations
  >;
  serialized: {
    raw: SchemaGetterFor<z.ZodObject<SerializedRawShape>, "serialized", Relations>;
    private: SchemaGetterFor<z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys>>, "serialized", Relations>;
    public: SchemaGetterFor<
      z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys | PrivateKeys>>,
      "serialized",
      Relations
    >;
  };
  publicSerializedKeysOnly: KindConverterFor<
    any,
    z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys | PrivateKeys>>,
    Relations,
    "serialized"
  >;
  publicDeserializedKeysOnly: KindConverterFor<
    any,
    z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys | PrivateKeys>>,
    Relations,
    "deserialized"
  >;
  privateSerializedKeysOnly: KindConverterFor<
    any,
    z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys>>,
    Relations,
    "serialized"
  >;
  privateDeserializedKeysOnly: KindConverterFor<
    any,
    z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys>>,
    Relations,
    "deserialized"
  >;
  rawSerializedKeysOnly: KindConverterFor<any, z.ZodObject<SerializedRawShape>, Relations, "serialized">;
  rawDeserializedKeysOnly: KindConverterFor<any, z.ZodObject<RawShape>, Relations, "deserialized">;
  serializePublic: SerializerFor<
    z.infer<z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys | PrivateKeys>>>,
    z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys | PrivateKeys>>,
    Relations,
    "serialized"
  >;
  deserializePublic: SerializerFor<
    z.infer<z.ZodObject<Omit<SerializedRawShape, SensitiveKeys | PrivateKeys>>>,
    z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys | PrivateKeys>>,
    Relations,
    "deserialized"
  >;
  serializePrivate: SerializerFor<
    z.infer<z.ZodObject<Omit<RawShape, SensitiveKeys>>>,
    z.ZodObject<InvalidateKeys<SerializedRawShape, SensitiveKeys>>,
    Relations,
    "serialized"
  >;
  deserializePrivate: SerializerFor<
    z.infer<z.ZodObject<Omit<SerializedRawShape, SensitiveKeys>>>,
    z.ZodObject<InvalidateKeys<RawShape, SensitiveKeys>>,
    Relations,
    "deserialized"
  >;
  unrecommended_serializeRaw: SerializerFor<
    z.infer<z.ZodObject<RawShape>>,
    z.ZodObject<SerializedRawShape>,
    Relations,
    "serialized"
  >;
  deserializeRaw: SerializerFor<
    z.infer<z.ZodObject<SerializedRawShape>>,
    z.ZodObject<RawShape>,
    Relations,
    "deserialized"
  >;
};
