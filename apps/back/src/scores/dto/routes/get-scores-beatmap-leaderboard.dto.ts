import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";

const ParamsSchema = z.strictObject({
  beatmapId: z.coerce.number().int().positive(),
});

const ResponseSchema = z.strictObject({
  leaderboard: z.array(ScoreResponseDto.schema),
});

export class GetScoresBeatmapLeaderboardParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapLeaderboardResponseDto extends createZodDto(ResponseSchema) {}
