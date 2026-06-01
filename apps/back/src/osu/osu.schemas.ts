import z from "zod";

export const BeatmapSchema = z.object({
  url: z.string(),
  mode: z.string(),
  mode_int: z.number(),
  difficulty_rating: z.number(),
  total_length: z.number(),
  version: z.string(),
  id: z.number(),
});

export const BeatmapSetSchema = z.object({
  beatmaps: z.array(BeatmapSchema),
  artist: z.string(),
  title: z.string(),
  creator: z.string(),
  id: z.number(),
  status: z.string(),
  covers: z.record(z.string(), z.string()),
});
