import z from "zod";

export type Exact<T extends Expected, Expected> = {
  [K in keyof T]: K extends Exclude<keyof T, keyof Expected> ? never : T[K];
};

type IncludeRelations<
  T extends Record<string, unknown>,
  Relations extends Record<string, DatabaseSchemasType<any, any, any, any, any, any, any, any, any, any>>,
  ModelKind extends "Raw" | "Private" | "Public" | "SerializedRaw" | "SerializedPrivate" | "SerializedPublic",
> = Omit<T, keyof Relations> & {
  [K in keyof Relations]?:
    | (Relations[K] extends DatabaseSchemasType<
        infer Raw,
        any,
        any,
        any,
        any,
        infer SerializedRaw,
        infer Private,
        infer SerializedPrivate,
        infer Public,
        infer SerializedPublic
      >
        ? ModelKind extends "Raw"
          ? Raw
          : ModelKind extends "Private"
          ? Private
          : ModelKind extends "Public"
          ? Public
          : ModelKind extends "SerializedRaw"
          ? SerializedRaw
          : ModelKind extends "SerializedPrivate"
          ? SerializedPrivate
          : ModelKind extends "SerializedPublic"
          ? SerializedPublic
          : "Error: Unknown ModelKind"
        : "Error: Relation is not a DatabaseSchemasType")
    | null
    | undefined;
};

export type DatabaseSchemasType<
  Model extends Record<string, unknown>,
  SensitiveKeys extends keyof Model,
  PrivateKeys extends keyof Model,
  RelationKeys extends keyof Model,
  SerializedModel extends { [K in keyof Model]: unknown },
  Relations extends Record<RelationKeys, DatabaseSchemasType<any, any, any, any, any, any, any, any, any, any>> | never,
  PrivateModel extends IncludeRelations<Omit<Model, SensitiveKeys>, Relations, "Private">,
  SerializedPrivateModel extends IncludeRelations<Omit<SerializedModel, SensitiveKeys>, Relations, "SerializedPrivate">,
  PublicModel extends IncludeRelations<Omit<Model, SensitiveKeys | PrivateKeys>, Relations, "Public">,
  SerializedPublicModel extends IncludeRelations<
    Omit<SerializedModel, SensitiveKeys | PrivateKeys>,
    Relations,
    "SerializedPublic"
  >,
> = {
  raw: z.ZodType<Model>;
  private: z.ZodType<Exact<PrivateModel, IncludeRelations<Omit<Model, SensitiveKeys>, Relations, "Private">>>;
  public: z.ZodType<
    Exact<PublicModel, IncludeRelations<Omit<Model, SensitiveKeys | PrivateKeys>, Relations, "Public">>
  >;
  serialized: {
    raw: z.ZodType<SerializedModel>;
    private: z.ZodType<
      Exact<
        SerializedPrivateModel,
        IncludeRelations<Omit<SerializedModel, SensitiveKeys>, Relations, "SerializedPrivate">
      >
    >;
    public: z.ZodType<
      Exact<
        SerializedPublicModel,
        IncludeRelations<Omit<SerializedModel, SensitiveKeys | PrivateKeys>, Relations, "SerializedPublic">
      >
    >;
  };
  serializePrivate: (data: PrivateModel) => SerializedPrivateModel;
  deserializePrivate: (data: SerializedPrivateModel) => PrivateModel;
  serializePublic: (data: PublicModel) => SerializedPublicModel;
  deserializePublic: (data: SerializedPublicModel) => PublicModel;
  toPublic: (data: Model | PrivateModel | PublicModel) => PublicModel;
  toPrivate: (data: Model | PrivateModel) => PrivateModel;
};
