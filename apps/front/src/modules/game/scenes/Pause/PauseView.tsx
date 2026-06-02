import { motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { HintBar } from "../shared/KeyHint";
import type { SceneUIComponent } from "../Scene";
import type { PauseScene } from "./PauseScene";

export const PauseView: SceneUIComponent<PauseScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const titleMotion = useScenePresenceMotion(fade({ y: -12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const focused = useStore(scene.focused);
  const { scale } = useViewport();

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="text-7xl tracking-[0.4em] uppercase text-white mb-14 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
          {...titleMotion}
        >
          Paused
        </motion.div>

        <div className="flex flex-col gap-3 w-[380px]">
          {scene.entries.map((entry, i) => (
            <PauseButton
              key={entry.id}
              label={entry.label}
              isFocused={focused === i}
              delay={i * 0.05}
              onFocus={() => scene.focused.set(i)}
              onClick={entry.run}
            />
          ))}
        </div>

        <motion.div
          className="mt-14 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase"
          {...hintMotion}
        >
          <HintBar
            items={[
              { key: "A", label: "Confirm" },
              { key: "B", label: "Resume" },
            ]}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

const PauseButton = ({
  label,
  isFocused,
  delay,
  onFocus,
  onClick,
}: {
  label: string;
  isFocused: boolean;
  delay: number;
  onFocus: () => void;
  onClick: () => void;
}) => {
  const buttonMotion = useScenePresenceMotion({ ...fade({ y: 16 }), enterDelay: delay });
  return (
    <motion.button
      type="button"
      className={`
        relative h-14 rounded-full border pointer-events-auto
        text-white text-sm tracking-[0.35em] uppercase font-semibold
        transition-colors duration-150
        ${
          isFocused
            ? "bg-white/25 border-white/80 shadow-[0_0_28px_rgba(255,255,255,0.18)]"
            : "bg-white/5 border-white/30 hover:bg-white/15 hover:border-white/50"
        }
      `}
      {...buttonMotion}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={onClick}
    >
      {isFocused && (
        <motion.span
          layoutId="pause-focus-dot"
          className="absolute left-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          aria-hidden
        />
      )}
      {label}
    </motion.button>
  );
};

