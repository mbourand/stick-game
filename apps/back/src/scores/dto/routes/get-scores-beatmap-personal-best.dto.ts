import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";

const ParamsSchema = z.strictObject({
  beatmapId: z.number().int().positive(),
  playerName: z.string().min(2).max(100),
});

const ResponseSchema = ScoreResponseDto.schema;

export class GetScoresBeatmapPersonalBestParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapPersonalBestResponseDto extends createZodDto(ResponseSchema) {}
