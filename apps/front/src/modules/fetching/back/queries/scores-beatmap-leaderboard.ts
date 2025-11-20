import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = (beatmapId: string, scoreVersion: number) =>
  fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId }, queryParams: { scoreVersion } });

export const scoresBeatmapLeaderboardQueryOptions = (beatmapId: string, scoreVersion: number) =>
  queryOptions({
    queryKey: ["scores", beatmapId, "leaderboard", scoreVersion],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId, scoreVersion),
    staleTime: 1000 * 60 * 15,
  });
