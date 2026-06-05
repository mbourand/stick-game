import { createZodDto } from "nestjs-zod";
import z from "zod";
import { SelfScoreSchema } from "../../../prisma/dto/score.dto";
import { ScoreSchema } from "../../../prisma/generated/zod/schemas";
import { SCORE_VERSION } from "../../scores.constants";

const ParamsSchema = z.strictObject({
  beatmapId: ScoreSchema.shape.beatmapId,
});

const QueryParamsSchema = z.strictObject({
  scoreVersion: z.coerce.number().min(1).max(SCORE_VERSION).default(SCORE_VERSION),
  // Query strings arrive as "true"/"false"; z.coerce.boolean would turn the
  // string "false" into `true`, so parse the literals explicitly.
  modded: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const ResponseSchema = SelfScoreSchema;

export class GetScoresBeatmapPersonalBestParamsDto extends createZodDto(ParamsSchema) {}
export class GetScoresBeatmapPersonalBestQueryParamsDto extends createZodDto(QueryParamsSchema) {}
export class GetScoresBeatmapPersonalBestResponseDto extends createZodDto(ResponseSchema) {}
