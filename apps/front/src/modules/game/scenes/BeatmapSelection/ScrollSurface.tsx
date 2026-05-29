"use client";

import { motion } from "motion/react";
import { PHASE_DURATION_S } from "./layout";

type ScrollSurfaceProps = {
  position: "top" | "bottom";
  active: boolean;
  isVisible: boolean;
  onPress: () => void;
};

export const ScrollSurface = ({ position, active, isVisible, onPress }: ScrollSurfaceProps) => {
  const isTop = position === "top";
  return (
    <motion.button
      type="button"
      aria-label={isTop ? "Scroll up" : "Scroll down"}
      className={`absolute pointer-events-auto left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border transition-colors ${
        active ? "bg-white/25 border-white/70" : "bg-white/5 border-white/20 hover:bg-white/15"
      }`}
      style={{
        width: 96,
        height: 36,
        [isTop ? "top" : "bottom"]: -24,
      }}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : isTop ? -12 : 12,
      }}
      transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
      onClick={onPress}
    >
      <span className="text-white/80 text-lg leading-none" aria-hidden>
        {isTop ? "▲" : "▼"}
      </span>
    </motion.button>
  );
};
