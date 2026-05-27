"use client";

import { motion } from "motion/react";
import { useSyncExternalStore } from "react";
import type { SceneUIComponent } from "../Scene";

const FADE_DURATION_SECONDS = 0.3;

export const PauseView: SceneUIComponent = ({ scene }) => {
  const isExiting = useSyncExternalStore(scene.subscribeExit, scene.isExiting, scene.isExiting);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black/50 select-none"
      style={{ fontFamily: "Rostex" }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: FADE_DURATION_SECONDS }}
      onAnimationComplete={() => {
        if (isExiting) scene.completeExit();
      }}
    >
      <div className="text-center text-white">
        <div className="text-6xl tracking-[0.3em] uppercase">Paused</div>
        <div className="mt-6 text-sm text-white/60 tracking-[0.25em] uppercase">Press Start to resume</div>
      </div>
    </motion.div>
  );
};
