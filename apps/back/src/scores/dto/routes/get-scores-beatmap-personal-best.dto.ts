import { createZodDto } from "nestjs-zod";
import z from "zod";
import { SerializedScoreSchema } from "../../../prisma/dto/score.dto";

const ParamsSchema = z.strictObject({
  beatmapId: SerializedScoreSchema.shape.beatmapId,
  playerId: z.uuid(),
});

const QueryParamsSchema = z.strictObject({
  scoreVersion: z.coerce.number().min(1).max(3).default(3),
});

const ResponseSchema = SerializedScoreSchema;

export class GetScoresBeatmapPersonalBestParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapPersonalBestQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetScoresBeatmapPersonalBestResponseDto extends createZodDto(ResponseSchema) {}
