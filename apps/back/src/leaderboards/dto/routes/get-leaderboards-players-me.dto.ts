import { createZodDto } from "nestjs-zod";
import z from "zod";
import { PlayerRankingMetricSchema } from "../player-ranking.dto";

const QueryParamsSchema = z.strictObject({
  metric: PlayerRankingMetricSchema.default("sss"),
});

// `rank` is 0 when the caller is unranked on this board (a zero value — e.g. no
// plays / no qualifying grades yet); otherwise their 1-based competition rank.
const ResponseSchema = z.strictObject({
  rank: z.number().int().nonnegative(),
  value: z.number().int().nonnegative(),
});

export class GetLeaderboardsPlayersMeQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetLeaderboardsPlayersMeResponseDto extends createZodDto(ResponseSchema) {}
