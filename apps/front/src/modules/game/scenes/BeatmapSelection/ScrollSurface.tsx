"use client";

import { motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { GAME_CIRCLE_STROKE_WIDTH } from "../../utils/constants";

/** Invisible click target around the chevron — comfortably larger than the glyph. */
const HIT_WIDTH_PX = 96;
const HIT_HEIGHT_PX = 48;

/** Breathing room between the chevron and the ring's outer (painted) edge. */
const RING_GAP_PX = 12;

/**
 * How far past the circle's bounding box to push the control. The box edge sits
 * on the ring path; the stroke is painted straddling it, so the outermost
 * painted pixel is half a stroke-width beyond the box. Clearing that plus a gap
 * — plus the hit area, which extends *away* from the ring (items-end / -start)
 * — keeps the chevron and its whole hit target outside the ring, never
 * overlapping the stroke the way the old straddling pill did.
 */
const OUTSET_PX = GAME_CIRCLE_STROKE_WIDTH / 2 + RING_GAP_PX + HIT_HEIGHT_PX;

type ScrollSurfaceProps = {
  position: "top" | "bottom";
  active: boolean;
  onPress: () => void;
};

/**
 * A bare chevron floating just outside the ring at 12/6 o'clock that scrolls the
 * beatmap list. No box or border — only the arrow, softly glowing: brighter and
 * larger while the matching stick scroll-zone (`active`) is engaged, and a touch
 * larger on hover/press for mouse users.
 */
export const ScrollSurface = ({ position, active, onPress }: ScrollSurfaceProps) => {
  const isTop = position === "top";
  const presenceMotion = useScenePresenceMotion(fade({ y: isTop ? -10 : 10 }));

  return (
    <motion.button
      type="button"
      aria-label={isTop ? "Scroll up" : "Scroll down"}
      onClick={onPress}
      className={`absolute pointer-events-auto flex justify-center ${
        isTop ? "items-end" : "items-start"
      }`}
      style={{
        width: HIT_WIDTH_PX,
        height: HIT_HEIGHT_PX,
        // Centre horizontally with a margin, not a CSS transform, so Motion owns
        // `transform` (presence slide + hover scale) without fighting translateX.
        left: "50%",
        marginLeft: -HIT_WIDTH_PX / 2,
        [isTop ? "top" : "bottom"]: -OUTSET_PX,
        // Grow away from the ring on hover so the chevron keeps its gap.
        transformOrigin: isTop ? "center bottom" : "center top",
      }}
      {...presenceMotion}
      whileHover={{ scale: 1.18 }}
      whileTap={{ scale: 0.9 }}
    >
      <span
        className={`transition duration-200 ${
          active
            ? "opacity-100 scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.75)]"
            : "opacity-55 scale-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
        }`}
      >
        <svg width="30" height="16" viewBox="0 0 30 16" fill="none" aria-hidden>
          <path
            d={isTop ? "M3 12L15 4l12 8" : "M3 4l12 8 12-8"}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </motion.button>
  );
};
