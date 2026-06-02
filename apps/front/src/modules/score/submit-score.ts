import { latestDb } from "@/modules/db/versions";
import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";

type SubmitScoreParams = {
  accuracy: number;
  score: number;
  maxCombo: number;
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

export const submitScore = async (params: SubmitScoreParams) => {
  const [backendResult, localResult] = await Promise.allSettled([
    fetchBackend("/scores/submit", { body: params }),
    latestDb.localScores.add({
      beatmapIdv2: params.beatmapId,
      playerName: params.playerName,
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
    }),
  ]);

  return { backendResult, localResult };
};
