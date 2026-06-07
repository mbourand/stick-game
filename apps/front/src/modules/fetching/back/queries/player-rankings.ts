import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import type { PlayerRankingMetric } from "@/modules/game/scenes/Leaderboards/metrics";
import { zPlayerRankEntry } from "@tau/back-schemas";
import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";

/** One row of a player-ranking board (account + its value for the metric). */
export type PlayerRankEntry = z.infer<typeof zPlayerRankEntry>;

/** Boards change slowly (the backend recomputes them on a debounce) — cache a while. */
const RANKINGS_STALE_TIME = 1000 * 60 * 5;

export const playerRankingsQueryOptions = (metric: PlayerRankingMetric, limit = 50, offset = 0) =>
  queryOptions({
    queryKey: ["leaderboards", "players", metric, limit, offset],
    queryFn: () => fetchBackend("/leaderboards/players", { queryParams: { metric, limit, offset } }),
    staleTime: RANKINGS_STALE_TIME,
  });

/** The signed-in player's own standing on a board. Disabled when logged out. */
export const myPlayerRankQueryOptions = (metric: PlayerRankingMetric, enabled: boolean) =>
  queryOptions({
    queryKey: ["leaderboards", "players", "me", metric],
    queryFn: () => fetchBackend("/leaderboards/players/me", { queryParams: { metric } }),
    staleTime: RANKINGS_STALE_TIME,
    enabled,
  });
