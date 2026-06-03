import { v4db, type V4BeatmapEntity } from "./versions/v4";

/**
 * Idempotent cleanup: removes duplicate beatmap rows (same `idv2`), keeping
 * the most recently created of each group, then drops any file rows that no
 * surviving beatmap references.
 *
 * The schema indexes `idv2` but doesn't enforce uniqueness, so older builds
 * of the downloader could leave duplicate rows behind. Runs once on boot
 * (called from db.ts); safe to re-run any time.
 */
export async function pruneDuplicateBeatmaps(): Promise<void> {
  const all = await v4db.beatmaps.orderBy("createdAt").toArray();
  // orderBy returns ascending; reverse so we scan newest-first and keep the
  // most recent of each duplicate group.
  all.reverse();

  const seen = new Set<string>();
  const idsToDelete: number[] = [];
  for (const b of all) {
    if (seen.has(b.idv2)) {
      idsToDelete.push(b.id);
    } else {
      seen.add(b.idv2);
    }
  }

  if (idsToDelete.length > 0) {
    await v4db.beatmaps.bulkDelete(idsToDelete);
    console.log(`Pruned ${idsToDelete.length} duplicate beatmap row(s)`);
  }

  await pruneOrphanedFiles();
}

/**
 * Delete every file row that is no longer referenced by any beatmap as audio,
 * gameplay background, or list background.
 */
async function pruneOrphanedFiles(): Promise<void> {
  const beatmaps = await v4db.beatmaps.toArray();
  const referenced = new Set<number>();
  for (const b of beatmaps) {
    if (b.audioId != null) referenced.add(b.audioId);
    if (b.gameplayBackgroundId != null) referenced.add(b.gameplayBackgroundId);
    if (b.listBackgroundId != null) referenced.add(b.listBackgroundId);
  }

  const allFiles = await v4db.files.toArray();
  const orphanIds = allFiles.filter((f) => !referenced.has(f.id)).map((f) => f.id);
  if (orphanIds.length > 0) {
    await v4db.files.bulkDelete(orphanIds);
    console.log(`Pruned ${orphanIds.length} orphaned file row(s)`);
  }
}

/**
 * Remove a beatmap row plus any of its referenced files that no other beatmap
 * still uses. Called by the downloader so re-downloading an existing set
 * overwrites cleanly without leaking the previous import's audio/background
 * blobs.
 */
export async function deleteBeatmapAndOrphanedFiles(beatmap: V4BeatmapEntity): Promise<void> {
  await v4db.beatmaps.delete(beatmap.id);
  const candidateFileIds = [
    beatmap.audioId,
    beatmap.gameplayBackgroundId,
    beatmap.listBackgroundId,
  ].filter((id): id is number => id != null);
  for (const fileId of candidateFileIds) {
    if (await isFileReferenced(fileId)) continue;
    await v4db.files.delete(fileId);
  }
}

async function isFileReferenced(fileId: number): Promise<boolean> {
  const ref = await v4db.beatmaps
    .filter(
      (b) =>
        b.audioId === fileId ||
        b.gameplayBackgroundId === fileId ||
        b.listBackgroundId === fileId,
    )
    .first();
  return ref !== undefined;
}
