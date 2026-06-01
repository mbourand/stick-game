import z from "zod";
import { createZodDto } from "nestjs-zod";

export const GetOsuDailyDifficultySchema = z.object({
  id: z.number(),
  version: z.string(),
  stars: z.number(),
});

export const GetOsuDailyResponseSchema = z.object({
  /** UTC day this pick is valid for, formatted YYYY-MM-DD. */
  date: z.string(),
  beatmapsetId: z.number(),
  title: z.string(),
  artist: z.string(),
  creator: z.string(),
  coverUrl: z.string(),
  lengthSeconds: z.number(),
  /** osu! beatmap ids of the osu!standard difficulties; become "osu_<id>" on the client. */
  beatmapIds: z.array(z.number()),
  difficulties: z.array(GetOsuDailyDifficultySchema),
  /** osu! star range spanned by the difficulties, for display. */
  starRange: z.object({ min: z.number(), max: z.number() }),
  /** True when the strict criteria could not be met and filters were relaxed. */
  degraded: z.boolean(),
});

export type GetOsuDailyResponse = z.infer<typeof GetOsuDailyResponseSchema>;

export const GetOsuDailyQueryParamsSchema = z.object({});

export class GetOsuDailyResponseDto extends createZodDto(GetOsuDailyResponseSchema) {}
export class GetOsuDailyQueryParamsDto extends createZodDto(GetOsuDailyQueryParamsSchema) {}
