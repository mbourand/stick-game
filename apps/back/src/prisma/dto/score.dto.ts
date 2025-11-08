import { createZodDto } from "nestjs-zod";
import { ScoreSchema } from "../generated/zod/schemas";
import z from "zod";

const ScoreResponseDtoSchema = ScoreSchema.extend({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const toResponseScore = (score: z.infer<typeof ScoreSchema>): z.infer<typeof ScoreResponseDtoSchema> => ({
  ...score,
  createdAt: score.createdAt.toISOString(),
  updatedAt: score.updatedAt.toISOString(),
});

export class ScoreResponseDto extends createZodDto(ScoreResponseDtoSchema) {}
