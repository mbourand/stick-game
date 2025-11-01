import z from "zod";
import { BeatmapSetSchema } from "../osu.schemas";
import { createZodDto } from "nestjs-zod";

export const BeatmapsetsSearchResponseSchema = z.object({
  beatmapsets: z.array(BeatmapSetSchema),
});

export const BeatmapsetsSearchQueryParamsSchema = z.object({
  q: z.string().min(3).max(100).optional().default(""),
});

export class BeatmapsetsSearchResponseDto extends createZodDto(BeatmapsetsSearchResponseSchema) {}
export class BeatmapsetsSearchQueryParamsDto extends createZodDto(BeatmapsetsSearchQueryParamsSchema) {}
