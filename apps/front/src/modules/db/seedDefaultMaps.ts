import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import { DEFAULT_MAP_FOLDERS } from "./defaultMaps.manifest";
// Import from the db barrel (not ./versions) so the Dexie schema is configured
// as a side effect before we touch it — this module is kicked from the UI at
// boot, not from db.ts's own import side-effect.
import { latestDb } from "./db";

/**
 * Set in localStorage once the default maps have been imported. Its presence
 * (any value) means "already seeded" — we never re-seed. Default maps only
 * exist to give a brand-new player an easy first game, so if the bundled set
 * later changes we don't care whether existing players pick up the new ones.
 */
const SEED_MARKER_KEY = "tau:defaultMapsSeeded";

/** Progress reported by `seedDefaultMaps` while a first-run import is underway. */
export type SeedProgress = {
  /** Maps processed so far this run (imported, skipped, or failed). */
  completed: number;
  /** Total maps that will be processed this run. */
  total: number;
  /** Title of the map just processed, or null if it failed before parsing. */
  title: string | null;
};

/**
 * In-flight run, shared so concurrent/duplicate callers (e.g. React StrictMode
 * double-invoking an effect) dedupe to a single seeding pass instead of racing
 * to insert the same maps twice.
 */
let inFlight: Promise<void> | null = null;

/**
 * Public entry point — see {@link runSeed}. Dedupes to one pass per page load;
 * only the first caller's `onProgress` is observed.
 */
export function seedDefaultMaps(onProgress?: (progress: SeedProgress) => void): Promise<void> {
  inFlight ??= runSeed(onProgress);
  return inFlight;
}

/**
 * One-time import of the built-in beatmaps shipped under /public into IndexedDB
 * so new players have maps to play immediately, with zero friction. Each .osu
 * is run through the exact same pipeline the downloader uses (convertFromOsu →
 * blob rows), so default maps end up indistinguishable from downloaded ones:
 * they get a computed difficulty rating, an `idv2`, and participate in filters
 * and leaderboards like any other map.
 *
 * Idempotency: gated on a localStorage marker, so it runs once per profile.
 * After that first run, deleting a default map sticks — we never
 * re-seed it. (Tradeoff: clearing IndexedDB without also clearing localStorage
 * means defaults won't come back; acceptable for a manual devtools action.)
 *
 * Per-map failures are isolated and logged, mirroring the downloader. If every
 * map fails (e.g. offline at first boot) the marker is left unset so the next
 * launch retries.
 *
 * Reports progress through `onProgress` (once up front with completed=0, then
 * after each map) so the UI can drive a first-run import overlay. When there's
 * nothing to do (already seeded), it returns without ever calling `onProgress`.
 */
async function runSeed(onProgress?: (progress: SeedProgress) => void): Promise<void> {
  // Browser-only: relies on fetch (relative URLs), Blob, and localStorage.
  if (typeof window === "undefined") return;

  let marker: string | null = null;
  try {
    marker = window.localStorage.getItem(SEED_MARKER_KEY);
  } catch {
    // localStorage can throw in private-mode / disabled-storage contexts. Treat
    // it as "not seeded" and attempt anyway; we just won't be able to persist
    // the marker, so it'll retry next launch (harmless thanks to the idv2 skip).
  }
  if (marker !== null) return;

  const total = DEFAULT_MAP_FOLDERS.reduce((n, f) => n + f.osuFiles.length, 0);
  let processed = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  // Announce the work up front (completed=0) so the overlay can appear and lock
  // input before the first — potentially slow — network fetch begins.
  onProgress?.({ completed: 0, total, title: null });

  for (const { folder, osuFiles } of DEFAULT_MAP_FOLDERS) {
    // Difficulties in a folder share their audio (and usually their background)
    // file. Dedupe by filename so each underlying asset is fetched + stored
    // once and referenced by every difficulty that uses it.
    const fileIdByName = new Map<string, number>();

    for (const osuFile of osuFiles) {
      let title: string | null = null;
      try {
        const osuText = await fetchPublicText(folder, osuFile);
        // Identity resolver: leaves audioUrl/backgroundUrl as the raw relative
        // filenames declared in the .osu, which we resolve against /public.
        const parsed = convertFromOsu(osuText, (p) => p);
        title = parsed.title;

        // Don't clobber a map the user already has (e.g. a default they later
        // re-downloaded). The downloader overwrites by idv2; we simply defer.
        const existing = await latestDb.beatmaps.where("idv2").equals(parsed.id).first();
        if (existing) {
          skipped++;
          continue;
        }

        const backgroundId = await ensureFile(folder, parsed.backgroundUrl, fileIdByName);
        const audioId = await ensureFile(folder, parsed.audioUrl, fileIdByName);

        await latestDb.beatmaps.add({
          idv2: parsed.id,
          title: parsed.title,
          artist: parsed.artist,
          creator: parsed.creator,
          difficulty: parsed.difficulty,
          content: new Blob([osuText]),
          gameplayBackgroundId: backgroundId,
          // No separate cover art for built-in maps — reuse the gameplay
          // background as the selection-list background.
          listBackgroundId: backgroundId,
          audioId,
          createdAt: new Date(),
        });
        imported++;
      } catch (e) {
        failed++;
        console.error(`Failed to seed default map ${folder}/${osuFile}`, e);
      } finally {
        processed++;
        onProgress?.({ completed: processed, total, title });
      }
    }
  }

  // Only persist the marker if seeding wasn't a total wash. A full failure with
  // nothing imported and nothing pre-existing is almost always transient (e.g.
  // offline at boot), so we leave the marker unset to retry next launch.
  if (imported > 0 || skipped > 0 || failed === 0) {
    try {
      window.localStorage.setItem(SEED_MARKER_KEY, "1");
    } catch {
      // See note above — non-fatal; we just retry next launch.
    }
    if (imported > 0) {
      console.log(`Seeded ${imported} default map(s)${skipped ? `, skipped ${skipped} already present` : ""}.`);
    }
  }
}

/**
 * Fetch a media file from /public, store it as a file row (or return the id of
 * an already-stored one with the same name within this folder), and return the
 * file row id.
 */
async function ensureFile(
  folder: string,
  fileName: string,
  fileIdByName: Map<string, number>,
): Promise<number> {
  const cached = fileIdByName.get(fileName);
  if (cached !== undefined) return cached;

  const blob = await fetchPublicBlob(folder, fileName);
  const id = await latestDb.files.add({
    content: blob,
    extension: fileName.split(".").pop() ?? "",
    createdAt: new Date(),
  });
  fileIdByName.set(fileName, id);
  return id;
}

/** Build a same-origin /public URL, encoding each path segment (filenames may contain spaces or parentheses). */
function publicUrl(folder: string, fileName: string): string {
  const segments = [folder, ...fileName.split("/")].map(encodeURIComponent);
  return `/${segments.join("/")}`;
}

async function fetchPublicText(folder: string, fileName: string): Promise<string> {
  const res = await fetch(publicUrl(folder, fileName));
  if (!res.ok) throw new Error(`GET ${publicUrl(folder, fileName)} -> ${res.status}`);
  return res.text();
}

async function fetchPublicBlob(folder: string, fileName: string): Promise<Blob> {
  const res = await fetch(publicUrl(folder, fileName));
  if (!res.ok) throw new Error(`GET ${publicUrl(folder, fileName)} -> ${res.status}`);
  return res.blob();
}
