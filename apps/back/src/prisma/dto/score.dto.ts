import { createZodDto } from "nestjs-zod";
import { ScoreSchema } from "../generated/zod/schemas";

export const ScoreDtoSchema = ScoreSchema.omit({
  createdAt: true,
  updatedAt: true,
}).strip();

export class ScoreDto extends createZodDto(ScoreDtoSchema) {}
