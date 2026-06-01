import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Engine } from "../engine/Engine";

/** How long the toast stays on screen before fading out. */
const VISIBLE_MS = 3000;

type ToastState = { id: number; text: string };

/**
 * Transient notice shown when the active gamepad changes — claimed on connect,
 * swapped via settings, or cleared on disconnect. Makes auto-detection visible
 * so the player knows their controller is recognised without opening settings.
 */
export const GamepadToast = ({ engine }: { engine: Engine }) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let seq = 0;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const off = engine.gamepad.events.on("onActiveGamepadChanged", (info) => {
      setToast({
        id: ++seq,
        text: info ? `${prettyPadName(info.id)} connected` : "Controller disconnected",
      });
      if (hideTimer !== null) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setToast(null), VISIBLE_MS);
    });

    return () => {
      off();
      if (hideTimer !== null) clearTimeout(hideTimer);
    };
  }, [engine]);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 rounded-md border border-white/15 bg-black/80 px-4 py-2.5 text-white backdrop-blur-md select-none"
            style={{ fontFamily: "Rostex" }}
          >
            <span aria-hidden>🎮</span>
            <span className="text-[12px] tracking-[0.3em] uppercase text-white/85">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Gamepad ids are verbose, e.g. "Xbox Wireless Controller (STANDARD GAMEPAD
 * Vendor: 045e Product: 0b13)". Drop the trailing parenthetical so the toast
 * reads cleanly; fall back to the raw id (or a generic label) if empty.
 */
function prettyPadName(id: string): string {
  const trimmed = id.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return trimmed || id.trim() || "Controller";
}
