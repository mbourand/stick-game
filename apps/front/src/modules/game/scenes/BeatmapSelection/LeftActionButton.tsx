"use client";

import { motion } from "motion/react";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  computeLeftRadialLayout,
  LEFT_BUTTON_RETRACT_X,
  PHASE_DURATION_S,
} from "./layout";

type LeftActionButtonProps = {
  yCenter: number;
  label: string;
  isFocused: boolean;
  isVisible: boolean;
  onFocus: () => void;
  onClick: () => void;
};

export const LeftActionButton = ({
  yCenter,
  label,
  isFocused,
  isVisible,
  onFocus,
  onClick,
}: LeftActionButtonProps) => {
  const { top, left, outerWidth, mask, paddingRight } = computeLeftRadialLayout(
    yCenter,
    CIRCLE_RADIUS_PX,
  );
  return (
    <div
      className="absolute"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${outerWidth}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
      }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white text-right rounded-l-full flex items-center justify-end uppercase tracking-[0.25em] text-sm font-semibold transition-colors ${
          isFocused ? "bg-white/25" : "bg-white/10"
        }`}
        style={{
          left: 0,
          top: 0,
          width: `${BUTTON_WIDTH_PX}px`,
          height: `${BUTTON_HEIGHT_PX}px`,
          paddingLeft: "32px",
          paddingRight: `${paddingRight}px`,
          border: "2px solid rgba(255,255,255,0.5)",
        }}
        initial={false}
        animate={{
          x: isVisible ? 0 : LEFT_BUTTON_RETRACT_X,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={onFocus}
        onFocus={onFocus}
        onClick={onClick}
      >
        {label}
      </motion.button>
    </div>
  );
};
