import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreDtoSchema } from "../../../prisma/dto/score.dto";

const PostScoreSubmitBodySchema = ScoreDtoSchema.pick({
  beatmapId: true,
  playerName: true,
  score: true,
  maxCombo: true,
  accuracy: true,
  missCount: true,
  mehCount: true,
  goodCount: true,
  greatCount: true,
  perfectCount: true,
});

const PostScoreSubmitResponseSchema = z.object({
  wasUploaded: z.boolean(),
  score: ScoreDtoSchema,
});

export class PostScoreSubmitBodyDto extends createZodDto(PostScoreSubmitBodySchema) {}
export class PostScoreSubmitResponseDto extends createZodDto(PostScoreSubmitResponseSchema) {}
