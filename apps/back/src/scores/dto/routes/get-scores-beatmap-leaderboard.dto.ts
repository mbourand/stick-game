import { createZodDto } from "nestjs-zod";
import z from "zod";
import { SerializedScoreSchema } from "../../../prisma/dto/score.dto";

const ParamsSchema = z.strictObject({
  beatmapId: SerializedScoreSchema.shape.beatmapId,
});

const QueryParamsSchema = z.strictObject({
  scoreVersion: z.coerce.number().min(1).max(3).default(3),
});

const ResponseSchema = z.strictObject({
  leaderboard: z.array(SerializedScoreSchema),
});

export class GetScoresBeatmapLeaderboardParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapLeaderboardQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetScoresBeatmapLeaderboardResponseDto extends createZodDto(ResponseSchema) {}
