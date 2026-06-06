import { migrationProgressStore } from "@/modules/db/migrationProgress";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import Dexie, { EntityTable } from "dexie";

const MIGRATION_LABEL = "Recalculating difficulty";

export type V5BeatmapEntity = {
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

export type V5FileEntity = {
  id: number;
  content: Blob;
  extension: string;
  createdAt: Date;
};

export type V5LocalScoreEntity = {
  id: number;
  beatmapIdv2: string;
  playerName: string;
  userId?: string;
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

export const v5db = new Dexie("tau") as Dexie & {
  beatmaps: EntityTable<V5BeatmapEntity, "id">;
  files: EntityTable<V5FileEntity, "id">;
  localScores: EntityTable<V5LocalScoreEntity, "id">;
};

export const v5DexieDatabase = () => {
  v5db
    .version(5)
    .stores({
      beatmaps: "++id, idv2, content, gameplayBackgroundId, listBackgroundId, createdAt",
      files: "++id, content, extension, createdAt",
      localScores:
        "++id, beatmapIdv2, playerName, score, maxCombo, accuracy, missCount, mehCount, goodCount, greatCount, perfectCount, submissionTime, scoreVersion",
    })
    .upgrade(async (transaction) => {
      // The difficulty rating moved from speed-only to speed + direction/speed
      // variation (acceleration). Stored ratings were computed with the old
      // formula, so recompute each one from its .osu blob through the same
      // pipeline a fresh import uses. Only `difficulty` is touched.
      const beatmaps = transaction.table("beatmaps");
      const all = (await beatmaps.toArray()) as V5BeatmapEntity[];

      // Publish progress for the blocking overlay (MigrationOverlay). Nothing to
      // rebuild → leave the store idle so no overlay ever flashes.
      const total = all.length;
      if (total > 0) {
        migrationProgressStore.set({ phase: "running", label: MIGRATION_LABEL, completed: 0, total, detail: null });
      }

      let updated = 0;
      for (let i = 0; i < all.length; i++) {
        const beatmap = all[i];
        try {
          // blob.text() is a non-IndexedDB promise — wrap it so Dexie keeps the
          // upgrade transaction alive across the await instead of auto-committing.
          const osuText = await Dexie.waitFor(beatmap.content.text());
          const parsed = convertFromOsu(osuText, (p) => p);
          if (parsed.difficulty !== beatmap.difficulty) {
            await beatmaps.update(beatmap.id, { difficulty: parsed.difficulty });
            updated++;
          }
        } catch (e) {
          // Isolate per-map failures (a malformed blob shouldn't abort the whole
          // migration) — the map just keeps its old rating.
          console.error(`Migration v5: failed to recompute difficulty for ${beatmap.idv2}`, e);
        }
        migrationProgressStore.set({
          phase: "running",
          label: MIGRATION_LABEL,
          completed: i + 1,
          total,
          detail: beatmap.title,
        });
      }

      if (total > 0) {
        migrationProgressStore.set({ phase: "done", label: MIGRATION_LABEL, total });
      }
      console.log(`Migration v5 terminée (${updated} difficultés recalculées sur le nouvel algorithme).`);
    });
};
