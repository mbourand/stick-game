"use client";

import { motion, type MotionValue } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";

/** Either a fixed value or a MotionValue — both are accepted directly by motion's `style`. */
type Numeric = number | MotionValue<number>;

type RadialButtonProps = {
  side: "left" | "right";
  /**
   * Outer wrapper position in parent-relative pixels. Applied via
   * `transform: translate` so static and per-frame layouts share one code
   * path — motion accepts either a number or a MotionValue here.
   */
  top: Numeric;
  left: Numeric;
  /** Outer wrapper width. Equals `buttonWidth + extra-room-for-retract`. */
  outerWidth: number;
  /** Inner button width (visible region). */
  buttonWidth: number;
  buttonHeight: number;
  /**
   * Padding on the inner button's near (curve-facing) side so visible
   * content stays out of the masked area at rest.
   */
  paddingNear: Numeric;
  /** Padding on the inner button's far side. Default 32. */
  paddingFar?: number;
  /**
   * Optional screen-anchored mask on the outer wrapper. Omit when the parent
   * container already carries a shared mask covering this button.
   */
  mask?: string;

  isFocused: boolean;
  /**
   * Optional accent color (any CSS color). When set, tints the button's border
   * and adds a soft glow on focus — used to carry a beatmap's difficulty color.
   * Omit for the default white styling.
   */
  accentColor?: string;
  /** Enter-only delay (seconds) — for stagger. The exit never delays. */
  delay?: number;

  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;

  /**
   * Tailwind classes appended to the inner motion.button. Use for text size,
   * tracking, gap, justify — anything content-shaped that varies per scene.
   */
  innerClassName?: string;
  children: ReactNode;
};

/**
 * Common scaffold for any button that sits tangent to a circle's curve. Each
 * scene wraps this with its content + layout source; the geometry, the
 * presence-driven retract animation, and the side-aware styling all live
 * here once.
 */
export const RadialButton = ({
  side,
  top,
  left,
  outerWidth,
  buttonWidth,
  buttonHeight,
  paddingNear,
  paddingFar = 32,
  mask,
  isFocused,
  accentColor,
  delay,
  onFocus,
  onBlur,
  onClick,
  innerClassName,
  children,
}: RadialButtonProps) => {
  // The inner button retracts towards the curve when the scene is "out"; the
  // extra room lives on the curve side of the outer wrapper, so the sign of
  // the translation follows the side.
  const extraRoom = outerWidth - buttonWidth;
  const retractX = side === "right" ? -extraRoom : extraRoom;
  const presenceMotion = useScenePresenceMotion({ ...fade({ x: retractX }), enterDelay: delay });

  const isRight = side === "right";
  const innerStyle: CSSProperties = isRight
    ? { right: 0, paddingLeft: paddingNear as CSSProperties["paddingLeft"], paddingRight: paddingFar }
    : { left: 0, paddingLeft: paddingFar, paddingRight: paddingNear as CSSProperties["paddingRight"] };

  const maskStyle: CSSProperties =
    mask !== undefined
      ? { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect" }
      : {};

  // Border + glow follow the accent color when provided (difficulty tint),
  // dimmed at rest and brightened on focus; default to plain white otherwise.
  const borderColor = accentColor
    ? isFocused
      ? accentColor
      : `color-mix(in srgb, ${accentColor} 55%, transparent)`
    : "rgba(255,255,255,0.5)";
  const accentGlow =
    accentColor && isFocused ? `0 0 22px color-mix(in srgb, ${accentColor} 38%, transparent)` : undefined;

  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{ x: left, y: top, width: outerWidth, height: buttonHeight, ...maskStyle }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white flex items-center transition-colors ${
          isRight ? "rounded-r-full text-left" : "rounded-l-full text-right"
        } ${isFocused ? "bg-white/25" : "bg-white/10"} ${innerClassName ?? ""}`}
        style={{
          ...innerStyle,
          top: 0,
          width: buttonWidth,
          height: buttonHeight,
          border: `2px solid ${borderColor}`,
          boxShadow: accentGlow,
        }}
        {...presenceMotion}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
      >
        {children}
      </motion.button>
    </motion.div>
  );
};
