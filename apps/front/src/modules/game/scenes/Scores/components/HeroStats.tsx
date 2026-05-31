"use client";

import { motion } from "motion/react";
import { fade } from "../../../engine/animation/poses";
import { useScenePresenceMotion } from "../../../engine/animation/useScenePresenceMotion";
import { computeGrade, GRADE_COLOR } from "../grade";

type HeroStatsProps = {
  score: number;
  accuracy: number;
  missCount: number;
};

/**
 * Pinned top of the results circle: grade letter, final score, accuracy.
 * Stays put while the tab bar swaps the body beneath it.
 */
export const HeroStats = ({ score, accuracy, missCount }: HeroStatsProps) => {
  const gradeMotion = useScenePresenceMotion({ ...fade({ y: -16 }), enterDelay: 0.05 });
  const scoreMotion = useScenePresenceMotion({ ...fade({ y: -10 }), enterDelay: 0.1 });
  const accuracyMotion = useScenePresenceMotion({ ...fade({ y: -10 }), enterDelay: 0.15 });

  const grade = computeGrade(accuracy, missCount);
  const gradeColor = GRADE_COLOR[grade];

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="text-[88px] leading-none font-bold"
        style={{ color: gradeColor, textShadow: `0 0 32px ${gradeColor}55` }}
        {...gradeMotion}
      >
        {grade}
      </motion.div>
      <motion.div className="text-6xl mt-3 tabular-nums tracking-wider" {...scoreMotion}>
        {score.toString().padStart(6, "0")}
      </motion.div>
      <motion.div className="text-2xl mt-1 text-white/70 tabular-nums" {...accuracyMotion}>
        {accuracy.toFixed(2)}%
      </motion.div>
    </div>
  );
};
