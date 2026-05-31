"use client";

import { motion } from "motion/react";
import { fade } from "../../../engine/animation/poses";
import { useScenePresenceMotion } from "../../../engine/animation/useScenePresenceMotion";
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
        {parsedMap.artist} · {parsedMap.difficulty.toFixed(2)}★
      </div>
    </motion.div>
  );
};
