"use client";

import { motion } from "motion/react";
import { useScenePresenceMotion } from "../../engine/animation/scenePresence";

type ScrollSurfaceProps = {
  position: "top" | "bottom";
  active: boolean;
  onPress: () => void;
};

export const ScrollSurface = ({ position, active, onPress }: ScrollSurfaceProps) => {
  const isTop = position === "top";
  const presenceMotion = useScenePresenceMotion({ y: isTop ? -12 : 12 });
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
      {...presenceMotion}
      onClick={onPress}
    >
      <span className="text-white/80 text-lg leading-none" aria-hidden>
        {isTop ? "▲" : "▼"}
      </span>
    </motion.button>
  );
};
