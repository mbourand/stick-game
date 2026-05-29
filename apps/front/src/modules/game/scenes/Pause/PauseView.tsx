"use client";

import { motion } from "motion/react";
import { useScenePresenceMotion } from "../../engine/animation/scenePresence";
import type { SceneUIComponent } from "../Scene";
import type { PauseScene } from "./PauseScene";

export const PauseView: SceneUIComponent<PauseScene> = ({ scene: _scene }) => {
  const presenceMotion = useScenePresenceMotion();

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black/50 select-none"
      style={{ fontFamily: "Rostex" }}
      {...presenceMotion}
    >
      <div className="text-center text-white">
        <div className="text-6xl tracking-[0.3em] uppercase">Paused</div>
        <div className="mt-6 text-sm text-white/60 tracking-[0.25em] uppercase">Press Start to resume</div>
      </div>
    </motion.div>
  );
};
