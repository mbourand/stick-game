import { createZodDto } from "nestjs-zod";
import { ScoreModelSchema, ScoreSchema } from "../generated/zod/schemas";

export const ScoreDtoSchema = ScoreSchema.omit({
  createdAt: true,
  updatedAt: true,
});

// Add any additional transformations or validations if needed
export const ScoreSchemaToDto = ScoreModelSchema.transform((data) => ({
  ...data,
  createdAt: new Date(data.createdAt),
  updatedAt: new Date(data.updatedAt),
}));

export class ScoreDto extends createZodDto(ScoreDtoSchema) {}
