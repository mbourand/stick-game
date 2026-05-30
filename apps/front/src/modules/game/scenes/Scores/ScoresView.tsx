"use client";

import { motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import type { SceneUIComponent } from "../Scene";
import type { ScoresScene } from "./ScoresScene";

export const ScoresView: SceneUIComponent<ScoresScene> = ({ scene }) => {
  const sc = scene.scoreCounter;
  const presenceMotion = useScenePresenceMotion(fade({ y: -40 }));

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center text-white select-none"
      style={{ fontFamily: "Rostex" }}
      {...presenceMotion}
    >
      <div className="text-6xl tracking-[0.3em] uppercase">Score</div>
      <div className="text-7xl mt-6 tabular-nums">
        {sc.getScore().toString().padStart(6, "0")}
      </div>
      <div className="text-3xl mt-2 text-white/70">{sc.getAccuracy()}%</div>
      <div className="text-sm mt-8 text-white/60 tracking-[0.25em] uppercase">
        Confirm to retry · Back to select
      </div>
    </motion.div>
  );
};
