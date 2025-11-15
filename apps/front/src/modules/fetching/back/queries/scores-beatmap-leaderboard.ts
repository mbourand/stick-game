import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions, UseQueryOptions } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = (beatmapId: string) =>
  fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId } });

export const createScoresBeatmapLeaderboardQueryOptions = (
  beatmapId: string,
  options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof fetchScoresBeatmapLeaderboard>>>, "queryKey" | "queryFn">,
) =>
  queryOptions({
    queryKey: ["scores", beatmapId, "leaderboard"],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId),
    staleTime: 1000 * 60 * 15,
    ...options,
  });
