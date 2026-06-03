import { useEffect, useRef } from "react";
import { migrationProgressStore } from "@/modules/db/migrationProgress";
import type { Engine } from "../engine/Engine";
import { useStore } from "../engine/state/useStore";
import { BootProgressOverlay } from "./BootProgressOverlay";

/** How long the full "Updated" bar lingers before the overlay dismisses. */
const DONE_HOLD_MS = 900;

/**
 * Blocking overlay shown while a one-time DB migration rebuilds stored data
 * (currently: recomputing difficulty ratings under the new algorithm). The
 * migration runs inside Dexie's `.upgrade()` at DB-open time and publishes
 * progress to {@link migrationProgressStore}; this just reflects it, locks
 * input for the duration, and dismisses shortly after it completes.
 *
 * On a fresh DB no upgrade runs, so the store stays idle and this renders
 * nothing — only returning players whose library is being rebuilt see it.
 */
export const MigrationOverlay = ({ engine }: { engine: Engine }) => {
  const state = useStore(migrationProgressStore);

  // Lock input only while *we* are driving a migration, and release only what
  // we locked — so a fresh-DB run (store stays idle) never fights the
  // first-run import overlay over the input lock.
  const lockedByUsRef = useRef(false);
  useEffect(() => {
    if (state.phase === "running" && !lockedByUsRef.current) {
      lockedByUsRef.current = true;
      engine.inputSystem.setLocked(true);
    }
  }, [engine, state.phase]);

  // Hold the finished bar briefly, then dismiss + unlock.
  useEffect(() => {
    if (state.phase !== "done") return;
    const timeout = window.setTimeout(() => {
      migrationProgressStore.set({ phase: "idle" });
      if (lockedByUsRef.current) {
        lockedByUsRef.current = false;
        engine.inputSystem.setLocked(false);
      }
    }, DONE_HOLD_MS);
    return () => window.clearTimeout(timeout);
  }, [engine, state.phase]);

  const done = state.phase === "done";
  const total = state.phase === "running" || state.phase === "done" ? state.total : 0;
  const completed = state.phase === "running" ? state.completed : done ? total : 0;
  const label = state.phase === "running" || state.phase === "done" ? state.label : "";
  const detail = state.phase === "running" ? state.detail : null;

  return (
    <BootProgressOverlay
      motionKey="db-migration"
      visible={state.phase !== "idle"}
      done={done}
      eyebrow="Updating library"
      title={done ? "Library updated" : label}
      status={done ? "Complete" : "Updating"}
      completed={completed}
      total={total}
      detail={detail}
    />
  );
};
