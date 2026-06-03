import { Store } from "@/modules/game/engine/state/Store";

/**
 * Progress of a one-time Dexie schema migration, published from inside a
 * version `.upgrade()` so the UI can show a blocking loading bar while it runs.
 *
 * Migrations fire lazily when the DB first opens (well before React mounts), so
 * this lives at module level: the upgrade writes here as it works, and whatever
 * overlay is mounted reads the latest. A fresh DB skips upgrades entirely, so
 * brand-new players never see this — only existing players whose stored data is
 * being rebuilt do.
 */
export type MigrationProgress =
  | { phase: "idle" }
  | { phase: "running"; label: string; completed: number; total: number; detail: string | null }
  | { phase: "done"; label: string; total: number };

export const migrationProgressStore = new Store<MigrationProgress>({ phase: "idle" });
