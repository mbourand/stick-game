"use client";

import { motion } from "motion/react";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import { computeRadialButtonLayout } from "../shared/radialButton";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_RETRACT_X,
  BUTTON_STAGGER_S,
  BUTTON_WIDTH_PX,
  OUTER_LEFT_EXTRA_PX,
  PHASE_DURATION_S,
} from "./layout";

type RadialButtonProps = {
  index: number;
  label: string;
  yCenter: number;
  isFocused: boolean;
  isVisible: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
};

export const RadialButton = ({
  index,
  label,
  yCenter,
  isFocused,
  isVisible,
  onFocus,
  onBlur,
  onClick,
}: RadialButtonProps) => {
  const r = GAME_CIRCLE_DISPLAYED_RADIUS;

  // Caller passes parent-relative yCenter; helper expects circle-centre-relative.
  const { top, left, outerWidth, mask, paddingNear: paddingLeft } = computeRadialButtonLayout({
    side: "right",
    yCenter: yCenter - r,
    radius: r,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
    minNearPaddingPx: 24,
  });

  return (
    <div
      className="absolute"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${outerWidth}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
      }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white text-xl font-bold uppercase tracking-[0.3em] rounded-r-full flex items-center justify-between transition-colors ${
          isFocused ? "bg-white/25" : "bg-white/10"
        }`}
        style={{
          right: 0,
          top: 0,
          width: `${BUTTON_WIDTH_PX}px`,
          height: `${BUTTON_HEIGHT_PX}px`,
          paddingLeft: `${paddingLeft}px`,
          paddingRight: "44px",
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
          delay: isVisible ? index * BUTTON_STAGGER_S : 0,
        }}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
      >
        <span>{label}</span>
        <span className="w-7 h-7 rounded-full border border-white/40" aria-hidden />
      </motion.button>
    </div>
  );
};
