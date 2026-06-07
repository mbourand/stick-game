import { useEffect, useState } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";

/**
 * Playable length (ms) of the focused beatmap, parsed from its stored `.osu`
 * blob. Length isn't a stored column, so we derive it the same way gameplay
 * does — the last note's end — to keep the menu badge and the in-game progress
 * arc in agreement. Returns null while parsing (or on a malformed blob).
 *
 * Only the focused map is ever read, and the cached value is tagged with the
 * map it came from, so when focus moves we report null until the new map's
 * blob has parsed — no stale length ever shows.
 */
export function usePreviewDuration(beatmap: V3BeatmapEntity | null): number | null {
  const [result, setResult] = useState<{ beatmap: V3BeatmapEntity; durationMs: number | null } | null>(null);

  useEffect(() => {
    if (!beatmap) return;
    let cancelled = false;
    void beatmap.content.text().then((text) => {
      if (cancelled) return;
      let durationMs: number | null;
      try {
        durationMs = convertFromOsu(text, (p) => p).durationMs;
      } catch {
        durationMs = null;
      }
      setResult({ beatmap, durationMs });
    });
    return () => {
      cancelled = true;
    };
  }, [beatmap]);

  return result && result.beatmap === beatmap ? result.durationMs : null;
}
