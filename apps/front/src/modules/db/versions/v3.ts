import Dexie, { EntityTable } from "dexie";

export type V3BeatmapEntity = {
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

export type V3FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

export type V3LocalScoreEntity = {
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
  submissionTime: Date;
  scoreVersion: number;
};

export const v3db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<V3BeatmapEntity, "id">;
  files: EntityTable<V3FileEntity, "id">;
  localScores: EntityTable<V3LocalScoreEntity, "id">;
};

export const v3DexieDatabase = () => {
  v3db
    .version(3)
    .stores({
      beatmaps: "++id, idv2, content, gameplayBackgroundId, listBackgroundId, createdAt",
      files: "++id, content, extension, createdAt",
      localScores:
        "++id, beatmapIdv2, playerName, score, maxCombo, accuracy, missCount, mehCount, goodCount, greatCount, perfectCount, submissionTime, scoreVersion",
    })
    .upgrade(async (transaction) => {
      await transaction
        .table("localScores")
        .toCollection()
        .modify((score) => {
          score.scoreVersion = 1;
        });
      console.log("Migration v3 terminée.");
    });
};
