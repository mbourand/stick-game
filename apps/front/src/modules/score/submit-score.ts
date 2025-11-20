import { latestDb } from "@/modules/db/versions";
import { fetchBackend } from "@/modules/fetching/back/fetchBackend";

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
      submissionTime: new Date(),
      scoreVersion: 3,
    }),
  ]);

  return { backendResult, localResult };
};
