"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { MapPicker } from "@/app/game/_components/MapPicker";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { SceneUIComponent } from "../Scene";
import { useScenePhase } from "../useScene";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";

const PHASE_DURATION_S = 0.32;

export const BeatmapSelectionView: SceneUIComponent = ({ scene }) => {
  const selectionScene = scene as BeatmapSelectionScene;
  const phase = useScenePhase(scene);
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  const isVisible = phase === "active" || phase === "entering";

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.92 }}
      transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
    >
      <MapPicker onMapPicked={setSelectedMap} />
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => {
          if (selectedMap) selectionScene.playMap(selectedMap);
        }}
      >
        Play
      </button>
      {selectedMap?.id && (
        <MapLeaderboard
          className="absolute left-0 top-1/2 -translate-y-1/2"
          beatmapId={selectedMap.id}
        />
      )}
    </motion.div>
  );
};
