import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { useQuery } from "@tanstack/react-query";

export const fetchScoresBeatmapLeaderboard = async (beatmapId: number) => {
  const data = await fetchBackend("/scores/:beatmapId/leaderboard", { params: { beatmapId } });
  return data;
};

export const useScoresBeatmapLeaderboard = (beatmapId: number, enabled: boolean) => {
  return useQuery({
    queryKey: ["scores", beatmapId, "leaderboard"],
    queryFn: () => fetchScoresBeatmapLeaderboard(beatmapId),
    enabled,
    staleTime: 1000 * 60 * 15,
  });
};
