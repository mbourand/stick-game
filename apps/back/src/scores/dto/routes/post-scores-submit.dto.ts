import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreSchemas } from "../../../prisma/dto/score.dto";

const BodySchema = ScoreSchemas.serialized.raw.omit({
  submissionTime: true,
  scoreVersion: true,
  id: true,
  playerId: true,
  playerName: true,
});

const ResponseSchema = z.strictObject({
  wasUploaded: z.boolean(),
  score: ScoreSchemas.serialized.public,
});

export class PostScoresSubmitBodyDto extends createZodDto(BodySchema) {}
export class PostScoresSubmitResponseDto extends createZodDto(ResponseSchema) {}
