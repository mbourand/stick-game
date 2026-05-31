import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { seedDefaultMaps } from "@/modules/db/seedDefaultMaps";
import type { Engine } from "../engine/Engine";
import { Store } from "../engine/state/Store";
import { useStore } from "../engine/state/useStore";

const EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];
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
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const title = state.phase === "importing" ? state.title : null;

  return (
    <AnimatePresence>
      {state.phase !== "idle" && (
        <motion.div
          key="first-run-import"
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto select-none"
          style={{ fontFamily: "Rostex" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <motion.div
            className="flex flex-col items-center w-[460px] max-w-[80vw] text-white"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="text-[10px] tracking-[0.45em] uppercase text-white/35">First-time setup</span>
            <h2 className="mt-3 text-2xl tracking-[0.3em] uppercase text-center">
              {done ? "Ready to play" : "Preparing your maps"}
            </h2>

            {/* Progress track + fill, with a travelling shimmer while importing. */}
            <div className="relative mt-8 w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ boxShadow: "0 0 12px rgba(255,255,255,0.55)" }}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: EASE }}
              />
              {!done && (
                <motion.div
                  className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-120%", "520%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>

            <div className="mt-3 w-full flex items-center justify-between text-[10px] tracking-[0.25em] uppercase text-white/45 tabular-nums">
              <span>{done ? "Complete" : "Importing"}</span>
              <span>
                {completed} / {total}
              </span>
            </div>

            {/* Fixed-height line so the layout doesn't jump as titles cycle. */}
            <div className="mt-5 h-4 w-full overflow-hidden text-center text-[11px] tracking-[0.2em] uppercase text-white/40 truncate">
              {!done && title}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
