import Dexie, { EntityTable } from "dexie";

type BeatmapEntity = {
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

type FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

export const db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<BeatmapEntity, "id">;
  files: EntityTable<FileEntity, "id">;
};

db.version(1).stores({
  beatmaps: "++id, osuId, content, gameplayBackgroundId, listBackgroundId, createdAt",
  files: "++id, content, extension, createdAt",
});
