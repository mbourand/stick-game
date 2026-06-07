import { useQuery } from "@tanstack/react-query";
import type { LeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { useAuth } from "@/modules/auth/useAuth";

/** A single board row normalised across the global/modded/local sources. */
export type LeaderboardRow = {
  key: string;
  playerName: string;
  /** Account avatar URL; null falls back to the player's initial. */
  avatarUrl?: string | null;
  score: number;
  accuracy: number;
  maxCombo: number;
  missCount: number;
  /** Human-readable mod summary (e.g. "Rate ×1.50"); "" / undefined for no-mods plays. */
  mods?: string;
  /** True when this row belongs to the signed-in player. */
  isSelf: boolean;
  /** Dexie id for local-board rows (used to pinpoint the just-played run); absent for global rows. */
  localId?: number | null;
};

export type LeaderboardRowsResult = {
  rows: LeaderboardRow[];
  isLoading: boolean;
  isError: boolean;
};

/**
 * Fetch + normalise one beatmap board into ranked rows. All three sources are
 * queried (cheap, cached) and the active tab is selected, so switching tabs is
 * instant. Global/modded come back capped at the backend's top 50; local is the
 * player's full unlimited history. The shared shape lets the compact widget and
 * the full leaderboard view render the same `ScoreRow`s.
 */
export function useBeatmapLeaderboardRows(beatmapId: string, tab: LeaderboardTab): LeaderboardRowsResult {
  const session = useAuth();
  const selfId = session?.user.id ?? null;

  const localQuery = useQuery(localScoresBeatmapLeaderboardQueryOptions(beatmapId, LATEST_SCORE_VERSION));
  const noModsQuery = useQuery(scoresBeatmapLeaderboardQueryOptions(beatmapId, LATEST_SCORE_VERSION, false));
  const moddedQuery = useQuery(scoresBeatmapLeaderboardQueryOptions(beatmapId, LATEST_SCORE_VERSION, true));

  if (tab === "local") {
    const rows: LeaderboardRow[] = (localQuery.data ?? []).map((e, i) => {
      const isSelf = selfId !== null && e.userId === selfId;
      return {
        key: `${e.id ?? i}`,
        playerName: e.playerName,
        // Only the current account's own rows get an avatar — guests and other
        // accounts fall back to the default disc.
        avatarUrl: isSelf ? session?.user.avatarUrl : null,
        score: e.score,
        accuracy: e.accuracy,
        maxCombo: e.maxCombo,
        missCount: e.missCount,
        mods: e.mods,
        isSelf,
        localId: e.id ?? null,
      };
    });
    return { rows, isLoading: localQuery.isLoading, isError: localQuery.isError };
  }

  const globalQuery = tab === "modded" ? moddedQuery : noModsQuery;
  const rows: LeaderboardRow[] = (globalQuery.data?.leaderboard ?? []).map((e, i) => ({
    key: `${e.userId}-${i}`,
    playerName: e.username,
    avatarUrl: e.avatarUrl,
    score: e.score,
    accuracy: e.accuracy,
    maxCombo: e.maxCombo,
    missCount: e.missCount,
    mods: e.mods,
    isSelf: selfId !== null && e.userId === selfId,
  }));
  return { rows, isLoading: globalQuery.isLoading, isError: globalQuery.isError };
}
