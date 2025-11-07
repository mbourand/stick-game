import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreDtoSchema } from "../../../prisma/dto/score.dto";

const GetScoreBeatmapLeaderboardParamsSchema = z.object({
  beatmapId: z.number().int().positive(),
});

const GetScoreBeatmapLeaderboardResponseSchema = z.object({
  leaderboard: z.array(ScoreDtoSchema),
});

export class GetScoreBeatmapLeaderboardParamsDto extends createZodDto(GetScoreBeatmapLeaderboardParamsSchema) {}
export class GetScoreBeatmapLeaderboardResponseDto extends createZodDto(GetScoreBeatmapLeaderboardResponseSchema) {}
