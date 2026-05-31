"use client";

import { motion } from "motion/react";
import { fade } from "../../../engine/animation/poses";
import { useScenePresenceMotion } from "../../../engine/animation/useScenePresenceMotion";
import { difficultyColor } from "../../shared/difficultyColor";
import type { ParsedMap } from "../../../../osu/convert/OsuConverter";

/** Slim song line above the hero: title, artist, and difficulty rating. */
export const ResultHeader = ({ parsedMap }: { parsedMap: ParsedMap }) => {
  const motionProps = useScenePresenceMotion(fade({ y: -14 }));

  return (
    <motion.div className="flex flex-col items-center gap-0.5 mb-2 text-center" {...motionProps}>
      <div className="text-sm tracking-[0.25em] uppercase text-white/85 max-w-[440px] truncate">
        {parsedMap.title}
      </div>
      <div className="text-[11px] tracking-[0.25em] uppercase text-white/40">
        {parsedMap.artist}
        <span className="text-white/25"> · </span>
        <span className="font-semibold" style={{ color: difficultyColor(parsedMap.difficulty) }}>
          {parsedMap.difficulty.toFixed(2)}★
        </span>
      </div>
    </motion.div>
  );
};
