import { AnimatePresence, motion } from "motion/react";

const EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

export type BootProgressOverlayProps = {
  /** When false the overlay animates out (and stays hidden). */
  visible: boolean;
  /** Switches to the "finished" look: full bar, no travelling shimmer. */
  done: boolean;
  /** Tiny tracking-wide kicker above the heading. */
  eyebrow: string;
  /** Big heading. */
  title: string;
  /** Bottom-left status word (e.g. "Importing" / "Complete"). */
  status: string;
  completed: number;
  total: number;
  /** Optional cycling line under the bar (e.g. the item being processed). */
  detail?: string | null;
  /** Stable AnimatePresence key so multiple overlays never collide. */
  motionKey: string;
};

/**
 * Full-screen, blocking progress overlay used by the boot-time tasks that must
 * finish before the player touches their library (first-run default-map import,
 * one-time DB migrations). Purely presentational — callers own the lifecycle,
 * input locking, and copy; this just renders the bar.
 */
export const BootProgressOverlay = ({
  visible,
  done,
  eyebrow,
  title,
  status,
  completed,
  total,
  detail,
  motionKey,
}: BootProgressOverlayProps) => {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={motionKey}
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
            <span className="text-[10px] tracking-[0.45em] uppercase text-white/35">{eyebrow}</span>
            <h2 className="mt-3 text-2xl tracking-[0.3em] uppercase text-center">{title}</h2>

            {/* Progress track + fill, with a travelling shimmer while working. */}
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
              <span>{status}</span>
              <span>
                {completed} / {total}
              </span>
            </div>

            {/* Fixed-height line so the layout doesn't jump as the detail cycles. */}
            <div className="mt-5 h-4 w-full overflow-hidden text-center text-[11px] tracking-[0.2em] uppercase text-white/40 truncate">
              {!done && detail}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
