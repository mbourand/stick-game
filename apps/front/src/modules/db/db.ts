import { pruneDuplicateBeatmaps } from "@/modules/db/cleanup";
import { v1DexieDatabase } from "@/modules/db/versions/v1";
import { v2DexieDatabase } from "@/modules/db/versions/v2";
import { v3DexieDatabase } from "@/modules/db/versions/v3";

export { latestDb } from "./versions";

v1DexieDatabase();
v2DexieDatabase();
v3DexieDatabase();

// One-shot cleanup of pre-existing duplicates (idempotent — safe to run on
// every boot; no-op once the DB is clean).
void pruneDuplicateBeatmaps();
