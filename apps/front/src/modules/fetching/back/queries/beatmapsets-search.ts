import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

const fetchBeatmapsetsSearch = async (query: string) =>
  fetchBackend("/osu/beatmapsets/search", { queryParams: { q: query } });

export const beatmapsetsSearchQueryOptions = (query: string) =>
  queryOptions({
    queryKey: ["osu", "beatmapsets", "search", query],
    queryFn: () => fetchBeatmapsetsSearch(query),
    staleTime: 1000 * 60 * 15,
  });
