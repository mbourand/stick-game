import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";
import { ScoreSchema } from "../../../prisma/generated/zod/schemas";

const ParamsSchema = z.strictObject({
  beatmapId: ScoreSchema.shape.beatmapId,
  playerName: ScoreSchema.shape.playerName,
});

const ResponseSchema = ScoreResponseDto.schema;

export class GetScoresBeatmapPersonalBestParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapPersonalBestResponseDto extends createZodDto(ResponseSchema) {}
