import z from "zod";

type KeyOnlyInFirst<First, Second> = Exclude<keyof First, keyof Second>;

type Exact<T extends Expected, Expected> = {
  [K in keyof T]: K extends KeyOnlyInFirst<T, Expected> ? never : T[K];
};

export type DatabaseSchemasType<
  Model extends Record<string, unknown>,
  OmitKeys extends keyof Model,
  PrivateKeys extends keyof Model,
  SerializedModel extends Record<keyof Model, unknown>,
  PrivateModel extends Omit<Model, OmitKeys>,
  SerializedPrivateModel extends Omit<SerializedModel, OmitKeys>,
  PublicModel extends Omit<Model, OmitKeys | PrivateKeys>,
  SerializedPublicModel extends Omit<SerializedModel, OmitKeys | PrivateKeys>,
> = {
  raw: z.ZodType<Model>;
  serializedRaw: z.ZodType<SerializedModel>;
  private: z.ZodType<Exact<PrivateModel, Omit<Model, OmitKeys>>>;
  serializedPrivate: z.ZodType<Exact<SerializedPrivateModel, Omit<SerializedModel, OmitKeys>>>;
  public: z.ZodType<Exact<PublicModel, Omit<Model, OmitKeys | PrivateKeys>>>;
  serializedPublic: z.ZodType<Exact<SerializedPublicModel, Omit<SerializedModel, OmitKeys | PrivateKeys>>>;
  serializePrivateSchema: (data: NoInfer<PrivateModel>) => NoInfer<SerializedPrivateModel>;
  deserializePrivateSchema: (data: NoInfer<SerializedPrivateModel>) => NoInfer<PrivateModel>;
  serializePublicSchema: (data: NoInfer<PublicModel>) => NoInfer<SerializedPublicModel>;
  deserializePublicSchema: (data: NoInfer<SerializedPublicModel>) => NoInfer<PublicModel>;
};
