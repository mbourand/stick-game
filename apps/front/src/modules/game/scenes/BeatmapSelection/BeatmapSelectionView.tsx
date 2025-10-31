import { useState } from "react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { MapPicker } from "@/app/game/_components/MapPicker";

type BeatmapSelectionViewProps = {
  onPlayClicked: (selectedMap: ParsedMap) => void;
};

export const BeatmapSelectionView = ({ onPlayClicked }: BeatmapSelectionViewProps) => {
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  return (
    <>
      <MapPicker onMapPicked={setSelectedMap} />
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => {
          if (selectedMap) {
            onPlayClicked(selectedMap);
          }
        }}
      >
        Play
      </button>
    </>
  );
};
