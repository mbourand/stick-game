"use client";

import { motion } from "motion/react";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_RETRACT_X,
  BUTTON_STAGGER_S,
  BUTTON_WIDTH_PX,
  OUTER_LEFT_EXTRA_PX,
  PHASE_DURATION_S,
} from "./layout";

type BeatmapRadialButtonProps = {
  index: number;
  staggerSlot: number;
  title: string;
  artist: string;
  creator: string;
  difficulty: number;
  isFocused: boolean;
  isVisible: boolean;
  onFocus: () => void;
  onClick: () => void;
};

export const BeatmapRadialButton = ({
  index,
  staggerSlot,
  title,
  artist,
  creator,
  difficulty,
  isFocused,
  isVisible,
  onFocus,
  onClick,
}: BeatmapRadialButtonProps) => {
  return (
    <div
      data-index={index}
      className="absolute"
      style={{
        width: `${BUTTON_WIDTH_PX + OUTER_LEFT_EXTRA_PX}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
      }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white text-left rounded-r-full flex items-center justify-between gap-4 transition-colors ${
          isFocused ? "bg-white/25" : "bg-white/10"
        }`}
        style={{
          right: 0,
          top: 0,
          width: `${BUTTON_WIDTH_PX}px`,
          height: `${BUTTON_HEIGHT_PX}px`,
          paddingRight: "32px",
          border: "2px solid rgba(255,255,255,0.5)",
        }}
        initial={false}
        animate={{
          x: isVisible ? 0 : BUTTON_RETRACT_X,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          duration: PHASE_DURATION_S,
          ease: [0.4, 0, 0.2, 1],
          delay: isVisible ? Math.max(0, staggerSlot) * BUTTON_STAGGER_S : 0,
        }}
        onMouseEnter={onFocus}
        onFocus={onFocus}
        onClick={onClick}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-lg font-semibold tracking-widest uppercase truncate">{title}</span>
          <span className="text-xs text-white/60 tracking-[0.15em] truncate">
            {artist} · mapped by {creator}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold tabular-nums">{difficulty.toFixed(1)}</span>
          <span className="text-xs text-white/60 uppercase tracking-[0.2em]">★</span>
        </div>
      </motion.button>
    </div>
  );
};
