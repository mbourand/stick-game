import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = (beatmapId: string) =>
  fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId } });

export const scoresBeatmapLeaderboardQueryOptions = (beatmapId: string) =>
  queryOptions({
    queryKey: ["scores", beatmapId, "leaderboard"],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId),
    staleTime: 1000 * 60 * 15,
  });
