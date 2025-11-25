import { createZodDto } from "nestjs-zod";
import z from "zod";
import { SerializedScoreSchema } from "../../../prisma/dto/score.dto";

const BodySchema = SerializedScoreSchema.omit({
  submissionTime: true,
  scoreVersion: true,
});

const ResponseSchema = z.strictObject({
  wasUploaded: z.boolean(),
  score: SerializedScoreSchema,
});

export class PostScoresSubmitBodyDto extends createZodDto(BodySchema) {}
export class PostScoresSubmitResponseDto extends createZodDto(ResponseSchema) {}
