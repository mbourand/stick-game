import { createZodDto } from "nestjs-zod";
import { ScoreSchema } from "../generated/zod/schemas";
import z from "zod";

const ScoreResponseDtoSchema = ScoreSchema.extend({
  submissionTime: z.iso.datetime(),
}).strict();

export const toResponseScore = (score: z.infer<typeof ScoreSchema>): z.infer<typeof ScoreResponseDtoSchema> => ({
  ...score,
  submissionTime: score.submissionTime.toISOString(),
});

export class ScoreResponseDto extends createZodDto(ScoreResponseDtoSchema) {}
