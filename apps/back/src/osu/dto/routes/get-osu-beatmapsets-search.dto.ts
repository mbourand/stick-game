import z from "zod";
import { BeatmapSetSchema } from "../../osu.schemas";
import { createZodDto } from "nestjs-zod";

export const GetOsuBeatmapsetsSearchResponseSchema = z.object({
  beatmapsets: z.array(BeatmapSetSchema),
});

export const GetOsuBeatmapsetsSearchQueryParamsSchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export class GetOsuBeatmapsetsSearchResponseDto extends createZodDto(GetOsuBeatmapsetsSearchResponseSchema) {}
export class GetOsuBeatmapsetsSearchQueryParamsDto extends createZodDto(GetOsuBeatmapsetsSearchQueryParamsSchema) {}
