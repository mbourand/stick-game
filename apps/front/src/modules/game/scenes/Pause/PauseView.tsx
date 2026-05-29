"use client";

import { motion } from "motion/react";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import type { SceneUIComponent } from "../Scene";
import { PAUSE_ACTIONS, type PauseScene } from "./PauseScene";

export const PauseView: SceneUIComponent<PauseScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion();
  const titleMotion = useScenePresenceMotion({ y: -12 });
  const hintMotion = useScenePresenceMotion({ y: 12 });
  const focused = useStore(scene.focused);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <motion.div
        className="text-7xl tracking-[0.4em] uppercase text-white mb-14 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
        {...titleMotion}
      >
        Paused
      </motion.div>

      <div className="flex flex-col gap-3 w-[380px]">
        {PAUSE_ACTIONS.map((btn, i) => (
          <PauseButton
            key={btn.id}
            label={btn.label}
            isFocused={focused === btn.id}
            delay={i * 0.05}
            onFocus={() => scene.focused.set(btn.id)}
            onClick={() => scene.activate(btn.id)}
          />
        ))}
      </div>

      <motion.div
        className="mt-14 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase"
        {...hintMotion}
      >
        <span>
          <KeyHint label="A" /> Confirm
        </span>
        <span className="text-white/20">|</span>
        <span>
          <KeyHint label="B" /> Resume
        </span>
      </motion.div>
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
  const buttonMotion = useScenePresenceMotion({ y: 16, delay });
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

const KeyHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 mr-2 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70 align-middle"
    aria-hidden
  >
    {label}
  </span>
);
