import { useEffect } from "react";
import { seedDefaultMaps } from "@/modules/db/seedDefaultMaps";
import type { Engine } from "../engine/Engine";
import { Store } from "../engine/state/Store";
import { useStore } from "../engine/state/useStore";
import { BootProgressOverlay } from "./BootProgressOverlay";

/** How long the full "Ready" bar lingers before the overlay dismisses. */
const DONE_HOLD_MS = 900;

type ImportState =
  | { phase: "idle" }
  | { phase: "importing"; completed: number; total: number; title: string | null }
  | { phase: "done"; total: number };

/**
 * Shared, module-level state so the overlay survives React StrictMode's
 * mount→unmount→mount dance without dropping progress: the seeding pass writes
 * here once, and whichever component instance is mounted reads the latest.
 */
const importStore = new Store<ImportState>({ phase: "idle" });

/** Guards the one-shot kickoff against StrictMode / remount double-invocation. */
let started = false;

/**
 * Kick off the one-time default-map import, mirroring its progress into
 * `importStore` and toggling input lock around it. Locks only once the seeder
 * confirms there's work to do (first progress tick), so a no-op run (already
 * seeded) never flashes the overlay or freezes input.
 */
function startFirstRunImport(setInputLocked: (locked: boolean) => void): void {
  if (started) return;
  started = true;

  let locked = false;
  let lastTotal = 0;

  void seedDefaultMaps((progress) => {
    lastTotal = progress.total;
    if (!locked) {
      locked = true;
      setInputLocked(true);
    }
    importStore.set({
      phase: "importing",
      completed: progress.completed,
      total: progress.total,
      title: progress.title,
    });
  }).finally(() => {
    // No work happened (already seeded) — we never locked or showed anything.
    if (!locked) return;
    importStore.set({ phase: "done", total: lastTotal });
    window.setTimeout(() => {
      importStore.set({ phase: "idle" });
      setInputLocked(false);
    }, DONE_HOLD_MS);
  });
}

/**
 * Full-screen, blocking overlay shown once on a player's first launch while the
 * built-in default maps are imported into IndexedDB. Input is locked for its
 * whole lifetime (see {@link startFirstRunImport}); on every later launch the
 * seeder short-circuits and this renders nothing.
 */
export const FirstRunImportOverlay = ({ engine }: { engine: Engine }) => {
  const state = useStore(importStore);

  useEffect(() => {
    startFirstRunImport((locked) => engine.inputSystem.setLocked(locked));
  }, [engine]);

  const done = state.phase === "done";
  const total = state.phase === "importing" || state.phase === "done" ? state.total : 0;
  const completed = state.phase === "importing" ? state.completed : done ? state.total : 0;
  const title = state.phase === "importing" ? state.title : null;

  return (
    <BootProgressOverlay
      motionKey="first-run-import"
      visible={state.phase !== "idle"}
      done={done}
      eyebrow="First-time setup"
      title={done ? "Ready to play" : "Preparing your maps"}
      status={done ? "Complete" : "Importing"}
      completed={completed}
      total={total}
      detail={title}
    />
  );
};
