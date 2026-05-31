import { useMemo, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { getVisibleIndexRange } from "./layout";

export type VisibleBeatmap = {
  index: number;
  beatmap: V3BeatmapEntity;
  /** Position within the current visible window — feeds the entrance stagger. */
  staggerSlot: number;
};

/**
 * Virtualises the beatmap list around the current scroll position. The
 * window only changes when the integer scroll bucket changes; continuous
 * motion in between is driven by per-button useTransform on the same
 * MotionValue, so scrolling doesn't trigger React renders.
 */
export function useVisibleBeatmaps(
  scrollOffset: MotionValue<number>,
  filteredBeatmaps: V3BeatmapEntity[],
): VisibleBeatmap[] {
  const [windowBucket, setWindowBucket] = useState(() => Math.floor(scrollOffset.get()));
  useMotionValueEvent(scrollOffset, "change", (latest) => {
    const bucket = Math.floor(latest);
    setWindowBucket((prev) => (prev === bucket ? prev : bucket));
  });

  return useMemo(() => {
    const { firstIndex, lastIndex } = getVisibleIndexRange(windowBucket, filteredBeatmaps.length);
    const out: VisibleBeatmap[] = [];
    for (let i = firstIndex; i <= lastIndex; i++) {
      const beatmap = filteredBeatmaps[i];
      if (beatmap) out.push({ index: i, beatmap, staggerSlot: i - firstIndex });
    }
    return out;
  }, [windowBucket, filteredBeatmaps]);
}
