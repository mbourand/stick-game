"use client";

import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import { RadialButton as SharedRadialButton } from "../shared/RadialButton";
import { computeRadialButtonLayout } from "../shared/radialButtonLayout";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_STAGGER_S,
  BUTTON_WIDTH_PX,
  OUTER_LEFT_EXTRA_PX,
} from "./layout";

type RadialButtonProps = {
  index: number;
  label: string;
  /** Vertical offset from the menu container's top — caller-relative, NOT circle-relative. */
  yCenter: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
};

export const RadialButton = ({
  index,
  label,
  yCenter,
  isFocused,
  onFocus,
  onBlur,
  onClick,
}: RadialButtonProps) => {
  const r = GAME_CIRCLE_DISPLAYED_RADIUS;
  const layout = computeRadialButtonLayout({
    side: "right",
    yCenter: yCenter - r,
    radius: r,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
    minNearPaddingPx: 24,
  });

  return (
    <SharedRadialButton
      side="right"
      top={layout.top}
      left={layout.left}
      outerWidth={layout.outerWidth}
      buttonWidth={BUTTON_WIDTH_PX}
      buttonHeight={BUTTON_HEIGHT_PX}
      paddingNear={layout.paddingNear}
      paddingFar={44}
      mask={layout.mask}
      isFocused={isFocused}
      delay={index * BUTTON_STAGGER_S}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      innerClassName="text-xl font-bold uppercase tracking-[0.3em] justify-between"
    >
      <span>{label}</span>
      <span className="w-7 h-7 rounded-full border border-white/40" aria-hidden />
    </SharedRadialButton>
  );
};
