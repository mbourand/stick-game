import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = (beatmapId: string, scoreVersion: number, modded: boolean) =>
  fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId }, queryParams: { scoreVersion, modded } });

export const scoresBeatmapLeaderboardQueryOptions = (beatmapId: string, scoreVersion: number, modded: boolean) =>
  queryOptions({
    queryKey: ["scores", beatmapId, "leaderboard", scoreVersion, modded],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId, scoreVersion, modded),
    staleTime: 1000 * 60 * 15,
  });
