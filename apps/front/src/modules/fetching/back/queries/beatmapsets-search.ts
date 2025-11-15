import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions, UseQueryOptions } from "@tanstack/react-query";

const fetchBeatmapsetsSearch = async (query: string) =>
  fetchBackend("/osu/beatmapsets/search", { queryParams: { q: query } });

export const createBeatmapsetsSearchQueryOptions = (
  query: string,
  options?: Omit<UseQueryOptions<Awaited<ReturnType<typeof fetchBeatmapsetsSearch>>>, "queryKey" | "queryFn">,
) =>
  queryOptions({
    queryKey: ["osu", "beatmapsets", "search", query],
    queryFn: () => fetchBeatmapsetsSearch(query),
    staleTime: 1000 * 60 * 15,
    ...options,
  });
