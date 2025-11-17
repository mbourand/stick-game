import { latestDb } from "@/modules/db/versions";
import { queryOptions } from "@tanstack/react-query";

export const localScoresBeatmapLeaderboardQueryOptions = (beatmapId: string) =>
  queryOptions({
    queryKey: ["local-db", "local-scores", beatmapId],
    queryFn: async () => {
      const scores = await latestDb.localScores
        .where("beatmapIdv2")
        .equals(beatmapId)
        .and((score) => score.scoreVersion === 2)
        .sortBy("score");
      return scores.reverse();
    },
  });
