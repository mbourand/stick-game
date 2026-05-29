"use client";

import { useState } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";

/**
 * Sticky-last-non-null wrapper around the focused beatmap: while a search
 * filter wipes the list, focusedBeatmap goes null but we keep showing the
 * previous preview (audio, background, info card, leaderboard) so the user's
 * mid-typing context isn't torn down.
 */
export function usePreviewBeatmap(
  focusedBeatmap: V3BeatmapEntity | null,
): V3BeatmapEntity | null {
  const [preview, setPreview] = useState<V3BeatmapEntity | null>(null);
  if (focusedBeatmap !== null && focusedBeatmap !== preview) {
    setPreview(focusedBeatmap);
  }
  return preview;
}
