import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";
import { ScoreSchema } from "../../../prisma/generated/zod/schemas";

const ParamsSchema = z.strictObject({
  beatmapId: ScoreSchema.shape.beatmapId,
});

const ResponseSchema = z.strictObject({
  leaderboard: z.array(ScoreResponseDto.schema),
});

export class GetScoresBeatmapLeaderboardParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapLeaderboardResponseDto extends createZodDto(ResponseSchema) {}
