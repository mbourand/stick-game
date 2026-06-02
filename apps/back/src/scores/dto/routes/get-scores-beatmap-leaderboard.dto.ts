import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";
import { ScoreSchema } from "../../../prisma/generated/zod/schemas";

const ParamsSchema = z.strictObject({
  beatmapId: ScoreSchema.shape.beatmapId,
});

const QueryParamsSchema = z.strictObject({
  scoreVersion: z.coerce.number().min(1).max(3).default(3),
  // Query strings arrive as "true"/"false"; z.coerce.boolean would turn the
  // string "false" into `true`, so parse the literals explicitly.
  modded: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const ResponseSchema = z.strictObject({
  leaderboard: z.array(ScoreResponseDto.schema),
});

export class GetScoresBeatmapLeaderboardParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapLeaderboardQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetScoresBeatmapLeaderboardResponseDto extends createZodDto(ResponseSchema) {}
