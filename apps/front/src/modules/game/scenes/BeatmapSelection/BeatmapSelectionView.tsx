"use client";

import { useState } from "react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { MapPicker } from "@/app/game/_components/MapPicker";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { SceneUIComponent } from "../Scene";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";

export const BeatmapSelectionView: SceneUIComponent = ({ scene }) => {
  const selectionScene = scene as BeatmapSelectionScene;
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  return (
    <>
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
        <MapLeaderboard className="absolute left-0 top-1/2 -translate-y-1/2" beatmapId={selectedMap.id} />
      )}
    </>
  );
};
