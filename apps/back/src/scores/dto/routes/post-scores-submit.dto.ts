import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";

const BodySchema = ScoreResponseDto.schema.omit({
  updatedAt: true,
  createdAt: true,
});

const ResponseSchema = z.strictObject({
  wasUploaded: z.boolean(),
  score: ScoreResponseDto.schema,
});

export class PostScoresSubmitBodyDto extends createZodDto(BodySchema) {}
export class PostScoresSubmitResponseDto extends createZodDto(ResponseSchema) {}
