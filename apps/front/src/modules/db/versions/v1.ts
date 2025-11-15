import Dexie, { EntityTable } from "dexie";

export type V1BeatmapEntity = {
  id: number;
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

export type V1FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

const v1db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<V1BeatmapEntity, "id">;
  files: EntityTable<V1FileEntity, "id">;
};

export const v1DexieDatabase = () => {
  v1db.version(1).stores({
    beatmaps: "++id, osuId, content, gameplayBackgroundId, listBackgroundId, createdAt",
    files: "++id, content, extension, createdAt",
  });
};
