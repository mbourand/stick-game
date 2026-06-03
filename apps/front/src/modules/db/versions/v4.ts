import { getScoreMultiplier } from "@/modules/game/mods/mods";
import Dexie, { EntityTable } from "dexie";

export type V4BeatmapEntity = {
  /** @deprecated in favor of idv2 */
  id: number;
  idv2: string;
  title: string;
  artist: string;
  creator: string;
  difficulty: number;
  content: Blob;
  gameplayBackgroundId: number;
  listBackgroundId: number;
  audioId: number;
  createdAt: Date;
};

export type V4FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

export type V4LocalScoreEntity = {
  id: number;
  beatmapIdv2: string;
  playerName: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  missCount: number;
  mehCount: number;
  goodCount: number;
  greatCount: number;
  perfectCount: number;
  /** Human-readable mod summary (e.g. "Rate ×1.50"); "" / undefined for no-mods plays. */
  mods?: string;
  submissionTime: Date;
  scoreVersion: number;
};

export const v4db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<V4BeatmapEntity, "id">;
  files: EntityTable<V4FileEntity, "id">;
  localScores: EntityTable<V4LocalScoreEntity, "id">;
};

export const v4DexieDatabase = () => {
  v4db
    .version(4)
    .stores({
      beatmaps: "++id, idv2, content, gameplayBackgroundId, listBackgroundId, createdAt",
      files: "++id, content, extension, createdAt",
      localScores:
        "++id, beatmapIdv2, playerName, score, maxCombo, accuracy, missCount, mehCount, goodCount, greatCount, perfectCount, submissionTime, scoreVersion",
    })
    .upgrade(async (transaction) => {
      // The rate score multiplier changed from a raw 1:1 rate to a diminishing-
      // returns curve. Old scores baked the raw rate into the value, so rescale
      // each modded play by newMultiplier/rate. Rates <= 1 are unchanged (the
      // curve is identical there), so only rate > 1 actually moves.
      await transaction
        .table("localScores")
        .toCollection()
        .modify((score: V4LocalScoreEntity) => {
          const rate = Number.parseFloat(score.mods?.match(/[0-9.]+/)?.[0] ?? "");
          if (!Number.isFinite(rate) || rate <= 1) return;
          score.score = Math.round((score.score * getScoreMultiplier({ rate })) / rate);
        });
      console.log("Migration v4 terminée (scores rejaugés sur la nouvelle courbe de rate).");
    });
};
