import { latestDb } from "@/modules/db/versions";
import { queryOptions } from "@tanstack/react-query";

export const localScoresBeatmapLeaderboardQueryOptions = (beatmapId: string, scoreVersion: number) =>
  queryOptions({
    queryKey: ["local-db", "local-scores", beatmapId, scoreVersion],
    queryFn: async () => {
      const scores = await latestDb.localScores
        .where("beatmapIdv2")
        .equals(beatmapId)
        .and((score) => score.scoreVersion === scoreVersion)
        .sortBy("score");
      return scores.reverse();
    },
  });
