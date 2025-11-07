import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResultSchema } from "../../../prisma/generated/zod/schemas";

const GetScoreBeatmapLeaderboardParamsSchema = z.object({
  beatmapId: z.number().int().positive(),
});

const GetScoreBeatmapLeaderboardResponseSchema = z.object({
  leaderboard: z.array(ScoreResultSchema),
});

export class GetScoreBeatmapLeaderboardParamsDto extends createZodDto(GetScoreBeatmapLeaderboardParamsSchema) {}
export class GetScoreBeatmapLeaderboardResponseDto extends createZodDto(GetScoreBeatmapLeaderboardResponseSchema) {}
