import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { useQuery } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = async (beatmapId: string) => {
  const data = await fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId } });
  return data;
};

export const useScoresBeatmapLeaderboard = (beatmapId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["scores", beatmapId, "leaderboard"],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId),
    enabled,
    staleTime: 1000 * 60 * 15,
  });
};
