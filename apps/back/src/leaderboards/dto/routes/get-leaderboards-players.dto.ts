import { createZodDto } from "nestjs-zod";
import z from "zod";
import { PlayerRankEntrySchema, PlayerRankingMetricSchema } from "../player-ranking.dto";

const QueryParamsSchema = z.strictObject({
  metric: PlayerRankingMetricSchema.default("sss"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const ResponseSchema = z.strictObject({
  entries: z.array(PlayerRankEntrySchema),
  total: z.number().int().nonnegative(),
});

export class GetLeaderboardsPlayersQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetLeaderboardsPlayersResponseDto extends createZodDto(ResponseSchema) {}
