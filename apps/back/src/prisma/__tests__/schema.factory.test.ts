import { email, z } from "zod";
import { makeDatabaseSchemas } from "../schemas/schema.factory";

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

const RelationSchema = makeDatabaseSchemas({
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

const DatabaseSchema = makeDatabaseSchemas({
  rawSchema: BaseSchema,
  serializedRawSchema: SerializedSchema,
  sensitiveKeys: ["password"],
  privateKeys: ["email", "birthDate"],
  relations: { relation: RelationSchema },
  serializationFunctions: {
    createdAt: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
    birthDate: { encode: (date) => date.toISOString(), decode: (str) => new Date(str) },
  },
});

describe("Schema Factory", () => {
  describe("Schema Tests", () => {
    it("should successfully parse a valid entry for raw schema without relations", () => {
      expect(() =>
        DatabaseSchema.raw().parse({
          username: "testuser",
          email: "testuser@example.com",
          password: "password123",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for private schema without relations", () => {
      expect(() =>
        DatabaseSchema.private().parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for public schema without relations", () => {
      expect(() =>
        DatabaseSchema.public().parse({
          username: "testuser",
          createdAt: new Date(),
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized raw schema without relations", () => {
      expect(() =>
        DatabaseSchema.serialized.raw().parse({
          username: "testuser",
          email: "testuser@example.com",
          password: "password123",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized private schema without relations", () => {
      expect(() =>
        DatabaseSchema.serialized.private().parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized public schema without relations", () => {
      expect(() =>
        DatabaseSchema.serialized.public().parse({
          username: "testuser",
          createdAt: new Date().toISOString(),
        }),
      ).not.toThrow();
    });

    it("should fail to parse an entry with sensitive fields for private schema", () => {
      expect(() =>
        DatabaseSchema.private().parse({
          username: "testuser",
          password: "password123",
          createdAt: new Date(),
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields for public schema", () => {
      expect(() =>
        DatabaseSchema.public().parse({
          username: "testuser",
          password: "password123",
          createdAt: new Date(),
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with private fields for public schema", () => {
      expect(() =>
        DatabaseSchema.public().parse({
          username: "testuser",
          email: "testuser@example.com",
          createdAt: new Date(),
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields for serialized private schema", () => {
      expect(() =>
        DatabaseSchema.serialized.private().parse({
          username: "testuser",
          password: "password123",
          createdAt: new Date().toISOString(),
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields for serialized public schema", () => {
      expect(() =>
        DatabaseSchema.serialized.public().parse({
          username: "testuser",
          password: "password123",
          createdAt: new Date().toISOString(),
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with private fields for serialized public schema", () => {
      expect(() =>
        DatabaseSchema.serialized.public().parse({
          username: "testuser",
          email: "testuser@example.com",
          createdAt: new Date().toISOString(),
        }),
      ).toThrow();
    });

    it("should successfully parse a valid entry for raw schema with relations", () => {
      expect(() =>
        DatabaseSchema.raw({ withRelations: { relation: "raw" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          password: "password123",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            password: "password1234",
            birthDate: new Date("1991-01-01"),
            createdAt: new Date(),
          },
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for private schema with relations", () => {
      expect(() =>
        DatabaseSchema.private({ withRelations: { relation: "private" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            birthDate: new Date("1991-01-01"),
            createdAt: new Date(),
          },
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for public schema with relations", () => {
      expect(() =>
        DatabaseSchema.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            createdAt: new Date(),
          },
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized raw schema with relations", () => {
      expect(() =>
        DatabaseSchema.serialized.raw({ withRelations: { relation: "raw" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          password: "password123",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            password: "password1234",
            birthDate: new Date("1991-01-01").toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized private schema with relations", () => {
      expect(() =>
        DatabaseSchema.serialized.private({ withRelations: { relation: "private" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            birthDate: new Date("1991-01-01").toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      ).not.toThrow();
    });

    it("should successfully parse a valid entry for serialized public schema with relations", () => {
      expect(() =>
        DatabaseSchema.serialized.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser2",
            createdAt: new Date().toISOString(),
          },
        }),
      ).not.toThrow();
    });

    it("should fail to parse an entry with sensitive fields inside relation for private schema", () => {
      expect(() =>
        DatabaseSchema.private({ withRelations: { relation: "private" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            password: "password1234",
            email: "testuser2@example.com",
            birthDate: new Date("1991-01-01"),
            createdAt: new Date(),
          },
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields in relation for public schema", () => {
      expect(() =>
        DatabaseSchema.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01"),
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            password: "password1234",
            birthDate: new Date("1991-01-01"),
            createdAt: new Date(),
          },
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with private fields in relation for public schema", () => {
      expect(() =>
        DatabaseSchema.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          createdAt: new Date(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            createdAt: new Date(),
          },
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields in relation for serialized private schema", () => {
      expect(() =>
        DatabaseSchema.serialized.private({ withRelations: { relation: "private" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser2",
            password: "password1234",
            email: "testuser2@example.com",
            birthDate: new Date("1991-01-01").toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with sensitive fields in relation for serialized public schema", () => {
      expect(() =>
        DatabaseSchema.serialized.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          email: "testuser@example.com",
          birthDate: new Date("1990-01-01").toISOString(),
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser",
            password: "password1234",
            email: "testuser@example.com",
            birthDate: new Date("1990-01-01").toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      ).toThrow();
    });

    it("should fail to parse an entry with private fields in relation for serialized public schema", () => {
      expect(() =>
        DatabaseSchema.serialized.public({ withRelations: { relation: "public" } }).parse({
          username: "testuser",
          createdAt: new Date().toISOString(),
          relation: {
            username: "testuser2",
            email: "testuser2@example.com",
            birthDate: new Date("1991-01-01").toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      ).toThrow();
    });
  });

  describe("Privacy conversion functions", () => {
    const rawDataWithoutRelation = {
      username: "testuser",
      email: "testuser@example.com",
      birthDate: new Date("1990-01-01"),
      createdAt: new Date(),
      password: "password123",
    };

    const rawDataWithRelation = {
      username: "testuser",
      email: "testuser@example.com",
      birthDate: new Date("1990-01-01"),
      createdAt: new Date(),
      password: "password123",
      relation: {
        username: "testuser2",
        email: "testuser2@example.com",
        birthDate: new Date("1991-01-01"),
        createdAt: new Date(),
        password: "password1234",
      },
    };

    const rawSerializedDataWithoutRelation = {
      username: "testuser",
      email: "testuser@example.com",
      birthDate: new Date("1990-01-01").toISOString(),
      createdAt: new Date().toISOString(),
      password: "password123",
    };

    const rawSerializedDataWithRelation = {
      username: "testuser",
      email: "testuser@example.com",
      birthDate: new Date("1990-01-01").toISOString(),
      createdAt: new Date().toISOString(),
      password: "password123",
      relation: {
        username: "testuser2",
        email: "testuser2@example.com",
        birthDate: new Date("1991-01-01").toISOString(),
        createdAt: new Date().toISOString(),
        password: "password1234",
      },
    };

    it("should drop sensitive fields when converting to private schema", () => {
      expect(DatabaseSchema.privateDeserializedKeysOnly(rawDataWithoutRelation)).toEqual({
        username: rawDataWithoutRelation.username,
        createdAt: rawDataWithoutRelation.createdAt,
        birthDate: rawDataWithoutRelation.birthDate,
        email: rawDataWithoutRelation.email,
      });
    });

    it("should drop sensitive and private fields when converting to public schema", () => {
      expect(DatabaseSchema.publicDeserializedKeysOnly(rawDataWithoutRelation)).toEqual({
        username: rawDataWithoutRelation.username,
        createdAt: rawDataWithoutRelation.createdAt,
      });
    });

    it("should fail when trying to convert from serialized fields to deserialized fields", () => {
      expect(() => DatabaseSchema.publicDeserializedKeysOnly(rawSerializedDataWithoutRelation)).toThrow();
    });

    it("should drop sensitive fields when converting to serialized private schema", () => {
      expect(DatabaseSchema.privateSerializedKeysOnly(rawSerializedDataWithoutRelation)).toEqual({
        username: rawSerializedDataWithoutRelation.username,
        createdAt: rawSerializedDataWithoutRelation.createdAt,
        birthDate: rawSerializedDataWithoutRelation.birthDate,
        email: rawSerializedDataWithoutRelation.email,
      });
    });

    it("should drop sensitive and private fields when converting to serialized public schema", () => {
      expect(DatabaseSchema.publicSerializedKeysOnly(rawSerializedDataWithoutRelation)).toEqual({
        username: rawSerializedDataWithoutRelation.username,
        createdAt: rawSerializedDataWithoutRelation.createdAt,
      });
    });

    it("should fail when trying to convert from deserialized fields to serialized fields", () => {
      expect(() => DatabaseSchema.publicSerializedKeysOnly(rawDataWithoutRelation)).toThrow();
    });

    //

    it("should drop sensitive fields when converting to private schema with relation", () => {
      expect(
        DatabaseSchema.privateDeserializedKeysOnly(rawDataWithRelation, { withRelations: { relation: "private" } }),
      ).toEqual({
        username: rawDataWithRelation.username,
        createdAt: rawDataWithRelation.createdAt,
        birthDate: rawDataWithRelation.birthDate,
        email: rawDataWithRelation.email,
        relation: {
          username: rawDataWithRelation.relation.username,
          createdAt: rawDataWithRelation.relation.createdAt,
          birthDate: rawDataWithRelation.relation.birthDate,
          email: rawDataWithRelation.relation.email,
        },
      });
    });

    it("should drop sensitive and private fields when converting to public schema with relation", () => {
      expect(
        DatabaseSchema.publicDeserializedKeysOnly(rawDataWithRelation, { withRelations: { relation: "public" } }),
      ).toEqual({
        username: rawDataWithRelation.username,
        createdAt: rawDataWithRelation.createdAt,
        relation: {
          username: rawDataWithRelation.relation.username,
          createdAt: rawDataWithRelation.relation.createdAt,
        },
      });
    });

    it("should fail when trying to convert from serialized fields to deserialized fields with relation", () => {
      expect(() =>
        DatabaseSchema.publicDeserializedKeysOnly(rawSerializedDataWithRelation, {
          withRelations: { relation: "public" },
        }),
      ).toThrow();
    });

    it("should drop sensitive fields when converting to serialized private schema with relation", () => {
      expect(
        DatabaseSchema.privateSerializedKeysOnly(rawSerializedDataWithRelation, {
          withRelations: { relation: "private" },
        }),
      ).toEqual({
        username: rawSerializedDataWithRelation.username,
        createdAt: rawSerializedDataWithRelation.createdAt,
        birthDate: rawSerializedDataWithRelation.birthDate,
        email: rawSerializedDataWithRelation.email,
        relation: {
          username: rawSerializedDataWithRelation.relation.username,
          createdAt: rawSerializedDataWithRelation.relation.createdAt,
          birthDate: rawSerializedDataWithRelation.relation.birthDate,
          email: rawSerializedDataWithRelation.relation.email,
        },
      });
    });

    it("should drop sensitive and private fields when converting to serialized public schema with relation", () => {
      expect(
        DatabaseSchema.publicSerializedKeysOnly(rawSerializedDataWithRelation, {
          withRelations: { relation: "public" },
        }),
      ).toEqual({
        username: rawSerializedDataWithRelation.username,
        createdAt: rawSerializedDataWithRelation.createdAt,
        relation: {
          username: rawSerializedDataWithRelation.relation.username,
          createdAt: rawSerializedDataWithRelation.relation.createdAt,
        },
      });
    });

    it("should fail when trying to convert from deserialized fields to serialized fields with relation", () => {
      expect(() =>
        DatabaseSchema.publicSerializedKeysOnly(rawDataWithRelation, { withRelations: { relation: "public" } }),
      ).toThrow();
    });
  });
});
