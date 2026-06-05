import { latestDb } from "@/modules/db/versions";
import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { authStore } from "@/modules/auth/authStore";

type SubmitScoreParams = {
  accuracy: number;
  score: number;
  maxCombo: number;
  /** Guest display name — used for the local score only when signed out. */
  playerName: string;
  missCount: number;
  mehCount: number;
  goodCount: number;
  greatCount: number;
  perfectCount: number;
  beatmapId: string;
  /** Whether any mod was active — selects the modded vs no-mods leaderboard. */
  modded: boolean;
  /** Human-readable mod summary (e.g. "Rate ×1.50"), shown as a leaderboard badge. */
  mods: string;
};

/**
 * Persist a finished play. The local (Dexie) copy is always saved under the
 * guest name; the global submission only happens when logged in (the account is
 * the identity — the backend derives it from the session token). `loggedIn`
 * lets the UI distinguish "not ranked because offline" from "not signed in".
 */
export const submitScore = async (params: SubmitScoreParams) => {
  const session = authStore.get();
  const loggedIn = session !== null;
  // Attribute the local score to the account when signed in, so the local board
  // matches the global one; fall back to the guest name only when signed out.
  const localPlayerName = session?.user.username ?? params.playerName;

  const localTask = latestDb.localScores.add({
    beatmapIdv2: params.beatmapId,
    playerName: localPlayerName,
    score: params.score,
    maxCombo: params.maxCombo,
    accuracy: params.accuracy,
    missCount: params.missCount,
    mehCount: params.mehCount,
    goodCount: params.goodCount,
    greatCount: params.greatCount,
    perfectCount: params.perfectCount,
    mods: params.mods,
    submissionTime: new Date(),
    scoreVersion: LATEST_SCORE_VERSION,
  });

  const backendTask = loggedIn
    ? fetchBackend("/scores/submit", {
        body: {
          beatmapId: params.beatmapId,
          score: params.score,
          maxCombo: params.maxCombo,
          accuracy: params.accuracy,
          missCount: params.missCount,
          mehCount: params.mehCount,
          goodCount: params.goodCount,
          greatCount: params.greatCount,
          perfectCount: params.perfectCount,
          modded: params.modded,
          mods: params.mods,
        },
      })
    : Promise.resolve(null);

  const [localResult, backendSettled] = await Promise.allSettled([localTask, backendTask]);

  return { backendResult: loggedIn ? backendSettled : null, localResult, loggedIn };
};
