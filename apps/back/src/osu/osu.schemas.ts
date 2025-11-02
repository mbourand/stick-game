import z from "zod";

export const BeatmapSchema = z.object({
  url: z.string(),
  mode: z.string(),
  difficulty_rating: z.number(),
  id: z.number(),
});

export const BeatmapSetSchema = z.object({
  beatmaps: z.array(BeatmapSchema),
  artist: z.string(),
  title: z.string(),
  creator: z.string(),
  id: z.number(),
  covers: z.record(z.string(), z.string()),
});
