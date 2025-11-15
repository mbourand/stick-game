import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { useQuery } from "@tanstack/react-query";

const fetchBeatmapsetsSearch = async (query: string) => {
  const data = await fetchBackend("/osu/beatmapsets/search", { queryParams: { q: query } });
  return data;
};

export const useBeatmapsetsSearch = (query: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["osu", "beatmapsets", "search", query],
    queryFn: () => fetchBeatmapsetsSearch(query),
    enabled,
    staleTime: 1000 * 60 * 15,
  });
};
