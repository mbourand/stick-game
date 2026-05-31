import { deleteBeatmapAndOrphanedFiles } from "@/modules/db/cleanup";
import { latestDb } from "@/modules/db/db";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import JSZip from "jszip";

/**
 * Progress emitted while a beatmapset is being installed. The two phases run
 * back to back: first the archive is streamed off the network (`downloading`,
 * with byte counts so a determinate bar is possible when the server reports a
 * Content-Length), then every difficulty inside it is unpacked into IndexedDB
 * (`installing`, counted per difficulty like {@link seedDefaultMaps}).
 */
export type InstallProgress =
  | { phase: "downloading"; receivedBytes: number; totalBytes: number | null }
  | { phase: "installing"; completed: number; total: number };

export type InstallOptions = {
  onProgress?: (progress: InstallProgress) => void;
};

/** Nerinyan mirror — strips hitsounds + video to keep the archive small. */
const archiveUrl = (beatmapsetId: number) =>
  `https://api.nerinyan.moe/d/${beatmapsetId}?NoHitSound=1&NoVideo=1`;

/** Coalesce download progress to at most one tick per this many bytes. */
const DOWNLOAD_PROGRESS_STEP_BYTES = 64 * 1024;

/**
 * Download a beatmapset archive and unpack each difficulty into IndexedDB,
 * reporting progress through `onProgress`. Mirrors the conversion pipeline used
 * by the default-map seeder so downloaded maps are indistinguishable from
 * built-in ones.
 *
 * Per-difficulty failures are isolated and logged (a bad .osu doesn't fail the
 * set); a failed download or a non-OK response rejects the whole call. Re-
 * downloading a set overwrites by `idv2` (drops the old row + its now-orphaned
 * files first), so a repeat install never silently duplicates.
 */
export async function installBeatmapset(
  beatmapsetId: number,
  { onProgress }: InstallOptions = {},
): Promise<void> {
  const archive = await downloadArchive(beatmapsetId, onProgress);
  await installFromArchive(archive, onProgress);
}

/** Fetch the archive, streaming the body so byte-level progress is reported. */
async function downloadArchive(
  beatmapsetId: number,
  onProgress: InstallOptions["onProgress"],
): Promise<JSZip> {
  const response = await fetch(archiveUrl(beatmapsetId));
  if (!response.ok) {
    throw new Error(
      `Beatmapset ${beatmapsetId} download failed: ${response.status} ${response.statusText}`,
    );
  }
  const bytes = await readBodyWithProgress(response, onProgress);
  return new JSZip().loadAsync(bytes);
}

/**
 * Read a response body to completion, emitting `downloading` progress as bytes
 * arrive. Falls back to a single `arrayBuffer()` read where the body isn't a
 * stream. The final tick clamps `totalBytes` to the received count so the bar
 * can reach the end of the download phase even when no Content-Length was sent.
 */
async function readBodyWithProgress(
  response: Response,
  onProgress: InstallOptions["onProgress"],
): Promise<Uint8Array> {
  const totalBytes = Number(response.headers.get("content-length")) || null;

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.({ phase: "downloading", receivedBytes: bytes.length, totalBytes: bytes.length });
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastEmitted = 0;

  onProgress?.({ phase: "downloading", receivedBytes: 0, totalBytes });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (received - lastEmitted >= DOWNLOAD_PROGRESS_STEP_BYTES) {
      lastEmitted = received;
      onProgress?.({ phase: "downloading", receivedBytes: received, totalBytes });
    }
  }
  onProgress?.({ phase: "downloading", receivedBytes: received, totalBytes: totalBytes ?? received });

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Unpack every `.osu` in the archive into IndexedDB, one difficulty at a time. */
async function installFromArchive(
  archive: JSZip,
  onProgress: InstallOptions["onProgress"],
): Promise<void> {
  const allFiles = Object.values(archive.files);
  const difficultyFiles = allFiles.filter((file) => file.name.endsWith(".osu"));
  const total = difficultyFiles.length;

  // Difficulties in a set share their audio (and usually their background)
  // file. Dedupe by filename so each underlying asset is stored once and
  // referenced by every difficulty that uses it.
  const fileIdByName = new Map<string, number>();

  let completed = 0;
  onProgress?.({ phase: "installing", completed, total });
  for (const file of difficultyFiles) {
    try {
      await installDifficulty(file, allFiles, fileIdByName);
    } catch (e) {
      // Isolate per-difficulty failures: a single unparseable .osu shouldn't
      // sink the rest of the set.
      console.error("Failed to import a beatmap from the beatmapset:", e);
    } finally {
      completed++;
      onProgress?.({ phase: "installing", completed, total });
    }
  }
}

/** Parse one `.osu`, store its assets, and write the beatmap row. */
async function installDifficulty(
  difficultyFile: JSZip.JSZipObject,
  allFiles: JSZip.JSZipObject[],
  fileIdByName: Map<string, number>,
): Promise<void> {
  const content = await difficultyFile.async("string");
  // Identity resolver: leave audioUrl/backgroundUrl as the raw filenames the
  // .osu declares so we can match them against the archive's entries.
  const parsed = convertFromOsu(content, (path) => path);

  // Re-download = overwrite: drop the existing row + any of its files that no
  // other beatmap references, then fall through to the normal import path. The
  // schema only indexes idv2 (no uniqueness constraint), so without this a
  // second import would silently duplicate.
  const existing = await latestDb.beatmaps.where("idv2").equals(parsed.id).first();
  if (existing) {
    console.log(`Overwriting existing beatmap ${parsed.id}`);
    await deleteBeatmapAndOrphanedFiles(existing);
  }

  const backgroundFile = allFiles.find((f) => f.name === parsed.backgroundUrl);
  const audioFile = allFiles.find((f) => f.name === parsed.audioUrl);

  // Skip difficulties whose .osu references files absent from the archive —
  // they're unplayable and would otherwise persist with null asset ids,
  // breaking the preview/playback path.
  if (!backgroundFile || !audioFile) {
    const missing = [!audioFile && "audio", !backgroundFile && "background"]
      .filter(Boolean)
      .join(" + ");
    console.warn(`Skipping beatmap ${parsed.id}: missing ${missing} file in archive`);
    return;
  }

  const backgroundFileId = await ensureFileStored(backgroundFile, fileIdByName);
  const audioFileId = await ensureFileStored(audioFile, fileIdByName);

  await latestDb.beatmaps.add({
    idv2: parsed.id,
    title: parsed.title,
    artist: parsed.artist,
    creator: parsed.creator,
    difficulty: parsed.difficulty,
    content: new Blob([content]),
    gameplayBackgroundId: backgroundFileId,
    // Reuse the difficulty's own background as the selection-list background.
    // (The previous external cover fetch used `no-cors`, whose opaque response
    // reads as 0 bytes — every set's list background was being stored empty.)
    listBackgroundId: backgroundFileId,
    audioId: audioFileId,
    createdAt: new Date(),
  });
}

/** Store an archive entry as a file row, reusing an already-stored one by name. */
async function ensureFileStored(
  file: JSZip.JSZipObject,
  fileIdByName: Map<string, number>,
): Promise<number> {
  const cached = fileIdByName.get(file.name);
  if (cached !== undefined) return cached;

  const content = await file.async("arraybuffer");
  const id = await latestDb.files.add({
    content: new Blob([content]),
    createdAt: new Date(),
    extension: file.name.split(".").pop() || "",
  });
  fileIdByName.set(file.name, id);
  return id;
}
