"use client";

import { useTransform, type MotionValue } from "motion/react";
import { RadialButton } from "../shared/RadialButton";
import { computeRadialButtonLayout } from "../shared/radialButtonLayout";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_STAGGER_S,
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  OUTER_LEFT_EXTRA_PX,
  VERTICAL_PITCH_PX,
} from "./layout";

type BeatmapRadialButtonProps = {
  index: number;
  scrollOffset: MotionValue<number>;
  staggerSlot: number;
  title: string;
  artist: string;
  creator: string;
  difficulty: number;
  isFocused: boolean;
  onFocus: () => void;
  onClick: () => void;
};

const OUTER_WIDTH = BUTTON_WIDTH_PX + OUTER_LEFT_EXTRA_PX;

export const BeatmapRadialButton = ({
  index,
  scrollOffset,
  staggerSlot,
  title,
  artist,
  creator,
  difficulty,
  isFocused,
  onFocus,
  onClick,
}: BeatmapRadialButtonProps) => {
  // Position + near-edge padding are pure functions of the scroll position
  // for this index. The screen-anchored radial mask lives on the list
  // container, so no per-button mask is needed here.
  const layout = useTransform(scrollOffset, (offset) => {
    const yCenter = (index - offset) * VERTICAL_PITCH_PX;
    return computeRadialButtonLayout({
      side: "right",
      yCenter,
      radius: CIRCLE_RADIUS_PX,
      buttonW: BUTTON_WIDTH_PX,
      buttonH: BUTTON_HEIGHT_PX,
      outerExtraPx: OUTER_LEFT_EXTRA_PX,
    });
  });
  const top = useTransform(layout, (l) => l.top);
  const left = useTransform(layout, (l) => l.left);
  const paddingNear = useTransform(layout, (l) => l.paddingNear);

  return (
    <RadialButton
      side="right"
      top={top}
      left={left}
      outerWidth={OUTER_WIDTH}
      buttonWidth={BUTTON_WIDTH_PX}
      buttonHeight={BUTTON_HEIGHT_PX}
      paddingNear={paddingNear}
      isFocused={isFocused}
      delay={Math.max(0, staggerSlot) * BUTTON_STAGGER_S}
      onFocus={onFocus}
      onClick={onClick}
      innerClassName="gap-4 justify-between"
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
    </RadialButton>
  );
};
