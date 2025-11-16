import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import Dexie, { EntityTable } from "dexie";

export type V2BeatmapEntity = {
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

export type V2FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

export type V2LocalScoreEntity = {
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
};

export const v2db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<V2BeatmapEntity, "id">;
  files: EntityTable<V2FileEntity, "id">;
  localScores: EntityTable<V2LocalScoreEntity, "id">;
};

export const v2DexieDatabase = () => {
  v2db
    .version(2)
    .stores({
      beatmaps: "++id, idv2, content, gameplayBackgroundId, listBackgroundId, createdAt",
      files: "++id, content, extension, createdAt",
      localScores:
        "++id, beatmapIdv2, playerName, score, maxCombo, accuracy, missCount, mehCount, goodCount, greatCount, perfectCount, submissionTime",
    })
    .upgrade(async (transaction) => {
      await transaction
        .table("beatmaps")
        .toCollection()
        .each(async (beatmap) => {
          const blobText = await Dexie.waitFor(beatmap.content.text());
          const parsed = convertFromOsu(blobText, (p) => p);
          if (parsed && parsed.id) {
            await transaction.table("beatmaps").update(beatmap.id, { idv2: parsed.id });
          } else {
            console.warn(`Could not extract idv2 for beatmap id ${beatmap.id}, deleting it`);
            await transaction.table("beatmaps").delete(beatmap.id);
          }
        });

      console.log("Migration v2 terminée (idv2 écrits quand possible).");
    });
};
