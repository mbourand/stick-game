import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

const fetchDaily = async () => fetchBackend("/osu/daily", { queryParams: {} });

export const dailyQueryOptions = () =>
  queryOptions({
    queryKey: ["osu", "daily"],
    queryFn: fetchDaily,
    // The pick is stable for the whole UTC day; refetch occasionally to roll over.
    staleTime: 1000 * 60 * 60,
  });

export type DailyBeatmapset = Awaited<ReturnType<typeof fetchDaily>>;
