import { createZodDto } from "nestjs-zod";
import z from "zod";
import { ScoreResponseDto } from "../../../prisma/dto/score.dto";
import { ScoreSchema } from "../../../prisma/generated/zod/schemas";

const ParamsSchema = z.strictObject({
  beatmapId: ScoreSchema.shape.beatmapId,
  playerName: ScoreSchema.shape.playerName,
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

const ResponseSchema = ScoreResponseDto.schema;

export class GetScoresBeatmapPersonalBestParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapPersonalBestQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetScoresBeatmapPersonalBestResponseDto extends createZodDto(ResponseSchema) {}
