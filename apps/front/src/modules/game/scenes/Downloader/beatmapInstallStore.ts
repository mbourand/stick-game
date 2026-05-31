import { Store } from "../../engine/state/Store";
import { installBeatmapset } from "./installBeatmapset";

/**
 * Per-beatmapset install status. Lives module-level (not in React state) so an
 * install survives the downloader scene unmounting — leaving and reopening the
 * screen, or re-running a search, shows the true in-progress/done state instead
 * of resetting to idle and inviting a duplicate download.
 */
export type InstallStatus =
  | { phase: "idle" }
  | { phase: "downloading"; receivedBytes: number; totalBytes: number | null }
  | { phase: "installing"; completed: number; total: number }
  | { phase: "done" }
  | { phase: "error" };

const IDLE: InstallStatus = { phase: "idle" };

/**
 * One observable cell per beatmapset id, created on first access. Each row
 * subscribes only to its own cell, so a progress tick re-renders just that row.
 */
const storesById = new Map<number, Store<InstallStatus>>();

/** The status cell for a beatmapset, created idle on first access. */
export function getInstallStatusStore(beatmapsetId: number): Store<InstallStatus> {
  let store = storesById.get(beatmapsetId);
  if (!store) {
    store = new Store<InstallStatus>(IDLE);
    storesById.set(beatmapsetId, store);
  }
  return store;
}

/**
 * Start installing a beatmapset, mirroring its progress into the shared status
 * cell. No-ops while an install for the same set is already in flight or has
 * finished this session (re-clicking a downloading or done row does nothing);
 * an errored set can be retried.
 */
export function startBeatmapsetInstall(beatmapsetId: number): void {
  const store = getInstallStatusStore(beatmapsetId);
  const phase = store.get().phase;
  if (phase !== "idle" && phase !== "error") return;

  store.set({ phase: "downloading", receivedBytes: 0, totalBytes: null });
  void installBeatmapset(beatmapsetId, {
    onProgress: (progress) => {
      store.set(
        progress.phase === "downloading"
          ? { phase: "downloading", receivedBytes: progress.receivedBytes, totalBytes: progress.totalBytes }
          : { phase: "installing", completed: progress.completed, total: progress.total },
      );
    },
  })
    .then(() => store.set({ phase: "done" }))
    .catch((e) => {
      console.error("Failed to download beatmapset", e);
      store.set({ phase: "error" });
    });
}
