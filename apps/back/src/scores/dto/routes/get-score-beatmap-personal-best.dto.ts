import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreDtoSchema } from "../../../prisma/dto/score.dto";

const GetScoreBeatmapPersonalBestParamsSchema = z.object({
  beatmapId: z.number().int().positive(),
  playerName: z.string().min(2).max(100),
});

const GetScoreBeatmapPersonalBestResponseSchema = ScoreDtoSchema;

export class GetScoreBeatmapPersonalBestParamsDto extends createZodDto(GetScoreBeatmapPersonalBestParamsSchema) {}
export class GetScoreBeatmapPersonalBestResponseDto extends createZodDto(GetScoreBeatmapPersonalBestResponseSchema) {}
